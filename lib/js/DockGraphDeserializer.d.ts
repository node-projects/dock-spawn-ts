import { DockManager } from "./DockManager.js";
import { DockModel } from "./DockModel.js";
import { DockNode } from "./DockNode.js";
import { Dialog } from "./Dialog.js";
import { IPanelInfo } from "./interfaces/IPanelInfo.js";
import { INodeInfo } from "./interfaces/INodeInfo.js";
/**
 * Deserializes the dock layout hierarchy from JSON and creates a dock hierarhcy graph
 */
export declare class DockGraphDeserializer {
    dockManager: DockManager;
    documentManagerNode: DockNode;
    constructor(dockManager: DockManager);
    deserialize(_json: string): DockModel;
    _buildGraph(nodeInfo: INodeInfo): DockNode;
    _createContainer(nodeInfo: INodeInfo, children: DockNode[]): any;
    _buildDialogs(dialogsInfo: IPanelInfo[]): Dialog[];
}
