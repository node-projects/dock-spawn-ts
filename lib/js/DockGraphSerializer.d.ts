import { DockModel } from "./DockModel.js";
import { DockNode } from "./DockNode.js";
import { Dialog } from "./Dialog.js";
import { IPanelInfo } from "./interfaces/IPanelInfo.js";
import { INodeInfo } from "./interfaces/INodeInfo.js";
/**
 * The serializer saves / loads the state of the dock layout hierarchy
 */
export declare class DockGraphSerializer {
    serialize(model: DockModel): string;
    _buildGraphInfo(node: DockNode): INodeInfo;
    _buildDialogsInfo(dialogs: Dialog[]): IPanelInfo[];
}
