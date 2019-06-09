import { DockManager } from "./DockManager.js";
import { ContainerType } from "./ContainerType.js";
import { TabHost } from "./TabHost.js";
import { TabHostDirection } from "./enums/TabHostDirection.js";
import { ISize } from "./interfaces/ISize.js";
import { IDockContainerWithSize } from "./interfaces/IDockContainerWithSize.js";
import { IState } from "./interfaces/IState.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
export declare class FillDockContainer implements IDockContainerWithSize {
    dockManager: DockManager;
    tabOrientation: TabHostDirection;
    name: string;
    element: HTMLDivElement;
    containerElement: HTMLDivElement;
    containerType: ContainerType;
    minimumAllowedChildNodes: number;
    tabHost: TabHost;
    tabHostListener: {
        onChange: (e: any) => void;
    };
    state: ISize;
    constructor(dockManager: DockManager, tabStripDirection?: TabHostDirection);
    setActiveChild(child: IDockContainer): void;
    resize(width: number, height: number): void;
    performLayout(children: IDockContainer[]): void;
    destroy(): void;
    saveState(state: IState): void;
    loadState(state: IState): void;
    width: number;
    height: number;
}
