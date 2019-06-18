import { PanelContainer } from "../PanelContainer.js";
import { PanelType } from "../enums/PanelType.js";
import { DockNode } from "../DockNode.js";
export declare class DockSpawnTsWebcomponent extends HTMLElement {
    static cssRootDirectory: string;
    private dockManager;
    private slotId;
    private windowResizedBound;
    private slotElementMap;
    private observer;
    constructor();
    private handleAddedChildNode;
    private handleRemovedChildNode;
    connectedCallback(): void;
    disconnectedCallback(): void;
    private windowResized;
    resize(): void;
    getDockNodeForElement(elementOrContainer: HTMLElement | PanelContainer): DockNode;
    dockFill(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, title?: string): void;
    dockLeft(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string): void;
    dockRight(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string): void;
    dockUp(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string): void;
    dockDown(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string): void;
}
