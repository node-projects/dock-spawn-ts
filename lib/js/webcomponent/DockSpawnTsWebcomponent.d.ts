import { DockManager } from "../DockManager.js";
import { PanelContainer } from "../PanelContainer.js";
import { PanelType } from "../enums/PanelType.js";
import { DockNode } from "../DockNode.js";
export declare class DockSpawnTsWebcomponent extends HTMLElement {
    dockManager: DockManager;
    private slotId;
    private windowResizedBound;
    private slotElementMap;
    private observer;
    private initialized;
    private elementContainerMap;
    constructor();
    private initDockspawn;
    getElementInSlot(slot: HTMLSlotElement): HTMLElement;
    private handleAddedChildNode;
    private handleRemovedChildNode;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private windowResized;
    resize(): void;
    getDockNodeForElement(elementOrContainer: HTMLElement | PanelContainer): DockNode;
    dockFill(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, title?: string, hideCloseButton?: boolean): void;
    dockLeft(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string, hideCloseButton?: boolean): void;
    dockRight(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string, hideCloseButton?: boolean): void;
    dockUp(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string, hideCloseButton?: boolean): void;
    dockDown(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string, hideCloseButton?: boolean): void;
    floatDialog(element: HTMLElement, x: number, y: number, width: number, height: number, panelType?: PanelType, title?: string, hideCloseButton?: boolean): void;
}
