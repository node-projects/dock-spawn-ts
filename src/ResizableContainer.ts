import { Dialog } from "./Dialog.js";
import { ResizeHandle } from "./ResizeHandle.js";
import { EventHandler } from "./EventHandler.js";
import { DockManager } from "./DockManager.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { ContainerType } from "./ContainerType.js";
import { Point } from "./Point.js";
import { Utils } from "./Utils.js";
import { IThickness } from "./interfaces/IThickness.js";

/**
 * Decorates a dock container with resizer handles around its base element
 * This enables the container to be resized from all directions
 */
export class ResizableContainer implements IDockContainer {

    topLevelElement: HTMLElement;
    dialog: Dialog;
    delegate: IDockContainer;
    dockManager: DockManager;
    containerElement: HTMLElement;
    containerType: ContainerType;
    minimumAllowedChildNodes: number;
    readyToProcessNextResize: boolean;
    dockSpawnResizedEvent: CustomEvent<{}>;
    resizeHandles: ResizeHandle[];
    previousMousePosition: Point;

    constructor(dialog: Dialog, delegate: IDockContainer, topLevelElement: HTMLElement) {
        this.dialog = dialog;
        this.delegate = delegate;
        this.containerElement = delegate.containerElement;
        this.dockManager = delegate.dockManager;
        this.topLevelElement = topLevelElement;
        this.containerType = delegate.containerType;
        this.topLevelElement.style.marginLeft = this.topLevelElement.offsetLeft + 'px';
        this.topLevelElement.style.marginTop = this.topLevelElement.offsetTop + 'px';
        this.minimumAllowedChildNodes = delegate.minimumAllowedChildNodes;
        this._buildResizeHandles();
        this.readyToProcessNextResize = true;
        this.dockSpawnResizedEvent = new CustomEvent("DockSpawnResizedEvent");
    }

    setActiveChild(/*child*/) {
    }

    _buildResizeHandles() {
        this.resizeHandles = [];
        //    this._buildResizeHandle(true, false, true, false); // Dont need the corner resizer near the close button
        this._buildResizeHandle(false, true, true, false);
        this._buildResizeHandle(true, false, false, true);
        this._buildResizeHandle(false, true, false, true);

        this._buildResizeHandle(true, false, false, false);
        this._buildResizeHandle(false, true, false, false);
        this._buildResizeHandle(false, false, true, false);
        this._buildResizeHandle(false, false, false, true);
    }

    _buildResizeHandle(east:boolean, west:boolean, north:boolean, south:boolean) {
        let handle = new ResizeHandle();
        handle.east = east;
        handle.west = west;
        handle.north = north;
        handle.south = south;

        // Create an invisible div for the handle
        handle.element = document.createElement('div');
        this.topLevelElement.appendChild(handle.element);

        // Build the class name for the handle
        let verticalClass = '';
        let horizontalClass = '';
        if (north) verticalClass = 'n';
        if (south) verticalClass = 's';
        if (east) horizontalClass = 'e';
        if (west) horizontalClass = 'w';
        let cssClass = 'resize-handle-' + verticalClass + horizontalClass;
        if (verticalClass.length > 0 && horizontalClass.length > 0)
            handle.corner = true;

        handle.element.classList.add(handle.corner ? 'resize-handle-corner' : 'resize-handle');
        handle.element.classList.add(cssClass);
        this.resizeHandles.push(handle);

        handle.mouseDownHandler = new EventHandler(handle.element, 'mousedown', (e) => { this.onMouseDown(handle, e); });
        handle.touchDownHandler = new EventHandler(handle.element, 'touchstart', (e) => { this.onMouseDown(handle, e); });
    }

    saveState(state) {
        this.delegate.saveState(state);
    }

    loadState(state) {
        this.delegate.loadState(state);
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
        this._adjustResizeHandles(width, height);
        document.dispatchEvent(this.dockSpawnResizedEvent);
    }

    _adjustResizeHandles(width: number, height: number) {
        this.resizeHandles.forEach((handle) => {
            handle.adjustSize(width, height);
        });
    }

    performLayout(children) {
        this.delegate.performLayout(children, false);
    }

    destroy() {
        this.removeDecorator();
        this.delegate.destroy();
    }

    removeDecorator() {
    }

