import { ContainerType } from "../ContainerType.js";
import { Point } from "../Point.js";

export interface IPanelInfo {
    containerType: ContainerType;
    state: Map<string, object>;
    position: Point;
    isHidden: boolean;
}
