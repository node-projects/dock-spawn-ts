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
export class UndockInitiator {
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

    constructor(element: Element, undockededCallback: (e: MouseEvent, dragOffset: Point) => Dialog, thresholdPixels?: number) {
        if (!thresholdPixels) {
            thresholdPixels = 5;
        }

        this.element = element as HTMLElement;
        this._undockededCallback = undockededCallback;
        this.thresholdPixels = thresholdPixels;
        this._enabled = false;
    }

    get enabled(): boolean {
        return this._enabled;
    }
    set enabled(value: boolean) {
        this._enabled = value;
        if (this._enabled) {
            if (this.mouseDownHandler) {
                this.mouseDownHandler.cancel();
                delete this.mouseDownHandler;
            }
            if (this.touchDownHandler) {
                this.touchDownHandler.cancel();
                delete this.touchDownHandler;
            }

            this.mouseDownHandler = new EventHandler(this.element, 'mousedown', this.onMouseDown.bind(this));
            this.touchDownHandler = new EventHandler(this.element, 'touchstart', this.onMouseDown.bind(this));
        }
        else {
            if (this.mouseDownHandler) {
                this.mouseDownHandler.cancel();
                delete this.mouseDownHandler;
            }

            if (this.touchDownHandler) {
                this.touchDownHandler.cancel();
                delete this.touchDownHandler;
            }

            if (this.mouseUpHandler) {
                this.mouseUpHandler.cancel();
                delete this.mouseUpHandler;
            }

            if (this.touchUpHandler) {
                this.touchUpHandler.cancel();
                delete this.touchUpHandler;
            }

            if (this.mouseMoveHandler) {
                this.mouseMoveHandler.cancel();
                delete this.mouseMoveHandler;
            }

            if (this.touchMoveHandler) {
                this.touchMoveHandler.cancel();
                delete this.touchMoveHandler;
            }
        }
    }

    onMouseDown(e: any) {
        // Make sure we dont do this on floating dialogs
        if (this.enabled) {
            if (e.touches) {
                if (e.touches.length > 1)
                    return;
                e = e.touches[0];
            }

            if (this.mouseUpHandler) {
                this.mouseUpHandler.cancel();
                delete this.mouseUpHandler;
            }

            if (this.touchUpHandler) {
                this.touchUpHandler.cancel();
                delete this.touchUpHandler;
            }

            if (this.mouseMoveHandler) {
                this.mouseMoveHandler.cancel();
                delete this.mouseMoveHandler;
            }

            if (this.touchMoveHandler) {
                this.touchMoveHandler.cancel();
                delete this.touchMoveHandler;
            }

            this.mouseUpHandler = new EventHandler(window, 'mouseup', this.onMouseUp.bind(this));
            this.touchUpHandler = new EventHandler(window, 'touchend', this.onMouseUp.bind(this));
            this.mouseMoveHandler = new EventHandler(window, 'mousemove', this.onMouseMove.bind(this));
            this.touchMoveHandler = new EventHandler(window, 'touchmove', this.onMouseMove.bind(this));
            this.dragStartPosition = new Point(e.clientX, e.clientY);
        }
    }

    onMouseUp() {
        if (this.mouseUpHandler) {
            this.mouseUpHandler.cancel();
            delete this.mouseUpHandler;
        }

        if (this.touchUpHandler) {
            this.touchUpHandler.cancel();
            delete this.touchUpHandler;
        }

        if (this.mouseMoveHandler) {
            this.mouseMoveHandler.cancel();
            delete this.mouseMoveHandler;
        }

        if (this.touchMoveHandler) {
            this.touchMoveHandler.cancel();
            delete this.touchMoveHandler;
        }
    }

    onMouseMove(e: IMouseOrTouchEvent) {
        if (e.touches) {
            if (e.touches.length > 1)
                return;
            e = e.touches[0];
        }

        let position = new Point(e.clientX, e.clientY);
        let dy = position.y - this.dragStartPosition.y;
        
        if (dy > this.thresholdPixels) {
            this.enabled = false;
            this._requestUndock(e);
        }
    }

    _requestUndock(e) {
        let top = 0;
        let left = 0;
        let currentElement = this.element;
        
        do {
            top += currentElement.offsetTop || 0;
            left += currentElement.offsetLeft || 0;
            currentElement = currentElement.offsetParent as HTMLElement;
        } while (currentElement);

        let dragOffsetX = this.dragStartPosition.x - left;
        let dragOffsetY = this.dragStartPosition.y - top;
        let dragOffset = new Point(dragOffsetX, dragOffsetY);
        this._undockededCallback(e, dragOffset);
    }
}