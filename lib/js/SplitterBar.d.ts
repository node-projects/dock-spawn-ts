import { IDockContainer } from "./interfaces/IDockContainer.js";
import { EventHandler } from "./EventHandler.js";
import { IMouseOrTouchEvent } from "./interfaces/IMouseOrTouchEvent.js";
export declare class SplitterBar {
    previousContainer: IDockContainer;
    nextContainer: IDockContainer;
    stackedVertical: boolean;
    barElement: HTMLDivElement;
    pointerDownHandler: EventHandler;
    minPanelSize: number;
    readyToProcessNextDrag: boolean;
    dockSpawnResizedEvent: CustomEvent<{}>;
    previousMouseEvent: {
        x: number;
        y: number;
    };
    pointerMovedHandler: EventHandler;
    pointerUpHandler: EventHandler;
    private iframeEventHandlers;
    constructor(previousContainer: IDockContainer, nextContainer: IDockContainer, stackedVertical: boolean);
    onPointerDown(e: PointerEvent): void;
    onPointerUp(e: PointerEvent): void;
    onPointerMovedIframe(e: IMouseOrTouchEvent, iframe: HTMLIFrameElement): void;
    onPointerMoved(e: IMouseOrTouchEvent): void;
    handleMoveEvent(pos: {
        x: number;
        y: number;
    }): void;
    _performDrag(dx: number, dy: number): void;
    _startDragging(e: IMouseOrTouchEvent): void;
    _stopDragging(): void;
}
