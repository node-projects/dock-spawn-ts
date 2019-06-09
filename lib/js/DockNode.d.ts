import { IDockContainer } from "./interfaces/IDockContainer.js";
export declare class DockNode {
    parent: DockNode;
    container: IDockContainer;
    children: DockNode[];
    constructor(container: IDockContainer);
    detachFromParent(): void;
    removeChild(childNode: DockNode): void;
    addChild(childNode: DockNode): void;
    addChildBefore(referenceNode: DockNode, childNode: DockNode): void;
    addChildAfter(referenceNode: DockNode, childNode: DockNode): void;
    _addChildWithDirection(referenceNode: DockNode, childNode: DockNode, before: boolean): void;
    performLayout(relayoutEvenIfEqual: boolean): void;
    debugDumpTree(indent: number): void;
}
