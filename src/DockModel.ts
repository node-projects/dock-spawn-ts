import { DockNode } from "./DockNode.js";
import { Dialog } from "./Dialog.js";

export class DockModel {
    rootNode: DockNode;
    documentManagerNode: DockNode;
    dialogs: Dialog[]

    constructor() {
        this.rootNode = this.documentManagerNode = undefined;
    }
}
