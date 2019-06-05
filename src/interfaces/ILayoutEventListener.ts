import { DockManager } from "../DockManager.js";
import { DockNode } from "../DockNode.js";
import { Dialog } from "../Dialog.js";
import { TabPage } from "../TabPage.js";
import { IDockContainer } from "./IDockContainer.js";

/**
* The Dock Manager notifies the listeners of layout changes so client containers that have
* costly layout structures can detach and reattach themself to avoid reflow
*/
export interface ILayoutEventListener {
    onDock?(dockManager: DockManager, dockNode: DockNode);
    onTabsReorder?(dockManager: DockManager, dockNode: DockNode);
    onUndock?(dockManager: DockManager, dockNode: DockNode);
    onClosePanel?(dockManager: DockManager, dockNode: DockNode);
    onCreateDialog?(dockManager: DockManager, dialog: Dialog);
    onHideDialog?(dockManager: DockManager, dialog: Dialog);
    onShowDialog?(dockManager: DockManager, dialog: Dialog);
    onChangeDialogPosition?(dockManager: DockManager, dialog: Dialog, x: number, y: number);
    onTabChanged?(dockManager: DockManager, tabpage: TabPage);
    onSuspendLayout?(dockManager: DockManager);
    onResumeLayout?(dockManager: DockManager, panel: IDockContainer);
}