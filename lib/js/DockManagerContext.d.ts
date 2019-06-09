import { DockModel } from "./DockModel.js";
import { DockManager } from "./DockManager.js";
import { DocumentManagerContainer } from "./DocumentManagerContainer.js";
export declare class DockManagerContext {
    dockManager: DockManager;
    model: DockModel;
    documentManagerView: DocumentManagerContainer;
    constructor(dockManager: DockManager);
}
