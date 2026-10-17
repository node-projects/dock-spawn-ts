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
        let graphInfo = this._buildGraphInfo(model.rootNode);
        let dialogs = this._buildDialogsInfo(model.dialogs.sort((x,y)=><number><any>x.elementDialog.style.zIndex-<number><any>y.elementDialog.style.zIndex));
        const autoHidePanels = model.autoHidePanels.map(entry => {
            const state: IState = {};
            entry.panel.saveState(state);
            state.width = entry.width;
            state.height = entry.height;
            return { state, side: entry.side, tabGroupElement: entry.tabGroupElement, restoreLocations: entry.restoreLocations };
        });
        return JSON.stringify({ graphInfo: graphInfo, dialogsInfo: dialogs, autoHidePanels, autoHideLayout: model.autoHideLayout });
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
