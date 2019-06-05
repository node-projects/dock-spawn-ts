import { SplitterDockContainer } from "./SplitterDockContainer.js";
import { Utils } from "./Utils.js";
import { ContainerType } from "./ContainerType.js";

export class VerticalDockContainer extends SplitterDockContainer {
    
    stackedVertical: boolean;

    constructor(dockManager, childContainers) {
        super(Utils.getNextId('vertical_splitter_'), dockManager, childContainers)
        this.stackedVertical = true;
        this.containerType = ContainerType.vertical;
    }
}