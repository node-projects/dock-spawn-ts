import { SplitterDockContainer } from "./SplitterDockContainer.js";
import { Utils } from "./Utils.js";
import { DockManager } from "./DockManager.js";
import { ContainerType } from "./ContainerType.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";

export class HorizontalDockContainer extends SplitterDockContainer {

    constructor(dockManager: DockManager, childContainers: IDockContainer[]) {
        super(Utils.getNextId('horizontal_splitter_'), dockManager, childContainers, false)
        this.containerType = ContainerType.horizontal;
    }
}