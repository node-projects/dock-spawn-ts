import { DockModel } from "./DockModel.js";
import { DocumentManagerContainer } from "./DocumentManagerContainer.js";
export class DockManagerContext {
    dockManager;
    model;
    documentManagerView;
    constructor(dockManager) {
        this.dockManager = dockManager;
        this.model = new DockModel();
        this.documentManagerView = new DocumentManagerContainer(this.dockManager);
    }
}
//# sourceMappingURL=DockManagerContext.js.map