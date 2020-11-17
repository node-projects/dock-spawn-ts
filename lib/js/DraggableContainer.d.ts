import { Dialog } from "./Dialog.js";
import { DockManager } from "./DockManager.js";
import { EventHandler } from "./EventHandler.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { ContainerType } from "./ContainerType.js";
import { IState } from "./interfaces/IState.js";
export declare class DraggableContainer implements IDockContainer {
    dialog: Dialog;
    delegate: IDockContainer;
    containerElement: HTMLElement;
    dockManager: DockManager;
    topLevelElement: HTMLElement;
    containerType: ContainerType;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    minimumAllowedChildNodes: number;
    previousMousePosition: {
        x: any;
        y: any;
    };
    mouseMoveHandler: EventHandler;
    touchMoveHandler: EventHandler;
    mouseUpHandler: EventHandler;
    touchUpHandler: EventHandler;
    private iframeEventHandlers;
    constructor(dialog: Dialog, delegate: IDockContainer, topLevelElement: HTMLElement, dragHandle: HTMLElement);
    destroy(): void;
    saveState(state: IState): void;
    loadState(state: IState): void;
    setActiveChild(): void;
    get width(): number;
    get height(): number;
    get name(): string;
    set name(value: string);
    resize(width: number, height: number): void;
    performLayout(children: IDockContainer[]): void;
    removeDecorator(): void;
    onMouseDown(event: TouchEvent | MouseEvent): void;
    onMouseUp(event: any): void;
    _startDragging(event: {
        clientX: number;
        clientY: number;
    }): void;
    _stopDragging(event: any): void;
    onMouseMovedIframe(e: MouseEvent, iframe: HTMLIFrameElement): void;
    onMouseMove(event: TouchEvent | MouseEvent, iframeOffset?: {
        x: number;
        y: number;
    }): void;
    _performDrag(dx: number, dy: number): void;
}
