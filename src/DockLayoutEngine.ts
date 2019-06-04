import { DockManager } from "./DockManager";
import { DockNode } from "./DockNode";
import { Utils } from "./Utils";
import { HorizontalDockContainer } from "./HorizontalDockContainer";
import { VerticalDockContainer } from "./VerticalDockContainer";
import { FillDockContainer } from "./FillDockContainer";
import { IRectangle } from "./interfaces/IRectangle";

export class DockLayoutEngine {
    
    dockManager: DockManager;

    constructor(dockManager: DockManager) {
        this.dockManager = dockManager;
    }

    /** docks the [newNode] to the left of [referenceNode] */
    dockLeft(referenceNode, newNode) {
        this._performDock(referenceNode, newNode, 'horizontal', true);
    }

    /** docks the [newNode] to the right of [referenceNode] */
    dockRight(referenceNode, newNode) {
        this._performDock(referenceNode, newNode, 'horizontal', false);
    }

    /** docks the [newNode] to the top of [referenceNode] */
    dockUp(referenceNode, newNode) {
        this._performDock(referenceNode, newNode, 'vertical', true);
    }

    /** docks the [newNode] to the bottom of [referenceNode] */
    dockDown(referenceNode, newNode) {
        this._performDock(referenceNode, newNode, 'vertical', false);
    }

    /** docks the [newNode] by creating a new tab inside [referenceNode] */
    dockFill(referenceNode, newNode) {
        this._performDock(referenceNode, newNode, 'fill', false);
    }

