import { FillDockContainer } from "./FillDockContainer.js";
import { DockManager } from "./DockManager.js";
import { IState } from "./interfaces/IState.js";
/**
 * The document manager is then central area of the dock layout hierarchy.
 * This is where more important panels are placed (e.g. the text editor in an IDE,
 * 3D view in a modelling package etc
 */
export declare class DocumentManagerContainer extends FillDockContainer {
    minimumAllowedChildNodes: number;
    constructor(dockManager: DockManager);
    private _createDocumentTabPage;
    saveState(state: IState): void;
    /** Returns the selected document tab */
    selectedTab(): import("./TabPage.js").TabPage;
}
