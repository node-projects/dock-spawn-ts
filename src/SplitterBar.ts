import { IDockContainer } from "./interfaces/IDockContainer.js";
import { EventHandler } from "./EventHandler.js";
import { Utils } from "./Utils.js";

export class SplitterBar {
    previousContainer: IDockContainer;
    nextContainer: IDockContainer;
    stackedVertical: boolean;
    barElement: HTMLDivElement;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    minPanelSize: number;
    readyToProcessNextDrag: boolean;
    dockSpawnResizedEvent: CustomEvent<{}>;
    previousMouseEvent: any;
    mouseMovedHandler: EventHandler;
    mouseUpHandler: EventHandler;
    touchMovedHandler: EventHandler;
    touchUpHandler: EventHandler;
    
    constructor(previousContainer:IDockContainer, nextContainer:IDockContainer, stackedVertical:boolean) {
        // The panel to the left/top side of the bar, depending on the bar orientation
        this.previousContainer = previousContainer;
        // The panel to the right/bottom side of the bar, depending on the bar orientation
        this.nextContainer = nextContainer;
        this.stackedVertical = stackedVertical;
        this.barElement = document.createElement('div');
        this.barElement.classList.add(stackedVertical ? 'splitbar-horizontal' : 'splitbar-vertical');
        this.mouseDownHandler = new EventHandler(this.barElement, 'mousedown', this.onMouseDown.bind(this));
        this.touchDownHandler = new EventHandler(this.barElement, 'touchstart', this.onMouseDown.bind(this));
        this.minPanelSize = 50; // TODO: Get from container configuration
        this.readyToProcessNextDrag = true;
        this.dockSpawnResizedEvent = new CustomEvent("DockSpawnResizedEvent");
    }

    onMouseDown(e) {
        if (e.touches)
            e = e.touches[0];
        this._startDragging(e);
    }

    onMouseUp(e) {
        this._stopDragging();
    }

    onMouseMoved(e) {
        if (!this.readyToProcessNextDrag)
            return;
        this.readyToProcessNextDrag = false;

        if (e.changedTouches != null) { // TouchMove Event
            e = e.changedTouches[0];
        }

        let dockManager = this.previousContainer.dockManager;
        dockManager.suspendLayout();
        var dx = e.clientX - this.previousMouseEvent.clientX;
        var dy = e.clientY - this.previousMouseEvent.clientY;
        this._performDrag(dx, dy);
        this.previousMouseEvent = e;
        this.readyToProcessNextDrag = true;
        dockManager.resumeLayout(null);
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
            this.previousContainer.resize(newPreviousPanelSize, previousHeight);
            this.nextContainer.resize(newNextPanelSize, nextHeight);
        }

        document.dispatchEvent(this.dockSpawnResizedEvent);
    }

    _startDragging(e : MouseEvent & TouchEvent) {
        Utils.disableGlobalTextSelection();
        if (this.mouseMovedHandler) {
            this.mouseMovedHandler.cancel();
            delete this.mouseMovedHandler;
        }
        if (this.touchMovedHandler) {
            this.touchMovedHandler.cancel();
            delete this.touchMovedHandler;
        }
        if (this.mouseUpHandler) {
            this.mouseUpHandler.cancel();
            delete this.mouseUpHandler;
        }
        if (this.touchUpHandler) {
            this.touchUpHandler.cancel();
            delete this.touchUpHandler;
        }
        this.mouseMovedHandler = new EventHandler(window, 'mousemove', this.onMouseMoved.bind(this));
        this.mouseUpHandler = new EventHandler(window, 'mouseup', this.onMouseUp.bind(this));
        this.touchMovedHandler = new EventHandler(window, 'touchmove', this.onMouseMoved.bind(this));
        this.touchUpHandler = new EventHandler(window, 'touchend', this.onMouseUp.bind(this));
        this.previousMouseEvent = e;
    }

    _stopDragging() {
        Utils.enableGlobalTextSelection();
        document.body.classList.remove('disable-selection');
        if (this.mouseMovedHandler) {
            this.mouseMovedHandler.cancel();
            delete this.mouseMovedHandler;
        }
        if (this.touchMovedHandler) {
            this.touchMovedHandler.cancel();
            delete this.touchMovedHandler;
        }
        if (this.mouseUpHandler) {
            this.mouseUpHandler.cancel();
            delete this.mouseUpHandler;
        }
        if (this.touchUpHandler) {
            this.touchUpHandler.cancel();
            delete this.touchUpHandler;
        }
    }
}