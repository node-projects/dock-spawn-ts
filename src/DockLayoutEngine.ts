import { DockManager } from "./DockManager.js";
import { DockNode } from "./DockNode.js";
import { Utils } from "./Utils.js";
import { HorizontalDockContainer } from "./HorizontalDockContainer.js";
import { VerticalDockContainer } from "./VerticalDockContainer.js";
import { FillDockContainer } from "./FillDockContainer.js";
import { IRectangle } from "./interfaces/IRectangle.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { TabHandle } from "./TabHandle.js";
import { TabHostDirection } from "./enums/TabHostDirection";

export class DockLayoutEngine {

    dockManager: DockManager;

    constructor(dockManager: DockManager) {
        this.dockManager = dockManager;
    }

    /** docks the [newNode] to the left of [referenceNode] */
    dockLeft(referenceNode: DockNode, newNode: DockNode) {
        this._performDock(referenceNode, newNode, 'horizontal', true);
    }

    /** docks the [newNode] to the right of [referenceNode] */
    dockRight(referenceNode: DockNode, newNode: DockNode) {
        this._performDock(referenceNode, newNode, 'horizontal', false);
    }

    /** docks the [newNode] to the top of [referenceNode] */
    dockUp(referenceNode: DockNode, newNode: DockNode) {
        this._performDock(referenceNode, newNode, 'vertical', true);
    }

    /** docks the [newNode] to the bottom of [referenceNode] */
    dockDown(referenceNode: DockNode, newNode: DockNode) {
        this._performDock(referenceNode, newNode, 'vertical', false);
    }

    /** docks the [newNode] by creating a new tab inside [referenceNode] */
    dockFill(referenceNode: DockNode, newNode: DockNode) {
        this._performDock(referenceNode, newNode, 'fill', false);
    }

    undock(node: DockNode) {
        let parentNode = node.parent;
        if (!parentNode)
            throw new Error('Cannot undock.  panel is not a leaf node');

        // Get the position of the node relative to it's siblings
        let siblingIndex = parentNode.children.indexOf(node);

        // Detach the node from the dock manager's tree hierarchy
        node.detachFromParent();

        // Fix the node's parent hierarchy
        if (parentNode.children.length < parentNode.container.minimumAllowedChildNodes) {
            // If the child count falls below the minimum threshold, destroy the parent and merge
            // the children with their grandparents

            let grandParent = parentNode.parent;
            for (let i = 0; i < parentNode.children.length; i++) {
                let otherChild = parentNode.children[i];
                if (grandParent) {
                    // parent node is not a root node
                    grandParent.addChildAfter(parentNode, otherChild);
                    parentNode.detachFromParent();
                    let width = parentNode.container.containerElement.clientWidth;
                    let height = parentNode.container.containerElement.clientHeight;

                    otherChild.container.resize(width, height);
                    parentNode.container.destroy();
                    if (parentNode.container instanceof FillDockContainer) {
                        parentNode.container.performLayout([]);
                    }
                    grandParent.performLayout(false);
                }
                else {
                    // Parent is a root node.
                    // Make the other child the root node
                    parentNode.detachFromParent();
                    parentNode.container.destroy();
                    this.dockManager.setRootNode(otherChild);
                }
            }

        }
        else {
            // the node to be removed has 2 or more other siblings. So it is safe to continue
            // using the parent composite container.
            parentNode.performLayout(false);

            // Set the next sibling as the active child (e.g. for a Tab host, it would select it as the active tab)
            if (parentNode.children.length > 0) {
                let nextActiveSibling = parentNode.children[Math.max(0, siblingIndex - 1)];
                parentNode.container.setActiveChild(nextActiveSibling.container);
            }
        }
        this.dockManager.invalidate();

        this.dockManager.notifyOnUnDock(node);
    }

    close(node: DockNode) {
        let parentNode = node.parent;
        if (!parentNode)
            throw new Error('Cannot undock.  panel is not a leaf node');

        //check if closed tab was the active one
        let activetabClosed = false;
        if (parentNode.children.length > 0) {
            if ((<FillDockContainer>parentNode.container).tabHost != null) {
                let activeTab = (<FillDockContainer>parentNode.container).tabHost.getActiveTab();
                activetabClosed = activeTab.container == node.container;
            }
        }

        // Get the position of the node relative to it's siblings
        let siblingIndex = parentNode.children.indexOf(node);

        // Detach the node from the dock manager's tree hierarchy
        node.detachFromParent();

        if (parentNode.children.length < parentNode.container.minimumAllowedChildNodes) {
            // If the child count falls below the minimum threshold, destroy the parent and merge
            // the children with their grandparents
            let grandParent = parentNode.parent;
            for (let i = 0; i < parentNode.children.length; i++) {
                let otherChild = parentNode.children[i];
                if (grandParent) {
                    // parent node is not a root node
                    grandParent.addChildAfter(parentNode, otherChild);
                    parentNode.detachFromParent();
                    let width = parentNode.container.containerElement.clientWidth;
                    let height = parentNode.container.containerElement.clientHeight;
                    otherChild.container.resize(width, height);
                    parentNode.container.destroy();
                    if (parentNode.container instanceof FillDockContainer) {
                        parentNode.container.performLayout([]);
                    }
                    grandParent.performLayout(false);
                } else {
                    // Parent is a root node.
                    // Make the other child the root node
                    parentNode.detachFromParent();
                    parentNode.container.destroy();
                    this.dockManager.setRootNode(otherChild);
                }
            }
        } else {
            // the node to be removed has 2 or more other siblings. So it is safe to continue
            // using the parent composite container.
            parentNode.performLayout(false);

            if (activetabClosed) {
                let nextActiveSibling = parentNode.children[Math.max(0, siblingIndex - 1)];
                if (nextActiveSibling != null)
                    parentNode.container.setActiveChild(nextActiveSibling.container);
            }
        }
        this.dockManager.invalidate();

        this.dockManager.notifyOnUnDock(node);
    }