    onMouseMoved(handle, e) {
        if (e.changedTouches != null) { // TouchMove Event
            e = e.changedTouches[0];
        }

        if (!this.readyToProcessNextResize)
            return;
        this.readyToProcessNextResize = false;

        //    window.requestLayoutFrame(() {
        this.dockManager.suspendLayout();
        let currentMousePosition = new Point(e.clientX, e.clientY);
        let dx = this.dockManager.checkXBounds(this.topLevelElement, currentMousePosition, this.previousMousePosition);
        let dy = this.dockManager.checkYBounds(this.topLevelElement, currentMousePosition, this.previousMousePosition);
        this._performDrag(handle, dx, dy);
        this.previousMousePosition = currentMousePosition;
        this.readyToProcessNextResize = true;
        if (this.dialog.panel)
            this.dockManager.resumeLayout(this.dialog.panel);
    }

    onMouseDown(handle, event) {
        if (event.touches)
            event = event.touches[0];
        this.previousMousePosition = new Point(event.clientX, event.clientY);
        if (handle.mouseMoveHandler) {
            handle.mouseMoveHandler.cancel();
            delete handle.mouseMoveHandler;
        }
        if (handle.touchMoveHandler) {
            handle.touchMoveHandler.cancel();
            delete handle.touchMoveHandler;
        }
        if (handle.mouseUpHandler) {
            handle.mouseUpHandler.cancel();
            delete handle.mouseUpHandler;
        }
        if (handle.touchUpHandler) {
            handle.touchUpHandler.cancel();
            delete handle.touchUpHandler;
        }

        // Create the mouse event handlers
        handle.mouseMoveHandler = new EventHandler(window, 'mousemove', (e) => { this.onMouseMoved(handle, e); });
        handle.touchMoveHandler = new EventHandler(window, 'touchmove', (e) => { this.onMouseMoved(handle, e); });
        handle.mouseUpHandler = new EventHandler(window, 'mouseup', (e) => { this.onMouseUp(handle); });
        handle.touchUpHandler = new EventHandler(window, 'touchend', (e) => { this.onMouseUp(handle); });

        document.body.classList.add('disable-selection');
    }

    onMouseUp(handle) {
        handle.mouseMoveHandler.cancel();
        handle.touchMoveHandler.cancel();
        handle.mouseUpHandler.cancel();
        handle.touchUpHandler.cancel();
        delete handle.mouseMoveHandler;
        delete handle.touchMoveHandler;
        delete handle.mouseUpHandler;
        delete handle.touchUpHandler;

        document.body.classList.remove('disable-selection');
    }

    _performDrag(handle, dx: number, dy: number) {
        let bounds: IThickness = {};
        bounds.left = Utils.getPixels(this.topLevelElement.style.marginLeft);
        bounds.top = Utils.getPixels(this.topLevelElement.style.marginTop);
        bounds.width = this.topLevelElement.clientWidth;
        bounds.height = this.topLevelElement.clientHeight;

        if (handle.east) this._resizeEast(dx, bounds);
        if (handle.west) this._resizeWest(dx, bounds);
        if (handle.north) this._resizeNorth(dy, bounds);
        if (handle.south) this._resizeSouth(dy, bounds);
    }

    _resizeWest(dx: number, bounds) {
        this._resizeContainer(dx, 0, -dx, 0, bounds);
    }

    _resizeEast(dx: number, bounds) {
        this._resizeContainer(0, 0, dx, 0, bounds);
    }

    _resizeNorth(dy: number, bounds) {
        this._resizeContainer(0, dy, 0, -dy, bounds);
    }

    _resizeSouth(dy: number, bounds) {
        this._resizeContainer(0, 0, 0, dy, bounds);
    }

    _resizeContainer(leftDelta: number, topDelta: number, widthDelta: number, heightDelta: number, bounds: IThickness) {
        bounds.left += leftDelta;
        bounds.top += topDelta;
        bounds.width += widthDelta;
        bounds.height += heightDelta;

        let minWidth = 50;  // TODO: Move to external configuration
        let minHeight = 50;  // TODO: Move to external configuration
        bounds.width = Math.max(bounds.width, minWidth);
        bounds.height = Math.max(bounds.height, minHeight);

        this.topLevelElement.style.marginLeft = bounds.left + 'px';
        this.topLevelElement.style.marginTop = bounds.top + 'px';

        this.resize(bounds.width, bounds.height);
    }
}