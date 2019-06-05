import { DockManager } from "./DockManager.js";
import { SplitterPanel } from "./SplitterPanel.js";
import { IDockContainer } from "./IDockContainer.js";
import { ContainerType } from "./ContainerType.js";

export abstract class SplitterDockContainer {
    name: string;
    dockManager: DockManager;
    minimumAllowedChildNodes: number;
    splitterPanel: SplitterPanel;
    stackedVertical: boolean;
    containerElement: HTMLDivElement;
    _cachedWidth: number;
    _cachedHeight: number;
    state: { width: any; height: any; };
    containerType: ContainerType;
    
    constructor(name: string, dockManager: DockManager, childContainers: IDockContainer[], stackedVertical : boolean) {
        // for prototype inheritance purposes only
        if (arguments.length === 0) {
            return;
        }

        this.name = name;
        this.dockManager = dockManager;
        this.stackedVertical = stackedVertical;
        this.splitterPanel = new SplitterPanel(childContainers, this.stackedVertical);
        this.containerElement = this.splitterPanel.panelElement;
        this.minimumAllowedChildNodes = 2;
    }

    resize(width:number, height:number) {
        //    if (_cachedWidth === _cachedWidth && _cachedHeight === _height) {
        //      // No need to resize
        //      return;
        //    }
        this.splitterPanel.resize(width, height);
        this._cachedWidth = width;
        this._cachedHeight = height;
    }

    performLayout(childContainers) {
        this.splitterPanel.performLayout(childContainers);
    }

    setActiveChild(/*child*/) {
    }

    destroy() {
        this.splitterPanel.destroy();
    }

    /**
     * Sets the percentage of space the specified [container] takes in the split panel
     * The percentage is specified in [ratio] and is between 0..1
     */
    setContainerRatio(container, ratio) {
        this.splitterPanel.setContainerRatio(container, ratio);
        this.resize(this.width, this.height);
    }

    saveState(state) {
        state.width = this.width;
        state.height = this.height;
    }

    loadState(state) {
        this.state = { width: state.width, height: state.height };
        // this.resize(state.width, state.height);
    }

    get width(): number {
        if (this._cachedWidth === undefined)
            this._cachedWidth = this.splitterPanel.panelElement.clientWidth;
        return this._cachedWidth;
    }

    get height(): number {
        if (this._cachedHeight === undefined)
            this._cachedHeight = this.splitterPanel.panelElement.clientHeight;
        return this._cachedHeight;
    }
}