import { DockManager } from "./DockManager.js";
import { SplitterPanel } from "./SplitterPanel.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { ContainerType } from "./ContainerType.js";
import { ISize } from "./interfaces/ISize.js";
import { IDockContainerWithSize } from "./interfaces/IDockContainerWithSize.js";
import { IState } from "./interfaces/IState.js";

export abstract class SplitterDockContainer implements IDockContainerWithSize {
    name: string;
    dockManager: DockManager;
    minimumAllowedChildNodes: number;
    splitterPanel: SplitterPanel;
    stackedVertical: boolean;
    containerElement: HTMLDivElement;
    _cachedWidth: number;
    _cachedHeight: number;
    state: ISize;
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

    performLayout(childContainers: IDockContainer[], relayoutEvenIfEqual : boolean = false) {
        this.splitterPanel.performLayout(childContainers, relayoutEvenIfEqual);
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
    setContainerRatio(container: IDockContainer, ratio: number) {
        this.splitterPanel.setContainerRatio(container, ratio);
        this.resize(this.width, this.height);
    }

    saveState(state: IState) {
        state.width = this.width;
        state.height = this.height;
    }

    loadState(state: IState) {
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