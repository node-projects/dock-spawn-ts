import { EventHandler } from "./EventHandler.js";
import { Point } from "./Point.js";
import { Utils } from "./Utils.js";
export class DraggableContainer {
    dialog;
    delegate;
    containerElement;
    dockManager;
    topLevelElement;
    containerType;
    mouseDownHandler;
    touchDownHandler;
    minimumAllowedChildNodes;
    previousMousePosition;
    dragOffset;
    mouseMoveHandler;
    mouseUpHandler;
    iframeEventHandlers;
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
        this.setDragOffset(event.clientX, event.clientY);
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
        this._performDragToMouse(currentMousePosition);
        this.previousMousePosition = currentMousePosition;
    }
    setDragOffset(clientX, clientY) {
        const rect = this.topLevelElement.getBoundingClientRect();
        this.dragOffset = new Point(clientX - rect.left, clientY - rect.top);
    }
    _performDragToMouse(mousePosition) {
        const rootRect = this.dockManager.config.dialogRootElement.getBoundingClientRect();
        let left = mousePosition.x - rootRect.left - this.dragOffset.x;
        let top = mousePosition.y - rootRect.top - this.dragOffset.y;
        const constrained = this.constrainDragPosition(left, top);
        this._setPosition(constrained.x, constrained.y);
    }
    constrainDragPosition(left, top) {
        if (this.dockManager.config.moveOnlyWithinDockConatiner) {
            const rootRect = this.dockManager.config.dialogRootElement.getBoundingClientRect();
            left = Math.min(Math.max(left, 0), Math.max(0, rootRect.width - this.topLevelElement.offsetWidth));
            top = Math.min(Math.max(top, 0), Math.max(0, rootRect.height - this.topLevelElement.offsetHeight));
            return new Point(left, top);
        }
        const rootRect = this.dockManager.config.dialogRootElement.getBoundingClientRect();
        const minLeft = 40 - this.topLevelElement.offsetWidth - rootRect.left;
        const maxLeft = window.innerWidth - 40 - rootRect.left;
        const minTop = -rootRect.top;
        const maxTop = window.innerHeight - 16 - rootRect.top;
        left = Math.min(Math.max(left, minLeft), maxLeft);
        top = Math.min(Math.max(top, minTop), maxTop);
        return new Point(left, top);
    }
    _performDrag(dx, dy) {
        let left = dx + Utils.getPixels(this.topLevelElement.style.left);
        let top = dy + Utils.getPixels(this.topLevelElement.style.top);
        this._setPosition(left, top);
    }
    _setPosition(left, top) {
        this.topLevelElement.style.left = left + 'px';
        this.topLevelElement.style.top = top + 'px';
        this.dialog.panel.setDialogPosition(left, top);
    }
}
//# sourceMappingURL=DraggableContainer.js.map