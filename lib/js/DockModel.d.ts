import { DockNode } from "./DockNode.js";
import { Dialog } from "./Dialog.js";
import { AutoHidePanel, DockRestoreState } from './AutoHideManager.js';
export declare class DockModel {
    rootNode: DockNode;
    documentManagerNode: DockNode;
    dialogs: Dialog[];
    autoHidePanels: AutoHidePanel[];
    autoHideLayout?: Record<string, DockRestoreState>;
    constructor();
}
