import { FillDockContainer } from "./FillDockContainer.js";
import { DockManager } from "./DockManager.js";
import { TabHostDirection } from "./enums/TabHostDirection.js";
import { IState } from "./interfaces/IState.js";

/**
 * The document manager is then central area of the dock layout hierarchy.
 * This is where more important panels are placed (e.g. the text editor in an IDE,
 * 3D view in a modelling package etc
 */

export class DocumentManagerContainer extends FillDockContainer {

    minimumAllowedChildNodes: number;
    disableDocking?: boolean;

    constructor(dockManager: DockManager, disableDocking: boolean = false) {
        super(dockManager, TabHostDirection.TOP);

        this.minimumAllowedChildNodes = 0;
        this.element.classList.add('document-manager');
        this.tabHost.removeTabHandle();
        this.disableDocking = disableDocking;
    }

    saveState(state: IState) {
        super.saveState(state);
        state.documentManager = true;
        state.disableDocking = this.disableDocking;
    }

    /** Returns the selected document tab */
    selectedTab() {
        return this.tabHost.activeTab;
    }
}
