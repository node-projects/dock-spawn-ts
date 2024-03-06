import { IDockContainer } from "./interfaces/IDockContainer.js";
import { EventHandler } from "./EventHandler.js";
import { Utils } from "./Utils.js";
import { IMouseOrTouchEvent } from "./interfaces/IMouseOrTouchEvent.js";

export class SplitterBar {
    previousContainer: IDockContainer;
    nextContainer: IDockContainer;
    stackedVertical: boolean;
    barElement: HTMLDivElement;
    pointerDownHandler: EventHandler;
    minPanelSize: number;
    readyToProcessNextDrag: boolean;
    dockSpawnResizedEvent: CustomEvent<{}>;
    previousMouseEvent: { x: number, y: number };
    pointerMovedHandler: EventHandler;
    pointerUpHandler: EventHandler;

    private iframeEventHandlers: EventHandler[];

    constructor(previousContainer: IDockContainer, nextContainer: IDockContainer, stackedVertical: boolean) {
        // The panel to the left/top side of the bar, depending on the bar orientation
        this.previousContainer = previousContainer;
        // The panel to the right/bottom side of the bar, depending on the bar orientation
        this.nextContainer = nextContainer;
        this.stackedVertical = stackedVertical;
        this.barElement = document.createElement('div');
        this.barElement.classList.add(stackedVertical ? 'splitbar-horizontal' : 'splitbar-vertical');
        this.pointerDownHandler = new EventHandler(this.barElement, 'pointerdown', this.onPointerDown.bind(this));
        this.minPanelSize = 50; // TODO: Get from container configuration
        this.readyToProcessNextDrag = true;
        this.dockSpawnResizedEvent = new CustomEvent("DockSpawnResizedEvent", { composed: true, bubbles: true });
        this.iframeEventHandlers = [];
    }

    onPointerDown(e: PointerEvent) {
        this.barElement.setPointerCapture(e.pointerId);
        this._startDragging(e);
    }

    onPointerUp(e: PointerEvent) {
        this.barElement.releasePointerCapture(e.pointerId);
        this._stopDragging();
    }

    onPointerMovedIframe(e: IMouseOrTouchEvent, iframe: HTMLIFrameElement) {
        if (e.changedTouches != null) {
            e = e.changedTouches[0];
        }
        let posIf = iframe.getBoundingClientRect();
        this.handleMoveEvent({ x: parseInt("" + e.clientX + posIf.x), y: parseInt("" + e.clientY + posIf.y) });
    }

    onPointerMoved(e: IMouseOrTouchEvent) {
        if (e.changedTouches != null) {
            e = e.changedTouches[0];
        }
        this.handleMoveEvent({ x: parseInt("" + e.clientX), y: parseInt("" + e.clientY) });
    }

    handleMoveEvent(pos: { x: number, y: number }) {
        if (!this.readyToProcessNextDrag)
            return;
        this.readyToProcessNextDrag = false;

        let dockManager = this.previousContainer.dockManager;
        dockManager.suspendLayout(this.previousContainer);
        dockManager.suspendLayout(this.nextContainer);
        let dx = pos.x - this.previousMouseEvent.x;
        let dy = pos.y - this.previousMouseEvent.y;
        this._performDrag(dx, dy);
        this.previousMouseEvent = pos;
        this.readyToProcessNextDrag = true;
        dockManager.resumeLayout(this.previousContainer);
        dockManager.resumeLayout(this.nextContainer);
    }

    _performDrag(dx: number, dy: number) {
        let previousWidth = this.previousContainer.containerElement.clientWidth;
        let previousHeight = this.previousContainer.containerElement.clientHeight;
        let nextWidth = this.nextContainer.containerElement.clientWidth;
        let nextHeight = this.nextContainer.containerElement.clientHeight;

        let previousPanelSize = this.stackedVertical ? previousHeight : previousWidth;
        let nextPanelSize = this.stackedVertical ? nextHeight : nextWidth;
        let deltaMovement = this.stackedVertical ? dy : dx;
        let newPreviousPanelSize = previousPanelSize + deltaMovement;
        let newNextPanelSize = nextPanelSize - deltaMovement;

        if (newPreviousPanelSize < this.minPanelSize || newNextPanelSize < this.minPanelSize) {
            // One of the panels is smaller than it should be.
            // In that case, check if the small panel's size is being increased
            let continueProcessing = (newPreviousPanelSize < this.minPanelSize && newPreviousPanelSize > previousPanelSize) ||
                (newNextPanelSize < this.minPanelSize && newNextPanelSize > nextPanelSize);

            if (!continueProcessing)
                return;
        }

        if (this.stackedVertical) {
            this.previousContainer.resize(previousWidth, newPreviousPanelSize);
            this.nextContainer.resize(nextWidth, newNextPanelSize);
        }
        else {
            if (deltaMovement < 0) {
                this.previousContainer.resize(newPreviousPanelSize, previousHeight);
                this.nextContainer.resize(newNextPanelSize, nextHeight);
            } else {
                this.nextContainer.resize(newNextPanelSize, nextHeight);
                this.previousContainer.resize(newPreviousPanelSize, previousHeight);
                this.nextContainer.resize(newNextPanelSize, nextHeight);
            }
        }

        document.dispatchEvent(this.dockSpawnResizedEvent);
    }

    _startDragging(e: IMouseOrTouchEvent) {
        Utils.disableGlobalTextSelection(this.previousContainer.dockManager.config.dialogRootElement);
        if (this.pointerMovedHandler) {
            this.pointerMovedHandler.cancel();
            delete this.pointerMovedHandler;
        }
        if (this.pointerUpHandler) {
            this.pointerUpHandler.cancel();
            delete this.pointerUpHandler;
        }
        this.pointerMovedHandler = new EventHandler(window, 'pointermove', this.onPointerMoved.bind(this));
        this.pointerUpHandler = new EventHandler(window, 'pointerup', this.onPointerUp.bind(this));

        if (this.previousContainer.dockManager.iframes) {
            for (let f of this.previousContainer.dockManager.iframes) {
                let mmi = this.onPointerMovedIframe.bind(this);
                this.iframeEventHandlers.push(new EventHandler(f.contentWindow, 'pointermove', (e) => mmi(e, f)));
                this.iframeEventHandlers.push(new EventHandler(f.contentWindow, 'pointerup', this.onPointerUp.bind(this)));
            }
        }

        this.previousMouseEvent = { x: e.clientX, y: e.clientY };
    }

    _stopDragging() {
        Utils.enableGlobalTextSelection(this.previousContainer.dockManager.config.dialogRootElement);
        if (this.pointerMovedHandler) {
            this.pointerMovedHandler.cancel();
            delete this.pointerMovedHandler;
        }
        if (this.pointerUpHandler) {
            this.pointerUpHandler.cancel();
            delete this.pointerUpHandler;
        }
        for (let e of this.iframeEventHandlers) {
            e.cancel();
        }
        this.iframeEventHandlers = [];
    }
}