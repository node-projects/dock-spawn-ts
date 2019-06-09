import { EventHandler } from "./EventHandler.js";
import { DockWheel } from "./DockWheel.js";
import { WheelTypes } from "./enums/WheelTypes.js";
export declare class DockWheelItem {
    wheel: DockWheel;
    id: WheelTypes;
    element: HTMLDivElement;
    hoverIconClass: string;
    mouseOverHandler: EventHandler;
    mouseOutHandler: EventHandler;
    active: boolean;
    constructor(wheel: DockWheel, id: WheelTypes);
    onMouseMoved(): void;
    onMouseOut(): void;
}
