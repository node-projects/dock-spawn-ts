import { ContainerType } from "../ContainerType.js";
import { Point } from "../Point.js";
import { IState } from "./IState.js";

export interface IPanelInfo {
    containerType: ContainerType;
    state: IState;
    position: Point;
    isHidden: boolean;
    /** Omitted in older layouts, where dialogs are resizable by default. */
    disableResize?: boolean;
}
