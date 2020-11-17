import { EventHandler } from "./EventHandler.js";
import { Utils } from "./Utils.js";
export class SplitterBar {
    constructor(previousContainer, nextContainer, stackedVertical) {
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
        this.dockSpawnResizedEvent = new CustomEvent("DockSpawnResizedEvent", { composed: true, bubbles: true });
        this.iframeEventHandlers = [];
    }
    onMouseDown(e) {
        if (e.touches) {
            if (e.touches.length > 1)
                return;
            e = e.touches[0];
        }
        this._startDragging(e);
    }
    onMouseUp() {
        this._stopDragging();
    }
    onMouseMovedIframe(e, iframe) {
        if (e.changedTouches != null) {
            e = e.changedTouches[0];
        }
        let posIf = iframe.getBoundingClientRect();
        this.handleMoveEvent({ x: e.clientX + posIf.x, y: e.clientY + posIf.y });
    }
    onMouseMoved(e) {
        if (e.changedTouches != null) {
            e = e.changedTouches[0];
        }
        this.handleMoveEvent({ x: e.clientX, y: e.clientY });
    }
    handleMoveEvent(pos) {
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
    _performDrag(dx, dy) {
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
    _startDragging(e) {
        Utils.disableGlobalTextSelection(this.previousContainer.dockManager.config.dialogRootElement);
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
        if (this.previousContainer.dockManager.iframes) {
            for (let f of this.previousContainer.dockManager.iframes) {
                let mmi = this.onMouseMovedIframe.bind(this);
                this.iframeEventHandlers.push(new EventHandler(f.contentWindow, 'mousemove', (e) => mmi(e, f)));
                this.iframeEventHandlers.push(new EventHandler(f.contentWindow, 'mouseup', this.onMouseUp.bind(this)));
                this.iframeEventHandlers.push(new EventHandler(f.contentWindow, 'touchmove', (e) => mmi(e, f)));
                this.iframeEventHandlers.push(new EventHandler(f.contentWindow, 'touchend', this.onMouseUp.bind(this)));
            }
        }
        this.previousMouseEvent = { x: e.clientX, y: e.clientY };
    }
    _stopDragging() {
        Utils.enableGlobalTextSelection(this.previousContainer.dockManager.config.dialogRootElement);
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
        for (let e of this.iframeEventHandlers) {
            e.cancel();
        }
        this.iframeEventHandlers = [];
    }
}
//# sourceMappingURL=SplitterBar.js.map