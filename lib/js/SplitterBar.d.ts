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
    previousMouseEvent: IMouseOrTouchEvent;
    mouseMovedHandler: EventHandler;
    mouseUpHandler: EventHandler;
    touchMovedHandler: EventHandler;
    touchUpHandler: EventHandler;
    constructor(previousContainer: IDockContainer, nextContainer: IDockContainer, stackedVertical: boolean);
    onMouseDown(e: IMouseOrTouchEvent): void;
    onMouseUp(): void;
    onMouseMoved(e: IMouseOrTouchEvent): void;
    _performDrag(dx: number, dy: number): void;
    _startDragging(e: IMouseOrTouchEvent): void;
    _stopDragging(): void;
}
