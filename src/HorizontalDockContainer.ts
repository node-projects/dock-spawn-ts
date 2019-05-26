import { SplitterDockContainer } from "./SplitterDockContainer";
import { Utils } from "./Utils";
import { DockManager } from "./DockManager";
import { ContainerType } from "./ContainerType";

export class HorizontalDockContainer extends SplitterDockContainer {

    stackedVertical: boolean;
    containerType: ContainerType;

    constructor(dockManager: DockManager, childContainers) {
        super(Utils.getNextId('horizontal_splitter_'), dockManager, childContainers)
        
        this.stackedVertical = false;
        SplitterDockContainer.call(this, Utils.getNextId('horizontal_splitter_'), dockManager, childContainers);
        this.containerType = ContainerType.horizontal;
    }
}