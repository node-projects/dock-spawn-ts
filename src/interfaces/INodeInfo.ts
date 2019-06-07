import { ContainerType } from "../ContainerType.js";

export interface INodeInfo {
    containerType: ContainerType;
    state: Map<string, object>;
    children: INodeInfo[];
}
