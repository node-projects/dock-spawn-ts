import { DockModel } from "./DockModel.js";
import { DockNode } from "./DockNode.js";
import { PanelContainer } from "./PanelContainer.js";
import { HorizontalDockContainer } from "./HorizontalDockContainer.js";
import { VerticalDockContainer } from "./VerticalDockContainer.js";
import { DocumentManagerContainer } from "./DocumentManagerContainer.js";
import { FillDockContainer } from "./FillDockContainer.js";
import { Dialog } from "./Dialog.js";
import { Utils } from "./Utils.js";
import { TabHostDirection } from "./enums/TabHostDirection";
/**
 * Deserializes the dock layout hierarchy from JSON and creates a dock hierarhcy graph
 */
export class DockGraphDeserializer {
    constructor(dockManager) {
        this.dockManager = dockManager;
    }
    deserialize(_json) {
        let info = JSON.parse(_json);
        let model = new DockModel();
        model.rootNode = this._buildGraph(info.graphInfo);
        model.dialogs = this._buildDialogs(info.dialogsInfo);
        model.documentManagerNode = this.documentManagerNode;
        return model;
    }
    _buildGraph(nodeInfo) {
        let childrenInfo = nodeInfo.children;
        let children = [];
        childrenInfo.forEach((childInfo) => {
            let childNode = this._buildGraph(childInfo);
            if (childNode !== null) {
                children.push(childNode);
            }
        });
        // Build the container owned by this node
        let container = this._createContainer(nodeInfo, children);
        if (container === null) {
            return null;
        }
        // Build the node for this container and attach it's children
        let node = new DockNode(container);
        if (container instanceof DocumentManagerContainer)
            this.documentManagerNode = node;
        node.children = children;
        node.children.reverse().forEach((childNode) => {
            childNode.parent = node;
        });
        node.children.reverse();
        // node.container.setActiveChild(node.container);
        return node;
    }
    _createContainer(nodeInfo, children) {
        let containerType = nodeInfo.containerType;
        let containerState = nodeInfo.state;
        let container;
        let childContainers = [];
        children.forEach((childNode) => { childContainers.push(childNode.container); });
        if (containerType === 'panel') {
            container = PanelContainer.loadFromState(containerState, this.dockManager);
            if (!container.prepareForDocking)
                return null;
            container.prepareForDocking();
            Utils.removeNode(container.elementPanel);
        }
        else if (containerType === 'horizontal')
            container = new HorizontalDockContainer(this.dockManager, childContainers);
        else if (containerType === 'vertical')
            container = new VerticalDockContainer(this.dockManager, childContainers);
        else if (containerType === 'fill') {
            // Check if this is a document manager
            let typeDocumentManager = containerState.documentManager;
            if (typeDocumentManager)
                container = new DocumentManagerContainer(this.dockManager, containerState.disableDocking);
            else
                container = new FillDockContainer(this.dockManager, TabHostDirection.TOP);
        }
        else
            throw new Error('Cannot create dock container of unknown type: ' + containerType);
        // Restore the state of the container
        container.loadState(containerState);
        // container.performLayout(childContainers);
        return container;
    }
    _buildDialogs(dialogsInfo) {
        let dialogs = [];
        dialogsInfo.forEach((dialogInfo) => {
            let containerType = dialogInfo.containerType;
            let containerState = dialogInfo.state;
            let container;
            if (containerType === 'panel') {
                container = PanelContainer.loadFromState(containerState, this.dockManager);
                if (container.prepareForDocking) {
                    Utils.removeNode(container.elementPanel);
                    container.isDialog = true;
                    let dialog = new Dialog(container, this.dockManager);
                    if (dialogInfo.position.x > document.body.clientWidth ||
                        dialogInfo.position.y > document.body.clientHeight - 70) {
                        dialogInfo.position.x = 20;
                        dialogInfo.position.y = 70;
                    }
                    dialog.setPosition(dialogInfo.position.x, dialogInfo.position.y);
                    dialog.isHidden = dialogInfo.isHidden;
                    if (dialog.isHidden)
                        dialog.hide();
                    dialogs.push(dialog);
                }
            }
        });
        return dialogs;
    }
}
//# sourceMappingURL=DockGraphDeserializer.js.map