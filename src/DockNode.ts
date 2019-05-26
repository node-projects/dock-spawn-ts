import { IDockContainer } from "./IDockContainer";

export class DockNode {

    parent: DockNode;
    container: IDockContainer;
    children: DockNode[];

    constructor(container) {
        /** The dock container represented by this node */
        this.container = container;
        this.children = [];
    }

    detachFromParent() {
        if (this.parent) {
            this.parent.removeChild(this);
            delete this.parent;
        }
    }

    removeChild(childNode) {
        var index = this.children.indexOf(childNode);
        if (index >= 0)
            this.children.splice(index, 1);
    }

    addChild(childNode: DockNode) {
        childNode.detachFromParent();
        childNode.parent = this;
        this.children.push(childNode);
    }

    addChildBefore(referenceNode: DockNode, childNode: DockNode) {
        this._addChildWithDirection(referenceNode, childNode, true);
    }

    addChildAfter(referenceNode: DockNode, childNode: DockNode) {
        this._addChildWithDirection(referenceNode, childNode, false);
    }

    _addChildWithDirection(referenceNode: DockNode, childNode: DockNode, before: boolean) {
        // Detach this node from it's parent first
        childNode.detachFromParent();
        childNode.parent = this;

        var referenceIndex = this.children.indexOf(referenceNode);
        var preList = this.children.slice(0, referenceIndex);
        var postList = this.children.slice(referenceIndex + 1, this.children.length);

        this.children = preList.slice(0);
        if (before) {
            this.children.push(childNode);
            this.children.push(referenceNode);
        }
        else {
            this.children.push(referenceNode);
            this.children.push(childNode);
        }
        Array.prototype.push.apply(this.children, postList);
    }

    performLayout() {
        var childContainers = this.children.map((childNode) => { return childNode.container; });
        this.container.performLayout(childContainers);
    }

    debugDumpTree(indent) {
        if (indent === undefined)
            indent = 0;

        let message = this.container.name;
        for (let i = 0; i < indent; i++)
            message = '\t' + message;

        let parentType = this.parent === undefined ? 'null' : this.parent.container.containerType;
        console.log('>>' + message + ' [' + parentType + ']');

        this.children.forEach((childNode) => { childNode.debugDumpTree(indent + 1); });
    }
}