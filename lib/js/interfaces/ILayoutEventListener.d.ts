import { DockManager } from "../DockManager.js";
import { DockNode } from "../DockNode.js";
import { Dialog } from "../Dialog.js";
import { TabPage } from "../TabPage.js";
import { IDockContainer } from "./IDockContainer.js";
import { PanelContainer } from "../PanelContainer.js";
export interface ILayoutEventListener {
    onDock?(dockManager: DockManager, dockNode: DockNode): void;
    onTabsReorder?(dockManager: DockManager, dockNode: DockNode): void;
    onUndock?(dockManager: DockManager, dockNode: DockNode): void;
    onClosePanel?(dockManager: DockManager, panel: PanelContainer): void;
    onCreateDialog?(dockManager: DockManager, dialog: Dialog): void;
    onHideDialog?(dockManager: DockManager, dialog: Dialog): void;
    onShowDialog?(dockManager: DockManager, dialog: Dialog): void;
    onChangeDialogPosition?(dockManager: DockManager, dialog: Dialog, x: number, y: number): void;
    onContainerResized?(dockManager: DockManager, dockContainer: IDockContainer): void;
    onTabChanged?(dockManager: DockManager, tabpage: TabPage): void;
    onActivePanelChange?(dockManager: DockManager, panel: PanelContainer): void;
    /**
    * The Dock Manager notifies the listeners of layout changes so client containers that have
    * costly layout structures can detach and reattach themself to avoid reflow
    */
    onSuspendLayout?(dockManager: DockManager, panel: IDockContainer): void;
    onResumeLayout?(dockManager: DockManager, panel: IDockContainer): void;
}
