import { Dialog } from "./Dialog.js";
import { DockManager } from "./DockManager.js";
import { EventHandler } from "./EventHandler.js";
import { Point } from "./Point.js";
import { Utils } from "./Utils.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { ContainerType } from "./ContainerType.js";
import { IState } from "./interfaces/IState.js";
import { DockWheelItem } from "./DockWheelItem.js";

export class DraggableContainer implements IDockContainer {

    dialog: Dialog;
    delegate: IDockContainer;
    containerElement: HTMLElement;
    dockManager: DockManager;
    topLevelElement: HTMLElement;
    containerType: ContainerType;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    minimumAllowedChildNodes: number;
    previousMousePosition: { x: any; y: any; };
    mouseMoveHandler: EventHandler;
    touchMoveHandler: EventHandler;
    mouseUpHandler: EventHandler;
    touchUpHandler: EventHandler;
   
    constructor(dialog: Dialog, delegate: IDockContainer, topLevelElement: HTMLElement, dragHandle: HTMLElement) {
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

    saveState(state: IState) {
        this.delegate.saveState(state);
    }

    loadState(state: IState) {
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
        return this.delegate.name;
    }
    set name(value) {
        if (value)
            this.delegate.name = value;
    }

    resize(width: number, height: number) {
        this.delegate.resize(width, height);
    }

    performLayout(children: IDockContainer[]) {
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

    onMouseDown(event: TouchEvent | MouseEvent) {
        let touchOrMouseData: { clientX: number, clientY: number } = null;
        if ((<TouchEvent>event).touches) {
            if ((<TouchEvent>event).touches.length > 1)
                return;
            touchOrMouseData = (<TouchEvent>event).touches[0];
        } else {
            touchOrMouseData = <MouseEvent>event;
        }

        this._startDragging(touchOrMouseData);
        this.previousMousePosition = { x: touchOrMouseData.clientX, y: touchOrMouseData.clientY };
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
        this.touchMoveHandler = new EventHandler(<Element>event.target, 'touchmove', this.onMouseMove.bind(this));
        this.mouseUpHandler = new EventHandler(window, 'mouseup', this.onMouseUp.bind(this));
        this.touchUpHandler = new EventHandler(<Element>event.target, 'touchend', this.onMouseUp.bind(this));
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

    _startDragging(event: { clientX: number, clientY: number }) {
        this.containerElement.classList.add("draggable-dragging-active");
        if (this.dialog.eventListener)
            this.dialog.eventListener._onDialogDragStarted(this.dialog, event);
        Utils.disableGlobalTextSelection(this.dockManager.config.dialogRootElement);
    }

    _stopDragging(event) {
        this.containerElement.classList.remove("draggable-dragging-active");
        if (this.dialog.eventListener)
            this.dialog.eventListener._onDialogDragEnded(this.dialog, event);
        Utils.enableGlobalTextSelection(this.dockManager.config.dialogRootElement);
    }

    onMouseMove(event: TouchEvent | MouseEvent) {
        let br = document.body.getBoundingClientRect();

        if ((<TouchEvent>event).touches != null) {
            if ((<TouchEvent>event).touches.length > 1)
                return;
            for (let w in this.dockManager.dockWheel.wheelItems) {
                let item: DockWheelItem = this.dockManager.dockWheel.wheelItems[w];
                let offset = item.element.getBoundingClientRect();
                if ((<TouchEvent>event).touches[0].clientX > (offset.left - br.left) &&
                    (<TouchEvent>event).touches[0].clientX < (offset.left + item.element.clientWidth - br.left) &&
                    (<TouchEvent>event).touches[0].clientY > (offset.top - br.top) &&
                    (<TouchEvent>event).touches[0].clientY < (offset.top + item.element.clientHeight - br.top)) {
                    item.onMouseMoved();
                } else {
                    if (item.active)
                        item.onMouseOut();
                }
            }
        }

        let touchOrMouseData: { clientX: number, clientY: number } = null;
        if ((<TouchEvent>event).changedTouches) {
            if ((<TouchEvent>event).changedTouches.length > 1)
                return;
            touchOrMouseData = (<TouchEvent>event).changedTouches[0];
        } else {
            touchOrMouseData = <MouseEvent>event;
        }

        let currentMousePosition = new Point(touchOrMouseData.clientX, touchOrMouseData.clientY);

        let dx = this.dockManager.checkXBounds(this.topLevelElement, currentMousePosition, this.previousMousePosition, false, false);
        let dy = this.dockManager.checkYBounds(this.topLevelElement, currentMousePosition, this.previousMousePosition, false, false);
        this._performDrag(dx, dy);
        this.previousMousePosition = currentMousePosition;
    }

    _performDrag(dx: number, dy: number) {
        let left = dx + Utils.getPixels(this.topLevelElement.style.marginLeft);
        let top = dy + Utils.getPixels(this.topLevelElement.style.marginTop);
        this.topLevelElement.style.marginLeft = left + 'px';
        this.topLevelElement.style.marginTop = top + 'px';
    }
}