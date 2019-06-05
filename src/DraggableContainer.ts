import { Dialog } from "./Dialog.js";
import { DockManager } from "./DockManager.js";
import { EventHandler } from "./EventHandler.js";
import { Point } from "./Point.js";
import { Utils } from "./Utils.js";
import { IDockContainer } from "./IDockContainer.js";
import { ContainerType } from "./ContainerType.js";

export class DraggableContainer implements IDockContainer {

    dialog: Dialog;
    delegate: IDockContainer;
    containerElement: HTMLElement;
    dockManager: DockManager;
    topLevelElement: any;
    containerType: ContainerType;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    minimumAllowedChildNodes: number;
    previousMousePosition: { x: any; y: any; };
    mouseMoveHandler: EventHandler;
    touchMoveHandler: EventHandler;
    mouseUpHandler: EventHandler;
    touchUpHandler: EventHandler;
    
    constructor(dialog: Dialog, delegate : IDockContainer, topLevelElement, dragHandle) {
        this.dialog = dialog;
        this.delegate = delegate;
        this.containerElement = delegate.containerElement;
        this.dockManager = delegate.dockManager;
        this.topLevelElement = topLevelElement;
        this.containerType = delegate.containerType;
        this.mouseDownHandler = new EventHandler(dragHandle, 'mousedown', this.onMouseDown.bind(this));
        this.touchDownHandler = new EventHandler(dragHandle, 'touchstart', this.onMouseDown.bind(this));
        this.topLevelElement.style.marginLeft = topLevelElement.offsetLeft + 'px';
        this.topLevelElement.style.marginTop = topLevelElement.offsetTop + 'px';
        this.minimumAllowedChildNodes = delegate.minimumAllowedChildNodes;
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

    setActiveChild(/*child*/) {
    }

    get width(): number {
        return this.delegate.width;
    }

    get height(): number {
        return this.delegate.height;
    }

    get name() {
        return  this.delegate.name;
    }
    set name(value) {
        if (value)
            this.delegate.name = value;
    }

    resize(width, height) {
        this.delegate.resize(width, height);
    }

    performLayout(children) {
        this.delegate.performLayout(children);
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
        if (event.touches)
            event = event.touches[0];

        this._startDragging(event);
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
        if (this.mouseMoveHandler) {
            this.mouseMoveHandler.cancel();
            delete this.mouseMoveHandler;
        }
        if (this.touchMoveHandler) {
            this.touchMoveHandler.cancel();
            delete this.touchMoveHandler;
        }
        if (this.mouseUpHandler) {
            this.mouseUpHandler.cancel();
            delete this.mouseUpHandler;
        }
        if (this.touchUpHandler) {
            this.touchUpHandler.cancel();
            delete this.touchUpHandler;
        }

        this.mouseMoveHandler = new EventHandler(window, 'mousemove', this.onMouseMove.bind(this));
        this.touchMoveHandler = new EventHandler(window, 'touchmove', this.onMouseMove.bind(this));
        this.mouseUpHandler = new EventHandler(window, 'mouseup', this.onMouseUp.bind(this));
        this.touchUpHandler = new EventHandler(window, 'touchend', this.onMouseUp.bind(this));
    }

    onMouseUp(event) {
        this._stopDragging(event);
        this.mouseMoveHandler.cancel();
        delete this.mouseMoveHandler;
        this.touchMoveHandler.cancel();
        delete this.touchMoveHandler;
        this.mouseUpHandler.cancel();
        delete this.mouseUpHandler;
        this.touchUpHandler.cancel();
        delete this.touchUpHandler;
    }

    _startDragging(event) {
        if (this.dialog.eventListener)
            this.dialog.eventListener.onDialogDragStarted(this.dialog, event);
        document.body.classList.add('disable-selection');
    }

    _stopDragging(event) {
        if (this.dialog.eventListener)
            this.dialog.eventListener.onDialogDragEnded(this.dialog, event);
        document.body.classList.remove('disable-selection');
    }

    onMouseMove(event) {
        let br = document.body.getBoundingClientRect();
        if (event.touches != null) {
            for (let w in this.dockManager.dockWheel.wheelItems) {
                var item = this.dockManager.dockWheel.wheelItems[w];
                var offset = item.element.getBoundingClientRect();
                if (event.touches[0].clientX > (offset.left - br.left) &&
                    event.touches[0].clientX < (offset.left + item.element.clientWidth - br.left) &&
                    event.touches[0].clientY > (offset.top - br.top) &&
                    event.touches[0].clientY < (offset.top + item.element.clientHeight - br.top)) {
                    item.onMouseMoved(event);
                } else {
                    item.onMouseOut(event);
                }
            }
        }

        if (event.changedTouches != null) { // TouchMove Event
            event = event.changedTouches[0];
        }

        var currentMousePosition = new Point(event.clientX, event.clientY);

        var dx = this.dockManager.checkXBounds(this.topLevelElement, currentMousePosition, this.previousMousePosition);
        var dy = this.dockManager.checkYBounds(this.topLevelElement, currentMousePosition, this.previousMousePosition);
        this._performDrag(dx, dy);
        this.previousMousePosition = currentMousePosition;
    }

    _performDrag(dx, dy) {
        var left = dx + Utils.getPixels(this.topLevelElement.style.marginLeft);
        var top = dy + Utils.getPixels(this.topLevelElement.style.marginTop);
        this.topLevelElement.style.marginLeft = left + 'px';
        this.topLevelElement.style.marginTop = top + 'px';
    }
}