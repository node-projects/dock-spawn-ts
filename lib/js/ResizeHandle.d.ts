import { EventHandler } from "./EventHandler.js";
export declare class ResizeHandle {
    element: HTMLElement;
    handleSize: number;
    cornerSize: number;
    east: boolean;
    west: boolean;
    north: boolean;
    south: boolean;
    corner: boolean;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    constructor();
    adjustSize(clientWidth: number, clientHeight: number): void;
}
