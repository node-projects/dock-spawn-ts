import { FillDockContainer } from "./FillDockContainer.js";
import { TabHostDirection } from "./enums/TabHostDirection.js";
/**
 * The document manager is then central area of the dock layout hierarchy.
 * This is where more important panels are placed (e.g. the text editor in an IDE,
 * 3D view in a modelling package etc
 */
export class DocumentManagerContainer extends FillDockContainer {
    constructor(dockManager, disableDocking = false) {
        super(dockManager, TabHostDirection.TOP);
        this.minimumAllowedChildNodes = 0;
        this.element.classList.add('document-manager');
        this.tabHost.removeTabHandle();
        this.disableDocking = disableDocking;
    }
    saveState(state) {
        super.saveState(state);
        state.documentManager = true;
        state.disableDocking = this.disableDocking;
    }
    /** Returns the selected document tab */
    selectedTab() {
        return this.tabHost.activeTab;
    }
}
//# sourceMappingURL=DocumentManagerContainer.js.map