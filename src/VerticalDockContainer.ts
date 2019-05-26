import { SplitterDockContainer } from "./SplitterDockContainer";
import { Utils } from "./Utils";

export class VerticalDockContainer extends SplitterDockContainer {
    
    stackedVertical: boolean;

    constructor(dockManager, childContainers) {
        super(Utils.getNextId('vertical_splitter_'), dockManager, childContainers)
        this.stackedVertical = true;
        this.containerType = 'vertical';
    }
}