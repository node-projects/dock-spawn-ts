import { DockModel } from "./DockModel.js";
import { DocumentManagerContainer } from "./DocumentManagerContainer.js";
export class DockManagerContext {
    constructor(dockManager) {
        this.dockManager = dockManager;
        this.model = new DockModel();
        // TODO Make disabled docking configurable
        this.documentManagerView = new DocumentManagerContainer(this.dockManager, true);
    }
}
//# sourceMappingURL=DockManagerContext.js.map