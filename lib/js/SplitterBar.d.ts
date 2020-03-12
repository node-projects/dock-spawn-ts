import { IDockContainer } from "./interfaces/IDockContainer.js";
import { EventHandler } from "./EventHandler.js";
import { IMouseOrTouchEvent } from "./interfaces/IMouseOrTouchEvent.js";
export declare class SplitterBar {
    previousContainer: IDockContainer;
    nextContainer: IDockContainer;
    stackedVertical: boolean;
    barElement: HTMLDivElement;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    minPanelSize: number;
    readyToProcessNextDrag: boolean;
    dockSpawnResizedEvent: CustomEvent<{}>;
    previousMouseEvent: {
        x: number;
        y: number;
    };
    mouseMovedHandler: EventHandler;
    mouseUpHandler: EventHandler;
    touchMovedHandler: EventHandler;
    touchUpHandler: EventHandler;
    private iframeEventHandlers;
    constructor(previousContainer: IDockContainer, nextContainer: IDockContainer, stackedVertical: boolean);
    onMouseDown(e: IMouseOrTouchEvent): void;
    onMouseUp(): void;
    onMouseMovedIframe(e: IMouseOrTouchEvent, iframe: HTMLIFrameElement): void;
    onMouseMoved(e: IMouseOrTouchEvent): void;
    handleMoveEvent(pos: {
        x: number;
        y: number;
    }): void;
    _performDrag(dx: number, dy: number): void;
    _startDragging(e: IMouseOrTouchEvent): void;
    _stopDragging(): void;
}
