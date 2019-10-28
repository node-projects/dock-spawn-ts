import { DockManager } from "./DockManager.js";
import { DockNode } from "./DockNode.js";
import { HorizontalDockContainer } from "./HorizontalDockContainer.js";
import { VerticalDockContainer } from "./VerticalDockContainer.js";
import { FillDockContainer } from "./FillDockContainer.js";
import { IRectangle } from "./interfaces/IRectangle.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { TabHandle } from "./TabHandle.js";
export declare class DockLayoutEngine {
    dockManager: DockManager;
    constructor(dockManager: DockManager);
    /** docks the [newNode] to the left of [referenceNode] */
    dockLeft(referenceNode: DockNode, newNode: DockNode): void;
    /** docks the [newNode] to the right of [referenceNode] */
    dockRight(referenceNode: DockNode, newNode: DockNode): void;
    /** docks the [newNode] to the top of [referenceNode] */
    dockUp(referenceNode: DockNode, newNode: DockNode): void;
    /** docks the [newNode] to the bottom of [referenceNode] */
    dockDown(referenceNode: DockNode, newNode: DockNode): void;
    /** docks the [newNode] by creating a new tab inside [referenceNode] */
    dockFill(referenceNode: DockNode, newNode: DockNode): void;
    undock(node: DockNode): void;
    close(node: DockNode): void;
    reorderTabs(node: DockNode, handle: TabHandle, state: string, index: number): void;
    _performDock(referenceNode: DockNode, newNode: DockNode, direction: string, insertBeforeReference: boolean): void;
    _forceResizeCompositeContainer: (container: IDockContainer) => void;
    _createDockContainer(containerType: string, newNode: DockNode, referenceNode: DockNode): FillDockContainer | HorizontalDockContainer | VerticalDockContainer;
    /**
     * Gets the bounds of the new node if it were to dock with the specified configuration
     * The state is not modified in this function.  It is used for showing a preview of where
     * the panel would be docked when hovered over a dock wheel button
     */
    getDockBounds(referenceNode: DockNode, containerToDock: IDockContainer, direction: string, insertBeforeReference: boolean): IRectangle;
    _getVaringDimension(container: IDockContainer, direction: string): number;
}
