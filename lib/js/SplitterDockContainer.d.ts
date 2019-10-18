import { DockManager } from "./DockManager.js";
import { SplitterPanel } from "./SplitterPanel.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { ContainerType } from "./ContainerType.js";
import { ISize } from "./interfaces/ISize.js";
import { IDockContainerWithSize } from "./interfaces/IDockContainerWithSize.js";
import { IState } from "./interfaces/IState.js";
export declare abstract class SplitterDockContainer implements IDockContainerWithSize {
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
    constructor(name: string, dockManager: DockManager, childContainers: IDockContainer[], stackedVertical: boolean);
    resize(width: number, height: number): void;
    performLayout(childContainers: IDockContainer[], relayoutEvenIfEqual?: boolean): void;
    setActiveChild(): void;
    destroy(): void;
    /**
     * Sets the percentage of space the specified [container] takes in the split panel
     * The percentage is specified in [ratio] and is between 0..1
     */
    setContainerRatio(container: IDockContainer, ratio: number): void;
    getRatios(): number[];
    setRatios(ratios: number[]): void;
    saveState(state: IState): void;
    loadState(state: IState): void;
    readonly width: number;
    readonly height: number;
}
