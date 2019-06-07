import { DockModel } from "./DockModel.js";
import { DockNode } from "./DockNode.js";
import { Dialog } from "./Dialog.js";
import { IPanelInfo } from "./interfaces/IPanelInfo.js";
import { INodeInfo } from "./interfaces/INodeInfo.js";

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
        let nodeState = new Map<string, object>();
        node.container.saveState(nodeState);

        let childrenInfo = [];
        let self = this;
        node.children.forEach(function (childNode) {
            childrenInfo.push(self._buildGraphInfo(childNode));
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
            let panelState = new Map<string, object>();
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