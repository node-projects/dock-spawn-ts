import { ContainerType } from "../ContainerType.js";
import { DockManager } from "../DockManager.js";
import { IState } from "./IState.js";
import { TabPage } from '../TabPage.js';
export interface IDockContainer {
    readonly dockManager: DockManager;
    resize(_width: number, _height: number): void;
    performLayout(children: IDockContainer[], relayoutEvenIfEqual: boolean): void;
    destroy(): void;
    setActiveChild(child: IDockContainer): void;
    saveState(state: IState): void;
    loadState(state: IState): void;
    readonly containerElement: HTMLElement;
    containerType: ContainerType;
    readonly width: number;
    readonly height: number;
    name: string;
    tabPage?: TabPage;
    /**
     * Indicates the minimum allowed child nodes a composite dock panel can have
     * If it's children fall below this value, the composite panel is destroyed
     * and it's children are moved one level up
     */
    readonly minimumAllowedChildNodes: number;
}
