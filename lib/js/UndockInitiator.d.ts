import { EventHandler } from "./EventHandler.js";
import { Point } from "./Point.js";
import { Dialog } from "./Dialog.js";
import { IMouseOrTouchEvent } from "./interfaces/IMouseOrTouchEvent.js";
/**
 * Listens for events on the [element] and notifies the [listener]
 * if an undock event has been invoked.  An undock event is invoked
 * when the user clicks on the event and drags is beyond the
 * specified [thresholdPixels]
 */
export declare class UndockInitiator {
    mouseUpHandler: EventHandler;
    touchUpHandler: EventHandler;
    mouseMoveHandler: EventHandler;
    touchMoveHandler: EventHandler;
    dragStartPosition: Point;
    thresholdPixels: number;
    _enabled: boolean;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    element: HTMLElement;
    _undockededCallback: (e: MouseEvent, dragOffset: Point) => Dialog;
    touchDownUndockedHandler: EventHandler;
    constructor(element: Element, undockededCallback: (e: MouseEvent, dragOffset: Point) => Dialog, thresholdPixels?: number);
    enabled: boolean;
    onMouseDown(e: any): void;
    onMouseUp(): void;
    onMouseMove(e: IMouseOrTouchEvent): void;
    _requestUndock(e: any): void;
}