    reorderTabs(node: DockNode, handle: TabHandle, state: string, index: number) {
        let N = node.children.length;
        let nodeIndexToDelete = state === 'left' ? index : index + 1;
        if (state == 'right' && nodeIndexToDelete >= node.children.length)
            return;
        if (state == 'left' && nodeIndexToDelete == 0)
            return;

        let indexes = Array.apply(null, { length: N }).map(Number.call, Number);
        let indexValue = indexes.splice(nodeIndexToDelete, 1)[0]; //remove element
        indexes.splice(state === 'left' ? index - 1 : index, 0, indexValue); //insert

        node.children = Utils.orderByIndexes(node.children, indexes); //apply
        (<FillDockContainer>node.container).tabHost.performTabsLayout(indexes);
        this.dockManager.notifyOnTabsReorder(node);
    }

    _performDock(referenceNode: DockNode, newNode: DockNode, direction: string, insertBeforeReference: boolean) {
        if (referenceNode.parent && referenceNode.parent.container.containerType === 'fill')
            referenceNode = referenceNode.parent;

        if (direction === 'fill' && referenceNode.container.containerType === 'fill') {
            referenceNode.addChild(newNode);
            referenceNode.performLayout(false);
            referenceNode.container.setActiveChild(newNode.container);
            this.dockManager.invalidate();
            this.dockManager.notifyOnDock(newNode);
            return;
        }

        // Check if reference node is root node
        let model = this.dockManager.context.model,
            compositeContainer: IDockContainer,
            compositeNode: DockNode,
            referenceParent: DockNode;

        if (referenceNode === model.rootNode) {
            if (insertBeforeReference) {
                compositeContainer = this._createDockContainer(direction, newNode, referenceNode);
                compositeNode = new DockNode(compositeContainer);
                compositeNode.addChild(newNode);
                compositeNode.addChild(referenceNode);
            }
            else {
                compositeContainer = this._createDockContainer(direction, referenceNode, newNode);
                compositeNode = new DockNode(compositeContainer);
                compositeNode.addChild(referenceNode);
                compositeNode.addChild(newNode);
            }

            // Attach the root node to the dock manager's DOM
            this.dockManager.setRootNode(compositeNode);
            this.dockManager.rebuildLayout(this.dockManager.context.model.rootNode);
            compositeNode.container.setActiveChild(newNode.container);
            this.dockManager.invalidate();
            this.dockManager.notifyOnDock(newNode);
            return;
        }

        if (referenceNode.parent.container.containerType !== direction) {
            referenceParent = referenceNode.parent;

            // Get the dimensions of the reference node, for resizing later on
            let referenceNodeWidth = referenceNode.container.containerElement.clientWidth;
            let referenceNodeHeight = referenceNode.container.containerElement.clientHeight;

            // Get the dimensions of the reference node, for resizing later on
            let referenceNodeParentWidth = referenceParent.container.containerElement.clientWidth;
            let referenceNodeParentHeight = referenceParent.container.containerElement.clientHeight;

            // Replace the reference node with a new composite node with the reference and new node as it's children
            compositeContainer = this._createDockContainer(direction, newNode, referenceNode);
            compositeNode = new DockNode(compositeContainer);

            referenceParent.addChildAfter(referenceNode, compositeNode);
            referenceNode.detachFromParent();
            Utils.removeNode(referenceNode.container.containerElement);

            if (insertBeforeReference) {
                compositeNode.addChild(newNode);
                compositeNode.addChild(referenceNode);
            }
            else {
                compositeNode.addChild(referenceNode);
                compositeNode.addChild(newNode);
            }

            referenceParent.performLayout(false);
            compositeNode.performLayout(true);

            compositeNode.container.setActiveChild(newNode.container);
            compositeNode.container.resize(referenceNodeWidth, referenceNodeHeight);
            referenceParent.container.resize(referenceNodeParentWidth, referenceNodeParentHeight);
        }
        else {
            // Add as a sibling, since the parent of the reference node is of the right composite type
            referenceParent = referenceNode.parent;
            if (insertBeforeReference)
                referenceParent.addChildBefore(referenceNode, newNode);
            else
                referenceParent.addChildAfter(referenceNode, newNode);
            referenceParent.performLayout(false);
            referenceParent.container.setActiveChild(newNode.container);
        }

        // force resize the panel
        let containerWidth = newNode.container.containerElement.clientWidth;
        let containerHeight = newNode.container.containerElement.clientHeight;
        newNode.container.resize(containerWidth, containerHeight);

        this.dockManager.invalidate();
        this.dockManager.notifyOnDock(newNode);
    }

