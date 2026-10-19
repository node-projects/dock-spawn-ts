import { ContainerType } from "../ContainerType.js";
import { DockManager } from "../DockManager.js";
import { IState } from "./IState.js";
import { TabPage } from '../TabPage.js';
import { ISize } from './ISize.js';

export interface ResizeContext {
    /** Sizes at the start of a splitter drag, retained across pointer movements. */
    proportionalSizes: WeakMap<IDockContainer, ISize>;
}

export interface IDockContainer {
    readonly dockManager: DockManager;
    /**
     * Resolves when this container and its descendants have finished resizing.
     * Splitter drags request proportional resizing of nested groups instead of preserving tool sizes.
     */
    resize(_width: number, _height: number, context?: ResizeContext): Promise<void>;
    performLayout(children: IDockContainer[], relayoutEvenIfEqual : boolean): void;
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
