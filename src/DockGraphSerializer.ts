import { DockModel } from "./DockModel.js";
import { DockNode } from "./DockNode.js";
import { Dialog } from "./Dialog.js";
import { IPanelInfo } from "./interfaces/IPanelInfo.js";
import { INodeInfo } from "./interfaces/INodeInfo.js";
import { IState } from "./interfaces/IState.js";

/**
 * The serializer saves / loads the state of the dock layout hierarchy
 */
export class DockGraphSerializer {

    serialize(model: DockModel) {
        var graphInfo = this._buildGraphInfo(model.rootNode);
        var dialogs = this._buildDialogsInfo(model.dialogs.sort((x,y)=><number><any>x.elementDialog.style.zIndex-<number><any>y.elementDialog.style.zIndex));
        return JSON.stringify({ graphInfo: graphInfo, dialogsInfo: dialogs });
    }

    _buildGraphInfo(node: DockNode): INodeInfo {
        let nodeState: IState = {};
        node.container.saveState(nodeState);

        let childrenInfo: INodeInfo[] = [];
        node.children.forEach((childNode) => {
            childrenInfo.push(this._buildGraphInfo(childNode));
        });

        let nodeInfo: INodeInfo = {
            containerType: node.container.containerType,
            state: nodeState,
            children: childrenInfo
        };
        return nodeInfo;
    }

    _buildDialogsInfo(dialogs: Dialog[]): IPanelInfo[] {
        let dialogsInfo: IPanelInfo[] = [];
        dialogs.forEach((dialog) => {
            let panelState: IState = {};
            let panelContainer = dialog.panel;
            panelContainer.saveState(panelState);

            let panelInfo: IPanelInfo = {
            containerType: panelContainer.containerType,
            state: panelState,
            position: dialog.getPosition(),
            isHidden: dialog.isHidden
        }
            dialogsInfo.push(panelInfo);
        });

        return dialogsInfo;
    }
}