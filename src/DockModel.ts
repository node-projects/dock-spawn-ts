import { DockNode } from "./DockNode";
import { Dialog } from "./Dialog";

export class DockModel {
    rootNode: DockNode;
    documentManagerNode: DockNode;
    dialogs: Dialog[]

    constructor() {
        this.rootNode = this.documentManagerNode = undefined;
    }
}
