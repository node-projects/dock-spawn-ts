import { DockModel } from "./DockModel.js";
import { DockManager } from "./DockManager.js";
import { DocumentManagerContainer } from "./DocumentManagerContainer.js";

export class DockManagerContext {

    dockManager: DockManager;
    model: DockModel;
    documentManagerView: DocumentManagerContainer;
    
    constructor(dockManager : DockManager) {
        this.dockManager = dockManager;
        this.model = new DockModel();
        this.documentManagerView = new DocumentManagerContainer(this.dockManager);
    }
}