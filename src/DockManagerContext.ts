import { DockModel } from "./DockModel";
import { DockManager } from "./DockManager";
import { DocumentManagerContainer } from "./DocumentManagerContainer";

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