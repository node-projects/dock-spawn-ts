import { DockWheel } from "./DockWheel.js";
import { Point } from "./Point.js";
import { DockManagerContext } from "./DockManagerContext.js";
import { DockNode } from "./DockNode.js";
import { DockLayoutEngine } from "./DockLayoutEngine.js";
import { EventHandler } from "./EventHandler.js";
import { Dialog } from "./Dialog.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { TabPage } from "./TabPage.js";
import { PanelContainer } from "./PanelContainer.js";
import { ILayoutEventListener } from "./interfaces/ILayoutEventListener.js";
import { DockModel } from "./DockModel.js";
import { DockConfig } from "./DockConfig.js";
/**
 * Dock manager manages all the dock panels in a hierarchy, similar to visual studio.
 * It owns a Html Div element inside which all panels are docked
 * Initially the document manager takes up the central space and acts as the root node
 */
export declare class DockManager {
    element: HTMLElement;
    context: DockManagerContext;
    dockWheel: DockWheel;
    layoutEngine: DockLayoutEngine;
    mouseMoveHandler: EventHandler;
    touchMoveHandler: EventHandler;
    layoutEventListeners: ILayoutEventListener[];
    defaultDialogPosition: Point;
    backgroundContext: HTMLElement;
    zIndexCounter: number;
    zIndexTabHost: number;
    zIndexTabHandle: number;
    zIndexDialogCounter: number;
    onKeyPressBound: any;
    iframes: HTMLIFrameElement[];
    _undockEnabled: boolean;
    private _config;
    private _activePanel;
    constructor(element: HTMLElement, config?: DockConfig);
    readonly config: DockConfig;
    initialize(): void;
    onKeyPress(e: KeyboardEvent): void;
    checkXBounds(container: HTMLElement, currentMousePosition: Point, previousMousePosition: Point, resizeWest: boolean, resizeEast: boolean): number;
    checkXBoundsWithinDockContainer(container: HTMLElement, currentMousePosition: Point, previousMousePosition: Point, resizeWest: boolean, resizeEast: boolean): number;
    checkYBounds(container: HTMLElement, currentMousePosition: Point, previousMousePosition: Point, resizeNorth: boolean, resizeSouth: boolean): number;
    checkYBoundsWithinDockContainer(container: HTMLElement, currentMousePosition: Point, previousMousePosition: Point, resizeNorth: boolean, resizeSouth: boolean): number;
    rebuildLayout(node: DockNode): void;
    invalidate(): void;
    resize(width: number, height: number): void;
    /**
     * Reset the dock model . This happens when the state is loaded from json
     */
    setModel(model: DockModel): void;
    loadResize(node: DockNode): void;
    setRootNode(node: DockNode): void;
    _onDialogDragStarted(sender: Dialog, e: any): void;
    _onDialogDragEnded(sender: Dialog, e: any): void;
    private _onMouseMoved;
    /**
     * Perform a DFS (DeepFirstSearch) on the dock model's tree to find the
     * deepest level panel (i.e. the top-most non-overlapping panel)
     * that is under the mouse cursor
     * Retuns null if no node is found under this point
     */
    private _findNodeOnPoint;
    /** Dock the [dialog] to the left of the [referenceNode] node */
    dockDialogLeft(referenceNode: DockNode, dialog: Dialog): DockNode;
    /** Dock the [dialog] to the right of the [referenceNode] node */
    dockDialogRight(referenceNode: DockNode, dialog: Dialog): DockNode;
    /** Dock the [dialog] above the [referenceNode] node */
    dockDialogUp(referenceNode: DockNode, dialog: Dialog): DockNode;
    /** Dock the [dialog] below the [referenceNode] node */
    dockDialogDown(referenceNode: DockNode, dialog: Dialog): DockNode;
    /** Dock the [dialog] as a tab inside the [referenceNode] node */
    dockDialogFill(referenceNode: DockNode, dialog: Dialog): DockNode;
    /** Dock the [container] to the left of the [referenceNode] node */
    dockLeft(referenceNode: DockNode, container: PanelContainer, ratio: number): DockNode;
    /** Dock the [container] to the right of the [referenceNode] node */
    dockRight(referenceNode: DockNode, container: PanelContainer, ratio: number): DockNode;
    /** Dock the [container] above the [referenceNode] node */
    dockUp(referenceNode: DockNode, container: PanelContainer, ratio: number): DockNode;
    /** Dock the [container] below the [referenceNode] node */
    dockDown(referenceNode: DockNode, container: PanelContainer, ratio: number): DockNode;
    /** Dock the [container] as a tab inside the [referenceNode] node */
    dockFill(referenceNode: DockNode, container: PanelContainer): DockNode;
    floatDialog(container: PanelContainer, x: number, y: number): any;
    private _requestDockDialog;
    private _checkShowBackgroundContext;
    private _requestDockContainer;
    _requestTabReorder(container: IDockContainer, e: any): void;
    /**
     * Undocks a panel and converts it into a floating dialog window
     * It is assumed that only leaf nodes (panels) can be undocked
     */
    requestUndockToDialog(container: PanelContainer, event: any, dragOffset: Point): Dialog;
    /**
    * closes a Panel
    */
    requestClose(container: PanelContainer): void;
    /**
     * Opens a Element in a Dialog
     * It is assumed that only leaf nodes (panels) can be undocked
     */
    openInDialog(container: PanelContainer, event: any, dragOffset: Point): Dialog;
    /** Undocks a panel and converts it into a floating dialog window
     * It is assumed that only leaf nodes (panels) can be undocked
     */
    requestUndock(container: PanelContainer): void;
    /**
     * Removes a dock container from the dock layout hierarcy
     * Returns the node that was removed from the dock tree
     */
    requestRemove(container: PanelContainer): DockNode;
    /** Finds the node that owns the specified [container] */
    private _findNodeFromContainer;
    findNodeFromContainerElement(containerElement: HTMLElement): DockNode;
    addLayoutListener(listener: ILayoutEventListener): void;
    removeLayoutListener(listener: ILayoutEventListener): void;
    suspendLayout(panel: IDockContainer): void;
    resumeLayout(panel: IDockContainer): void;
    notifyOnDock(dockNode: DockNode): void;
    notifyOnTabsReorder(dockNode: DockNode): void;
    notifyOnUnDock(dockNode: DockNode): void;
    notifyOnClosePanel(panel: PanelContainer): void;
    notifyOnCreateDialog(dialog: Dialog): void;
    notifyOnHideDialog(dialog: Dialog): void;
    notifyOnShowDialog(dialog: Dialog): void;
    notifyOnChangeDialogPosition(dialog: Dialog, x: number, y: number): void;
    notifyOnContainerResized(dockContainer: IDockContainer): void;
    notifyOnTabChange(tabpage: TabPage): void;
    notifyOnActivePanelChange(panel: PanelContainer): void;
    saveState(): string;
    loadState(json: string): void;
    getPanels(): PanelContainer[];
    undockEnabled(state: boolean): void;
    lockDockState(state: boolean): void;
    hideCloseButton(state: boolean): void;
    updatePanels(ids: string[]): PanelContainer[];
    getVisiblePanels(): PanelContainer[];
    _allPanels(node: DockNode, panels: PanelContainer[]): void;
    activePanel: PanelContainer;
}
