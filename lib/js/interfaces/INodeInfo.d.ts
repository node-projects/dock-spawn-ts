import { ContainerType } from "../ContainerType.js";
import { IState } from "./IState.js";
export interface INodeInfo {
    containerType: ContainerType;
    state: IState;
    children: INodeInfo[];
}
