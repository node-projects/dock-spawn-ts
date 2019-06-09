import { ISize } from "./ISize.js";
import { IDockContainer } from "./IDockContainer.js";
export interface IDockContainerWithSize extends IDockContainer {
    state: ISize;
}
