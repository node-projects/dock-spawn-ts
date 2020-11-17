import { Dialog } from "./Dialog.js";
import { ResizeHandle } from "./ResizeHandle.js";
import { DockManager } from "./DockManager.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { ContainerType } from "./ContainerType.js";
import { Point } from "./Point.js";
import { IThickness } from "./interfaces/IThickness.js";
import { IState } from "./interfaces/IState.js";
/**
 * Decorates a dock container with resizer handles around its base element
 * This enables the container to be resized from all directions
 */
export declare class ResizableContainer implements IDockContainer {
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
    private iframeEventHandlers;
    constructor(dialog: Dialog, delegate: IDockContainer, topLevelElement: HTMLElement);
    setActiveChild(): void;
    _buildResizeHandles(): void;
    _buildResizeHandle(east: boolean, west: boolean, north: boolean, south: boolean): void;
    saveState(state: IState): void;
    loadState(state: IState): void;
    get width(): number;
    get height(): number;
    get name(): string;
    set name(value: string);
    resize(width: number, height: number): void;
    _adjustResizeHandles(width: number, height: number): void;
    performLayout(children: any): void;
    destroy(): void;
    removeDecorator(): void;
    onMouseMovedIframe(handle: any, e: MouseEvent, iframe: HTMLIFrameElement): void;
    onMouseMoved(handle: ResizeHandle, event: TouchEvent | MouseEvent, iframeOffset?: {
        x: number;
        y: number;
    }): void;
    onMouseDown(handle: any, event: TouchEvent | MouseEvent): void;
    onMouseUp(handle: any): void;
    _performDrag(handle: any, dx: number, dy: number): void;
    _resizeWest(dx: number, bounds: IThickness): void;
    _resizeEast(dx: number, bounds: IThickness): void;
    _resizeNorth(dy: number, bounds: IThickness): void;
    _resizeSouth(dy: number, bounds: IThickness): void;
    _resizeContainer(leftDelta: number, topDelta: number, widthDelta: number, heightDelta: number, bounds: IThickness): void;
}
