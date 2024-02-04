import { EventHandler } from "./EventHandler.js";
import { Point } from "./Point.js";
import { Utils } from "./Utils.js";
export class DraggableContainer {
    constructor(dialog, delegate, topLevelElement, dragHandle) {
        this.dialog = dialog;
        this.delegate = delegate;
        this.containerElement = delegate.containerElement;
        this.dockManager = delegate.dockManager;
        this.topLevelElement = topLevelElement;
        this.containerType = delegate.containerType;
        this.mouseDownHandler = new EventHandler(dragHandle, 'mousedown', this.onMouseDown.bind(this));
        this.touchDownHandler = new EventHandler(dragHandle, 'touchstart', this.onMouseDown.bind(this));
        this.topLevelElement.style.left = topLevelElement.offsetLeft + 'px';
        this.topLevelElement.style.top = topLevelElement.offsetTop + 'px';
        this.minimumAllowedChildNodes = delegate.minimumAllowedChildNodes;
        this.iframeEventHandlers = [];
    }
    destroy() {
        this.removeDecorator();
        this.delegate.destroy();
    }
    saveState(state) {
        this.delegate.saveState(state);
    }
    loadState(state) {
        this.delegate.loadState(state);
    }
    setActiveChild( /*child*/) {
    }
    get width() {
        return this.delegate.width;
    }
    get height() {
        return this.delegate.height;
    }
    get name() {
        return this.delegate.name;
    }
    set name(value) {
        if (value)
            this.delegate.name = value;
    }
    resize(width, height) {
        this.delegate.resize(width, height);
    }
    performLayout(children) {
        this.delegate.performLayout(children, false);
    }
    removeDecorator() {
        if (this.mouseDownHandler) {
            this.mouseDownHandler.cancel();
            delete this.mouseDownHandler;
        }
        if (this.touchDownHandler) {
            this.touchDownHandler.cancel();
            delete this.touchDownHandler;
        }
    }
    onMouseDown(event) {
        if (event.button == 2)
            return;
        if (event.preventDefault)
            event.preventDefault();
        this._startDragging(event);
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
        if (this.mouseMoveHandler) {
            this.mouseMoveHandler.cancel();
            delete this.mouseMoveHandler;
        }
        if (this.mouseUpHandler) {
            this.mouseUpHandler.cancel();
            delete this.mouseUpHandler;
        }
        this.mouseMoveHandler = new EventHandler(window, 'pointermove', this.onMouseMove.bind(this));
        this.mouseUpHandler = new EventHandler(window, 'pointerup', this.onMouseUp.bind(this));
        if (this.dockManager.iframes) {
            for (let f of this.dockManager.iframes) {
                let mmi = this.onMouseMovedIframe.bind(this);
                this.iframeEventHandlers.push(new EventHandler(f.contentWindow, 'pointermove', (e) => mmi(e, f)));
                this.iframeEventHandlers.push(new EventHandler(f.contentWindow, 'pointerup', this.onMouseUp.bind(this)));
            }
        }
    }
    onMouseUp(event) {
        this._stopDragging(event);
        this.mouseMoveHandler.cancel();
        delete this.mouseMoveHandler;
        this.mouseUpHandler.cancel();
        delete this.mouseUpHandler;
        for (let e of this.iframeEventHandlers) {
            e.cancel();
        }
        this.iframeEventHandlers = [];
    }
    _startDragging(event) {
        this.containerElement.classList.add("draggable-dragging-active");
        this.delegate.elementContentContainer.classList.add("draggable-dragging-active");
        if (this.dialog.eventListener)
            this.dialog.eventListener._onDialogDragStarted(this.dialog, event);
        Utils.disableGlobalTextSelection(this.dockManager.config.dialogRootElement);
    }
    _stopDragging(event) {
        this.containerElement.classList.remove("draggable-dragging-active");
        this.delegate.elementContentContainer.classList.remove("draggable-dragging-active");
        if (this.dialog.eventListener)
            this.dialog.eventListener._onDialogDragEnded(this.dialog, event);
        Utils.enableGlobalTextSelection(this.dockManager.config.dialogRootElement);
    }
    onMouseMovedIframe(e, iframe) {
        let posIf = iframe.getBoundingClientRect();
        this.onMouseMove(e, { x: posIf.x, y: posIf.y });
    }
    onMouseMove(event, iframeOffset) {
        if (event.preventDefault)
            event.preventDefault();
        let currentMousePosition = new Point(event.clientX, event.clientY);
        if (iframeOffset)
            currentMousePosition = new Point(event.clientX + iframeOffset.x, event.clientY + iframeOffset.y);
        let dx = this.dockManager.checkXBounds(this.topLevelElement, currentMousePosition, this.previousMousePosition, false, false);
        let dy = this.dockManager.checkYBounds(this.topLevelElement, currentMousePosition, this.previousMousePosition, false, false);
        this._performDrag(dx, dy);
        this.previousMousePosition = currentMousePosition;
    }
    _performDrag(dx, dy) {
        let left = dx + Utils.getPixels(this.topLevelElement.style.left);
        let top = dy + Utils.getPixels(this.topLevelElement.style.top);
        this.topLevelElement.style.left = left + 'px';
        this.topLevelElement.style.top = top + 'px';
        this.dialog.panel.setDialogPosition(left, top);
    }
}
//# sourceMappingURL=DraggableContainer.js.map