    undock(node) {
        var parentNode = node.parent;
        if (!parentNode)
            throw new Error('Cannot undock.  panel is not a leaf node');

        // Get the position of the node relative to it's siblings
        var siblingIndex = parentNode.children.indexOf(node);

        // Detach the node from the dock manager's tree hierarchy
        node.detachFromParent();

        // Fix the node's parent hierarchy
        if (parentNode.children.length < parentNode.container.minimumAllowedChildNodes) {
            // If the child count falls below the minimum threshold, destroy the parent and merge
            // the children with their grandparents
            var grandParent = parentNode.parent;
            for (var i = 0; i < parentNode.children.length; i++) {
                var otherChild = parentNode.children[i];
                if (grandParent) {
                    // parent node is not a root node
                    grandParent.addChildAfter(parentNode, otherChild);
                    parentNode.detachFromParent();
                    var width = parentNode.container.containerElement.clientWidth;
                    var height = parentNode.container.containerElement.clientHeight;
                    parentNode.container.destroy();

                    otherChild.container.resize(width, height);
                    grandParent.performLayout();
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
            parentNode.performLayout();

            // Set the next sibling as the active child (e.g. for a Tab host, it would select it as the active tab)
            if (parentNode.children.length > 0) {
                var nextActiveSibling = parentNode.children[Math.max(0, siblingIndex - 1)];
                parentNode.container.setActiveChild(nextActiveSibling.container);
            }
        }
        this.dockManager.invalidate();

        this.dockManager.notifyOnUnDock(node);
    }

    close(node) {
        var parentNode = node.parent;
        if (!parentNode)
            throw new Error('Cannot undock.  panel is not a leaf node');

        //check if closed tab wa sthe active one
        var activetabClosed = false;
        if (parentNode.children.length > 0) {
            if (parentNode.container.tabHost != null) {
                var activeTab = parentNode.container.tabHost.getActiveTab();
                activetabClosed = activeTab.panel == node.container;
            }
        }

        // Get the position of the node relative to it's siblings
        var siblingIndex = parentNode.children.indexOf(node);

        // Detach the node from the dock manager's tree hierarchy
        node.detachFromParent();

        if (parentNode.children.length < parentNode.container.minimumAllowedChildNodes) {
            // If the child count falls below the minimum threshold, destroy the parent and merge
            // the children with their grandparents
            var grandParent = parentNode.parent;
            for (var i = 0; i < parentNode.children.length; i++) {
                var otherChild = parentNode.children[i];
                if (grandParent) {
                    // parent node is not a root node
                    grandParent.addChildAfter(parentNode, otherChild);
                    parentNode.detachFromParent();
                    var width = parentNode.container.containerElement.clientWidth;
                    var height = parentNode.container.containerElement.clientHeight;
                    parentNode.container.destroy();

                    otherChild.container.resize(width, height);
                    grandParent.performLayout();
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
            parentNode.performLayout();

            if (activetabClosed) {
                var nextActiveSibling = parentNode.children[Math.max(0, siblingIndex - 1)];
                if (nextActiveSibling != null)
                    parentNode.container.setActiveChild(nextActiveSibling.container);
            }
        }
        this.dockManager.invalidate();

        this.dockManager.notifyOnUnDock(node);
    }

    reorderTabs(node, handle, state, index) {
        var N = node.children.length;
        var nodeIndexToDelete = state === 'left' ? index : index + 1;
        if (state == 'right' && nodeIndexToDelete >= node.children.length)
            return;
        if (state == 'left' && nodeIndexToDelete == 0)
            return;

        var indexes = Array.apply(null, { length: N }).map(Number.call, Number);
        var indexValue = indexes.splice(nodeIndexToDelete, 1)[0]; //remove element
        indexes.splice(state === 'left' ? index - 1 : index, 0, indexValue); //insert

        node.children = Utils.orderByIndexes(node.children, indexes); //apply
        node.container.tabHost.performTabsLayout(indexes);
        this.dockManager.notifyOnTabsReorder(node);
    }

    _performDock(referenceNode, newNode, direction, insertBeforeReference) {
        newNode.container.elementPanel.style.position = "relative";

        if (referenceNode.parent && referenceNode.parent.container.containerType === 'fill')
            referenceNode = referenceNode.parent;

        if (direction === 'fill' && referenceNode.container.containerType === 'fill') {
            referenceNode.addChild(newNode);
            referenceNode.performLayout();
            referenceNode.container.setActiveChild(newNode.container);
            this.dockManager.invalidate();
            this.dockManager.notifyOnDock(newNode);
            return;
        }

        // Check if reference node is root node
        var model = this.dockManager.context.model,
            compositeContainer,
            compositeNode,
            referenceParent;

        if (referenceNode === model.rootNode) {
            compositeContainer = this._createDockContainer(direction, newNode, referenceNode);
            compositeNode = new DockNode(compositeContainer);

            if (insertBeforeReference) {
                compositeNode.addChild(newNode);
                compositeNode.addChild(referenceNode);
            }
            else {
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
            var referenceNodeWidth = referenceNode.container.containerElement.clientWidth;
            var referenceNodeHeight = referenceNode.container.containerElement.clientHeight;

            // Get the dimensions of the reference node, for resizing later on
            var referenceNodeParentWidth = referenceParent.container.containerElement.clientWidth;
            var referenceNodeParentHeight = referenceParent.container.containerElement.clientHeight;

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

            referenceParent.performLayout();
            compositeNode.performLayout();

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
            referenceParent.performLayout();
            referenceParent.container.setActiveChild(newNode.container);
        }

        // force resize the panel
        var containerWidth = newNode.container.containerElement.clientWidth;
        var containerHeight = newNode.container.containerElement.clientHeight;
        newNode.container.resize(containerWidth, containerHeight);

        this.dockManager.invalidate();
        this.dockManager.notifyOnDock(newNode);
    }

    _forceResizeCompositeContainer = function (container) {
        var width = container.containerElement.clientWidth;
        var height = container.containerElement.clientHeight;
        container.resize(width, height);
    }

    _createDockContainer(containerType, newNode, referenceNode) {
        if (containerType === 'horizontal')
            return new HorizontalDockContainer(this.dockManager, [newNode.container, referenceNode.container]);
        if (containerType === 'vertical')
            return new VerticalDockContainer(this.dockManager, [newNode.container, referenceNode.container]);
        if (containerType === 'fill')
            return new FillDockContainer(this.dockManager);
        throw new Error('Failed to create dock container of type: ' + containerType);
    }


    /**
     * Gets the bounds of the new node if it were to dock with the specified configuration
     * The state is not modified in this function.  It is used for showing a preview of where
     * the panel would be docked when hovered over a dock wheel button
     */
    getDockBounds(referenceNode, containerToDock, direction, insertBeforeReference):IRectangle {
        let compositeNode; // The node that contains the splitter / fill node
        let childCount;
        let childPosition;
        let bounds:IRectangle;

        if (direction === 'fill') {
            // Since this is a fill operation, the highlight bounds is the same as the reference node
            // TODO: Create a tab handle highlight to show that it's going to be docked in a tab
            let targetElement = referenceNode.container.containerElement;
            return {x:targetElement.offsetLeft, y:targetElement.offsetTop, width:targetElement.clientWidth, height:targetElement.clientHeight};
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
                for (var i = 0; i < childPosition; i++)
                    targetPanelStart += this._getVaringDimension(compositeNode.children[i].container, direction);
                targetPanelStart *= scaleMultiplier;
            }
        }

        bounds = {};
        if (direction === 'vertical') {
            bounds.x = compositeNode.container.containerElement.offsetLeft;
            bounds.y = compositeNode.container.containerElement.offsetTop + targetPanelStart;
            bounds.width = compositeNode.container.width;
            bounds.height = targetPanelSize;
        } else if (direction === 'horizontal') {
            bounds.x = compositeNode.container.containerElement.offsetLeft + targetPanelStart;
            bounds.y = compositeNode.container.containerElement.offsetTop;
            bounds.width = targetPanelSize;
            bounds.height = compositeNode.container.height;
        }

        return bounds;
    }

    _getVaringDimension(container, direction) {
        if (direction === 'vertical')
            return container.height;
        if (direction === 'horizontal')
            return container.width;
        return 0;
    }
}
