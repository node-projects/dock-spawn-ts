import { DockNode } from "./DockNode.js";
import { Dialog } from "./Dialog.js";
export declare class DockModel {
    rootNode: DockNode;
    documentManagerNode: DockNode;
    dialogs: Dialog[];
    constructor();
}
