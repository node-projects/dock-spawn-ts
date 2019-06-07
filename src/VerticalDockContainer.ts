import { SplitterDockContainer } from "./SplitterDockContainer.js";
import { Utils } from "./Utils.js";
import { ContainerType } from "./ContainerType.js";
import { DockManager } from "./DockManager.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";

export class VerticalDockContainer extends SplitterDockContainer {
    
    constructor(dockManager: DockManager, childContainers: IDockContainer[]) {
        super(Utils.getNextId('vertical_splitter_'), dockManager, childContainers, true)
        this.containerType = ContainerType.vertical;
    }
}