    _forceResizeCompositeContainer = (container: IDockContainer) => {
        let width = container.containerElement.clientWidth;
        let height = container.containerElement.clientHeight;
        container.resize(width, height);
    }

    _createDockContainer(containerType: string, newNode: DockNode, referenceNode: DockNode) {
        if (containerType === 'horizontal')
            return new HorizontalDockContainer(this.dockManager, [newNode.container, referenceNode.container]);
        if (containerType === 'vertical')
            return new VerticalDockContainer(this.dockManager, [newNode.container, referenceNode.container]);
        if (containerType === 'fill')
            return new FillDockContainer(this.dockManager, TabHostDirection.TOP);
        throw new Error('Failed to create dock container of type: ' + containerType);
    }


    /**
     * Gets the bounds of the new node if it were to dock with the specified configuration
     * The state is not modified in this function.  It is used for showing a preview of where
     * the panel would be docked when hovered over a dock wheel button
     */
    getDockBounds(referenceNode: DockNode, containerToDock: IDockContainer, direction: string, insertBeforeReference: boolean): IRectangle {
        let compositeNode; // The node that contains the splitter / fill node
        let childCount;
        let childPosition;
        let bounds: IRectangle;

        if (direction === 'fill') {
            // Since this is a fill operation, the highlight bounds is the same as the reference node
            // TODO: Create a tab handle highlight to show that it's going to be docked in a tab
            let targetElement = referenceNode.container.containerElement;
            let outerRect = this.dockManager.element.getBoundingClientRect();
            let targetElementRect = targetElement.getBoundingClientRect();
            return { x: targetElementRect.left - outerRect.left, y: targetElementRect.top - outerRect.top, width: targetElement.clientWidth, height: targetElement.clientHeight };
        }

        if (referenceNode.parent && referenceNode.parent.container.containerType === 'fill')
            // Ignore the fill container's child and move one level up
            referenceNode = referenceNode.parent;

        // Flag to indicate of the renference node was replaced with a new composite node with 2 children
        let hierarchyModified = false;
        if (referenceNode.parent && referenceNode.parent.container.containerType === direction) {
            // The parent already is of the desired composite type.  Will be inserted as sibling to the reference node
            compositeNode = referenceNode.parent;
            childCount = compositeNode.children.length;
            childPosition = compositeNode.children.indexOf(referenceNode) + (insertBeforeReference ? 0 : 1);
        } else {
            // The reference node will be replaced with a new composite node of the desired type with 2 children
            compositeNode = referenceNode;
            childCount = 1;   // The newly inserted composite node will contain the reference node
            childPosition = (insertBeforeReference ? 0 : 1);
            hierarchyModified = true;
        }

        let splitBarSize = 5;  // TODO: Get from DOM
        let targetPanelSize = 0;
        let targetPanelStart = 0;
        if (direction === 'vertical' || direction === 'horizontal') {
            // Existing size of the composite container (without the splitter bars).
            // This will also be the final size of the composite (splitter / fill)
            // container after the new panel has been docked
            let compositeSize = this._getVaringDimension(compositeNode.container, direction) - (childCount - 1) * splitBarSize;

            // size of the newly added panel
            let newPanelOriginalSize = this._getVaringDimension(containerToDock, direction);
            let scaleMultiplier = compositeSize / (compositeSize + newPanelOriginalSize);

            // Size of the panel after it has been docked and scaled
            targetPanelSize = newPanelOriginalSize * scaleMultiplier;
            if (hierarchyModified)
                targetPanelStart = insertBeforeReference ? 0 : compositeSize * scaleMultiplier;
            else {
                for (let i = 0; i < childPosition; i++)
                    targetPanelStart += this._getVaringDimension(compositeNode.children[i].container, direction);
                targetPanelStart *= scaleMultiplier;
            }
        }

        bounds = {};
        let outerRect = this.dockManager.element.getBoundingClientRect();
        let rect = compositeNode.container.containerElement.getBoundingClientRect();
        if (direction === 'vertical') {
            bounds.x = rect.left - outerRect.left;
            bounds.y = rect.top - outerRect.top + targetPanelStart;
            bounds.width = compositeNode.container.width;
            bounds.height = targetPanelSize;
        } else if (direction === 'horizontal') {
            bounds.x = rect.left - outerRect.left + targetPanelStart;
            bounds.y = rect.top - outerRect.top;
            bounds.width = targetPanelSize;
            bounds.height = compositeNode.container.height;
        }

        return bounds;
    }

    _getVaringDimension(container: IDockContainer, direction: string): number {
        if (direction === 'vertical')
            return container.height;
        if (direction === 'horizontal')
            return container.width;
        return 0;
    }
}
