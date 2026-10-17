import { Dialog } from "./Dialog.js";
import { AutoHideManager } from './AutoHideManager.js';
import { DockConfig } from "./DockConfig.js";
import { DockGraphDeserializer } from "./DockGraphDeserializer.js";
import { DockGraphSerializer } from "./DockGraphSerializer.js";
import { DockLayoutEngine } from "./DockLayoutEngine.js";
import { DockManagerContext } from "./DockManagerContext.js";
import { DockNode } from "./DockNode.js";
import { DockWheel } from "./DockWheel.js";
import { PanelType } from "./enums/PanelType.js";
import { EventHandler } from "./EventHandler.js";
import { PanelContainer } from "./PanelContainer.js";
import { Point } from "./Point.js";
import { Utils } from "./Utils.js";
/**
 * Dock manager manages all the dock panels in a hierarchy, similar to visual studio.
 * It owns a Html Div element inside which all panels are docked
 * Initially the document manager takes up the central space and acts as the root node
 */
export class DockManager {
    autoHideManager;
    element;
    context;
    dockWheel;
    layoutEngine;
    mouseMoveHandler;
    touchMoveHandler;
    layoutEventListeners;
    closePanelContainerCallback;
    defaultDialogPosition;
    backgroundContext;
    zIndexCounter;
    zIndexTabHost;
    zIndexTabHandle;
    zIndexDialogCounter;
    onKeyPressBound;
    iframes;
    _undockEnabled;
    getElementCallback;
    _config;
    _activePanel;
    _lastPanelNotADialog;
    _activeDocument;
    constructor(element, config) {
        if (element === undefined)
            throw new Error('Invalid Dock Manager element provided');
        this._config = Object.assign(new DockConfig(), config);
        this.element = element;
        this.context = this.dockWheel = this.layoutEngine = this.mouseMoveHandler = this.touchMoveHandler = undefined;
        this.layoutEventListeners = [];
        this.defaultDialogPosition = new Point(0, 0);
    }
    get config() {
        return this._config;
    }
    initialize() {
        this.backgroundContext = this.element.children[0];
        this.context = new DockManagerContext(this);
        let documentNode = new DockNode(this.context.documentManagerView);
        this.context.model.rootNode = documentNode;
        this.context.model.documentManagerNode = documentNode;
        this.context.model.dialogs = [];
        this.setRootNode(this.context.model.rootNode);
        // Resize the layout
        this.resize(this.element.clientWidth, this.element.clientHeight);
        this.dockWheel = new DockWheel(this);
        this.layoutEngine = new DockLayoutEngine(this);
        this._undockEnabled = true;
        this.rebuildLayout(this.context.model.rootNode);
        this.zIndexCounter = 1001;
        this.zIndexTabHost = 1000;
        this.zIndexTabHandle = 100;
        this.zIndexDialogCounter = 10001;
        if (this.backgroundContext != null) {
            this.context.model.rootNode.container.tabHost.hostElement
                .insertBefore(this.backgroundContext, this.context.model.rootNode.container.tabHost.hostElement.firstChild);
        }
        this.onKeyPressBound = this.onKeyPress.bind(this);
        this.element.addEventListener('keydown', this.onKeyPressBound);
        this.autoHideManager = new AutoHideManager(this);
    }
    onKeyPress(e) {
        if (e.key == "Escape" && this.activePanel && !this.activePanel._hideCloseButton) {
            if ((this.activePanel.isDialog && this._config.escClosesDialog) || (!this.activePanel.isDialog && this._config.escClosesWindow)) {
                let panel = this.activePanel;
                this.activePanel = null;
                panel.close();
            }
        }
    }
    checkXBounds(container, currentMousePosition, previousMousePosition, resizeWest, resizeEast) {
        if (this._config.moveOnlyWithinDockConatiner)
            return this.checkXBoundsWithinDockContainer(container, currentMousePosition, previousMousePosition, resizeWest, resizeEast);
        let rect = this.element.getBoundingClientRect();
        let dx = Math.floor(currentMousePosition.x - previousMousePosition.x);
        let leftBounds = dx < 0 && container.offsetLeft + container.offsetWidth + dx + rect.left < 40; // || (container.offsetLeft + container.offsetWidth + dx - 40 ) < 0;
        let rightBounds = dx > 0 && container.offsetLeft + dx + rect.left > (window.innerWidth - 40);
        if (leftBounds) {
            previousMousePosition.x = currentMousePosition.x;
            dx = 0;
            let d = 40 - (container.offsetWidth + container.offsetLeft + rect.left);
            if (d > 0)
                dx = d;
        }
        else if (rightBounds) {
            previousMousePosition.x = currentMousePosition.x;
            dx = 0;
            let d = (window.innerWidth - 40) - container.offsetLeft - rect.left;
            if (d > 0)
                dx = d;
        }
        return dx;
    }
    checkXBoundsWithinDockContainer(container, currentMousePosition, previousMousePosition, resizeWest, resizeEast) {
        let dx = currentMousePosition.x - previousMousePosition.x;
        let bbOuter = this.element.getBoundingClientRect();
        let bbInner = container.getBoundingClientRect();
        let leftBounds = dx < 0 && bbInner.left + dx < bbOuter.left && !resizeEast;
        let rightBounds = dx > 0 && bbInner.right + dx > bbOuter.right && !resizeWest;
        if (leftBounds) {
            currentMousePosition.x -= dx;
            dx = bbOuter.left - bbInner.left;
            currentMousePosition.x -= dx;
        }
        else if (rightBounds) {
            currentMousePosition.x -= dx;
            dx = bbOuter.right - bbInner.right;
            currentMousePosition.x -= dx;
        }
        return dx;
    }
    checkYBounds(container, currentMousePosition, previousMousePosition, resizeNorth, resizeSouth) {
        if (this._config.moveOnlyWithinDockConatiner)
            return this.checkYBoundsWithinDockContainer(container, currentMousePosition, previousMousePosition, resizeNorth, resizeSouth);
        let rect = this.element.getBoundingClientRect();
        let dy = Math.floor(currentMousePosition.y - previousMousePosition.y);
        let topBounds = dy < 0 && container.offsetTop + dy < 0;
        let bottomBounds = dy > 0 && container.offsetTop + dy + rect.top > (window.innerHeight - 16);
        if (topBounds) {
            previousMousePosition.y = currentMousePosition.y;
            dy = 0;
        }
        else if (bottomBounds) {
            previousMousePosition.y = currentMousePosition.y;
            dy = 0;
            let d = (window.innerHeight - 16) - container.offsetTop - rect.top;
            if (d > 0)
                dy = d;
        }
        return dy;
    }
    checkYBoundsWithinDockContainer(container, currentMousePosition, previousMousePosition, resizeNorth, resizeSouth) {
        let dy = currentMousePosition.y - previousMousePosition.y;
        let bbOuter = this.element.getBoundingClientRect();
        let bbInner = container.getBoundingClientRect();
        let topBounds = dy < 0 && bbInner.top + dy < bbOuter.top && !resizeSouth;
        let bottomBounds = dy > 0 && bbInner.bottom + dy > bbOuter.bottom && !resizeNorth;
        if (topBounds) {
            currentMousePosition.y -= dy;
            dy = bbOuter.top - bbInner.top;
            currentMousePosition.y -= dy;
        }
        else if (bottomBounds) {
            currentMousePosition.y -= dy;
            dy = bbOuter.bottom - bbInner.bottom;
            currentMousePosition.y -= dy;
        }
        return dy;
    }
    rebuildLayout(node) {
        node.children.forEach((child) => {
            this.rebuildLayout(child);
        });
        node.performLayout(false);
    }
    invalidate() {
        return this.resize(this.element.clientWidth, this.element.clientHeight);
    }
    resize(width, height) {
        const resized = this.autoHideManager ? this.autoHideManager.resize(width, height)
            : this.context.model.rootNode.container.resize(width, height);
        this.getPanels().forEach(panel => panel.updateAutoHideButton());
        let offsetX = 0, offsetY = 0;
        for (let dialog of this.context.model.dialogs) {
            if (dialog.position.x > this.element.clientWidth || dialog.position.y > this.element.clientHeight) {
                if (offsetX > this.element.clientWidth || offsetY > this.element.clientHeight)
                    offsetX = 0, offsetY = 0;
                dialog.setPosition(100 + offsetX, 100 + offsetY);
                offsetX += 100;
                offsetY += 100;
            }
        }
        return resized;
    }
    /**
     * Reset the dock model . This happens when the state is loaded from json
     */
    setModel(model) {
        Utils.removeNode(this.context.documentManagerView.containerElement);
        this.context.model = model;
        this.setRootNode(model.rootNode);
        this.rebuildLayout(model.rootNode);
        this.loadResize(model.rootNode);
        // this.invalidate();
    }
    loadResize(node) {
        node.children.reverse().forEach((child) => {
            this.loadResize(child);
            node.container.setActiveChild(child.container);
        });
        node.children.reverse();
        let container = node.container;
        node.container.resize(container.state.width, container.state.height);
        // node.performLayout();
    }
    setRootNode(node) {
        // Edge-strip offsets belong to the root, never to a former root nested by docking.
        const previousRoot = this.context.model.rootNode;
        if (previousRoot && previousRoot !== node && this.autoHideManager) {
            previousRoot.container.containerElement.style.left = '';
            previousRoot.container.containerElement.style.top = '';
        }
        // if (this.context.model.rootNode)
        // {
        //     // detach it from the dock manager's base element
        //     context.model.rootNode.detachFromParent();
        // }
        // Attach the new node to the dock manager's base element and set as root node
        node.detachFromParent();
        this.context.model.rootNode = node;
        this.element.appendChild(node.container.containerElement);
    }
    _onDialogDragStarted(sender, e) {
        this.dockWheel.activeNode = this._findNodeOnPoint(e.clientX, e.clientY);
        this.dockWheel.activeDialog = sender;
        if (sender.noDocking == null || sender.noDocking !== true)
            this.dockWheel.showWheel();
        if (this.mouseMoveHandler) {
            this.mouseMoveHandler.cancel();
            delete this.mouseMoveHandler;
        }
        if (this.touchMoveHandler) {
            this.touchMoveHandler.cancel();
            delete this.touchMoveHandler;
        }
        this.mouseMoveHandler = new EventHandler(window, 'mousemove', this._onMouseMoved.bind(this));
        this.touchMoveHandler = new EventHandler(window, 'touchmove', this._onMouseMoved.bind(this));
    }
    _onDialogDragEnded(sender, e) {
        if (this.mouseMoveHandler) {
            this.mouseMoveHandler.cancel();
            delete this.mouseMoveHandler;
        }
        if (this.touchMoveHandler) {
            this.touchMoveHandler.cancel();
            delete this.touchMoveHandler;
        }
        this.dockWheel.onDialogDropped(sender);
        this.dockWheel.hideWheel();
        delete this.dockWheel.activeDialog;
        //TODO: not so good
        sender.saveState(sender.elementDialog.offsetLeft, sender.elementDialog.offsetTop);
    }
    _onMouseMoved(e) {
        if (e.changedTouches != null) { // TouchMove Event
            e = e.changedTouches[0];
        }
        this.dockWheel.activeNode = this._findNodeOnPoint(e.clientX, e.clientY);
    }
    /**
     * Perform a DFS (DeepFirstSearch) on the dock model's tree to find the
     * deepest level panel (i.e. the top-most non-overlapping panel)
     * that is under the mouse cursor
     * Retuns null if no node is found under this point
     */
    _findNodeOnPoint(x, y) {
        let stack = [];
        stack.push(this.context.model.rootNode);
        let bestMatch;
        while (stack.length > 0) {
            let topNode = stack.pop();
            if (Utils.isPointInsideNode(x, y, topNode)) {
                // This node contains the point.
                bestMatch = topNode;
                // Keep looking future down
                [].push.apply(stack, topNode.children);
            }
        }
        // Edge tabs occupy space inside the manager but outside the resized dock tree.
        // Keep the outer dock guides available while dragging across those strips.
        if (!bestMatch) {
            const bounds = this.element.getBoundingClientRect();
            if (x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom)
                return this.context.model.rootNode;
        }
        return bestMatch;
    }
    /** Dock the [dialog] to the left of the [referenceNode] node */
    dockDialogLeft(referenceNode, dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockLeft.bind(this.layoutEngine));
    }
    /** Dock the [dialog] to the right of the [referenceNode] node */
    dockDialogRight(referenceNode, dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockRight.bind(this.layoutEngine));
    }
    /** Dock the [dialog] above the [referenceNode] node */
    dockDialogUp(referenceNode, dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockUp.bind(this.layoutEngine));
    }
    /** Dock the [dialog] below the [referenceNode] node */
    dockDialogDown(referenceNode, dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockDown.bind(this.layoutEngine));
    }
    /** Dock the [dialog] as a tab inside the [referenceNode] node */
    dockDialogFill(referenceNode, dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockFill.bind(this.layoutEngine));
    }
    /** Dock the [container] to the left of the [referenceNode] node */
    dockLeft(referenceNode, container, ratio) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockLeft.bind(this.layoutEngine), ratio);
    }
    /** Dock the [container] to the right of the [referenceNode] node */
    dockRight(referenceNode, container, ratio) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockRight.bind(this.layoutEngine), ratio);
    }
    /** Dock the [container] above the [referenceNode] node */
    dockUp(referenceNode, container, ratio) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockUp.bind(this.layoutEngine), ratio);
    }
    /** Dock the [container] below the [referenceNode] node */
    dockDown(referenceNode, container, ratio) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockDown.bind(this.layoutEngine), ratio);
    }
    /** Dock the [container] as a tab inside the [referenceNode] node */
    dockFill(referenceNode, container) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockFill.bind(this.layoutEngine));
    }
    floatDialog(container, x, y, grayoutParent, disableResize) {
        let retdiag = undefined;
        //check the dialog do not already exist
        this.context.model.dialogs.forEach((dialog) => {
            if (container == dialog.panel) {
                dialog.show();
                dialog.setPosition(x, y);
                retdiag = dialog;
            }
        });
        if (retdiag)
            return retdiag;
        //try to undock just in case
        try {
            let node = this._findNodeFromContainer(container);
            this.layoutEngine.undock(node);
        }
        catch (err) { }
        let panel = container;
        Utils.removeNode(panel.elementPanel);
        panel.isDialog = true;
        let dialog = new Dialog(panel, this, grayoutParent, disableResize);
        dialog.setPosition(x, y);
        return dialog;
    }
    _requestDockDialog(referenceNode, dialog, layoutDockFunction) {
        // Get the active dialog that was dragged on to the dock wheel
        let panel = dialog.panel;
        let newNode = new DockNode(panel);
        panel.prepareForDocking();
        panel.elementContentContainer.style.zIndex = '';
        dialog.destroy();
        layoutDockFunction(referenceNode, newNode);
        // this.invalidate();
        this.autoHideManager?.onDock(newNode);
        return newNode;
    }
    _checkShowBackgroundContext() {
        if (this.backgroundContext != null) {
            if (this.context.model.documentManagerNode.children.length > 0) {
                this.backgroundContext.style.display = "none";
            }
            else {
                this.backgroundContext.style.display = "block";
            }
        }
    }
    _requestDockContainer(referenceNode, container, layoutDockFunction, ratio) {
        // Get the active dialog that was dragged on to the dock wheel
        let newNode = new DockNode(container);
        if (container.containerType === 'panel') {
            let panel = container;
            panel.prepareForDocking();
            Utils.removeNode(panel.elementPanel);
        }
        const reference = referenceNode.parent?.container.containerType === 'fill' ? referenceNode.parent : referenceNode;
        let sizes;
        let oldSplitter;
        if (reference.parent && reference.parent.container) {
            oldSplitter = reference.parent.container;
            if (oldSplitter.splitterPanel)
                sizes = new Map(oldSplitter.splitterPanel.childContainers.map(child => [child, oldSplitter.stackedVertical ? child.height : child.width]));
        }
        layoutDockFunction(referenceNode, newNode);
        if (ratio && newNode.parent && (newNode.parent.container.containerType === 'vertical' || newNode.parent.container.containerType === 'horizontal')) {
            let splitter = newNode.parent.container;
            if (sizes && oldSplitter == splitter) {
                const panel = splitter.splitterPanel;
                const bar = panel.spiltterBars[0].barElement;
                const barSize = splitter.stackedVertical ? bar.clientHeight : bar.clientWidth;
                const available = (splitter.stackedVertical ? splitter.height : splitter.width) - panel.spiltterBars.length * barSize;
                const otherSize = [...sizes].reduce((sum, [child, size]) => child === reference.container ? sum : sum + size, 0);
                const referenceSize = Math.max(0, available - otherSize);
                const newSize = Math.floor(referenceSize * ratio);
                // Split the reference pane at its actual position, preserving unrelated panes.
                splitter.setSizes(newNode.parent.children.map(child => child === newNode ? newSize
                    : child === reference ? referenceSize - newSize : sizes.get(child.container)));
            }
            else
                splitter.setContainerRatio(container, ratio);
        }
        this.rebuildLayout(this.context.model.rootNode);
        this.invalidate();
        this._checkShowBackgroundContext();
        this.autoHideManager?.onDock(newNode);
        return newNode;
    }
    _requestTabReorder(container, e) {
        let node = this._findNodeFromContainer(container);
        this.layoutEngine.reorderTabs(node, e.handle, e.state, e.index);
    }
    /**
     * Undocks a panel and converts it into a floating dialog window
     * It is assumed that only leaf nodes (panels) can be undocked
     */
    requestUndockToDialog(container, event, dragOffset) {
        const autoHideEntry = this.autoHideManager?.isAutoHidden(container)
            ? this.autoHideManager.remove(container) : undefined;
        if (autoHideEntry) {
            // Transfer the overlay directly into a dialog without re-pinning or changing the dock tree.
            container.resize(autoHideEntry.width, autoHideEntry.height);
        }
        else {
            const node = this._findNodeFromContainer(container);
            this.layoutEngine.undock(node);
        }
        let panelContainer = container;
        panelContainer.elementPanel.style.display = 'block';
        // Create a new dialog window for the undocked panel
        let dialog = new Dialog(panelContainer, this, null);
        panelContainer.updateAutoHideButton();
        if (panelContainer.lastDialogSize && !autoHideEntry)
            dialog.resize(panelContainer.lastDialogSize.width, panelContainer.lastDialogSize.height);
        if (event !== undefined) {
            // Adjust the relative position
            let dialogWidth = dialog.elementDialog.clientWidth;
            if (dragOffset.x > dialogWidth)
                dragOffset.x = 0.75 * dialogWidth;
            dialog.setPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y);
            dialog.draggable.onMouseDown(event);
        }
        return dialog;
    }
    /**
    * closes a Panel
    */
    requestClose(container) {
        if (this.autoHideManager?.isAutoHidden(container)) {
            this.autoHideManager.remove(container);
            return;
        }
        let node = this._findNodeFromContainer(container);
        this.layoutEngine.close(node);
        if (this.activePanel == container)
            this.activePanel = null;
        if (this._activeDocument == container) {
            const last = this._activeDocument;
            this._activeDocument = null;
            this.notifyOnActiveDocumentChange(null, last);
        }
    }
    /**
     * Opens a Element in a Dialog
     * It is assumed that only leaf nodes (panels) can be undocked
     */
    openInDialog(container, event, dragOffset, disableResize) {
        // Create a new dialog window for the undocked panel
        let dialog = new Dialog(container, this, null, disableResize);
        if (event != null) {
            // Adjust the relative position
            let dialogWidth = dialog.elementDialog.clientWidth;
            if (dragOffset.x > dialogWidth)
                dragOffset.x = 0.75 * dialogWidth;
            dialog.setPosition(event.clientX - dragOffset.x, event.clientY - dragOffset.y);
            dialog.draggable.onMouseDown(event);
        }
        return dialog;
    }
    /** Undocks a panel and converts it into a floating dialog window
     * It is assumed that only leaf nodes (panels) can be undocked
     */
    requestUndock(container) {
        if (this.autoHideManager?.isAutoHidden(container)) {
            this.autoHideManager.remove(container);
            return;
        }
        let node = this._findNodeFromContainer(container);
        this.layoutEngine.undock(node);
    }
    /**
     * Removes a dock container from the dock layout hierarcy
     * Returns the node that was removed from the dock tree
     */
    requestRemove(container) {
        let node = this._findNodeFromContainer(container);
        let parent = node.parent;
        node.detachFromParent();
        if (parent)
            this.rebuildLayout(parent);
        return node;
    }
    getNodeByElementId(id) {
        let stack = [];
        stack.push(this.context.model.rootNode);
        while (stack.length > 0) {
            let topNode = stack.pop();
            if (topNode.container instanceof PanelContainer) {
                if (topNode.container.elementContent.id === id)
                    return topNode;
                if (topNode.container.elementContent instanceof HTMLSlotElement) {
                    if (topNode.container.elementContent.assignedElements()?.[0]?.id === id)
                        return topNode;
                }
            }
            [].push.apply(stack, topNode.children);
        }
        return null;
    }
    getNodeByElement(element) {
        let stack = [];
        stack.push(this.context.model.rootNode);
        while (stack.length > 0) {
            let topNode = stack.pop();
            if (topNode.container instanceof PanelContainer) {
                if (topNode.container.elementContent === element)
                    return topNode;
                if (topNode.container.elementContent instanceof HTMLSlotElement) {
                    if (topNode.container.elementContent.assignedElements()?.[0] === element)
                        return topNode;
                }
            }
            [].push.apply(stack, topNode.children);
        }
        return null;
    }
    /** Finds the node that owns the specified [container] */
    _findNodeFromContainer(container) {
        let stack = [];
        stack.push(this.context.model.rootNode);
        while (stack.length > 0) {
            let topNode = stack.pop();
            if (topNode.container === container)
                return topNode;
            [].push.apply(stack, topNode.children);
        }
        return null;
    }
    findNodeFromContainerElement(containerElement) {
        let stack = [];
        stack.push(this.context.model.rootNode);
        while (stack.length > 0) {
            let topNode = stack.pop();
            if (topNode.container.containerElement === containerElement)
                return topNode;
            [].push.apply(stack, topNode.children);
        }
        return null;
    }
    addLayoutListener(listener) {
        this.layoutEventListeners.push(listener);
    }
    removeLayoutListener(listener) {
        Utils.arrayRemove(this.layoutEventListeners, listener);
    }
    suspendLayout(panel) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onSuspendLayout)
                listener.onSuspendLayout(this, panel);
        });
    }
    resumeLayout(panel) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onResumeLayout)
                listener.onResumeLayout(this, panel);
        });
    }
    notifyOnDock(dockNode) {
        this._checkShowBackgroundContext();
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onDock) {
                listener.onDock(this, dockNode);
                dockNode.container.resize(dockNode.container.width, dockNode.container.height);
            }
        });
    }
    notifyOnTabsReorder(dockNode) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onTabsReorder) {
                listener.onTabsReorder(this, dockNode);
            }
        });
    }
    notifyOnUnDock(dockNode) {
        this._checkShowBackgroundContext();
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onUndock) {
                listener.onUndock(this, dockNode);
            }
        });
    }
    notifyOnClosePanel(panel) {
        this._checkShowBackgroundContext();
        if (this.activePanel == panel)
            this.activePanel = null;
        if (this._activeDocument == panel) {
            const last = this._activeDocument;
            this._activeDocument = null;
            this.notifyOnActiveDocumentChange(null, last);
        }
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onClosePanel) {
                listener.onClosePanel(this, panel);
            }
        });
    }
    notifyOnCreateDialog(dialog) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onCreateDialog) {
                listener.onCreateDialog(this, dialog);
            }
        });
    }
    notifyOnHideDialog(dialog) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onHideDialog) {
                listener.onHideDialog(this, dialog);
            }
        });
    }
    notifyOnShowDialog(dialog) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onShowDialog) {
                listener.onShowDialog(this, dialog);
            }
        });
    }
    notifyOnChangeDialogPosition(dialog, x, y) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onChangeDialogPosition) {
                listener.onChangeDialogPosition(this, dialog, x, y);
            }
        });
    }
    notifyOnContainerResized(dockContainer) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onContainerResized) {
                listener.onContainerResized(this, dockContainer);
            }
        });
    }
    notifyOnTabChange(tabpage) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onTabChanged) {
                listener.onTabChanged(this, tabpage);
            }
        });
    }
    notifyOnActivePanelChange(panel, oldActive) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onActivePanelChange) {
                listener.onActivePanelChange(this, panel, oldActive);
            }
        });
    }
    async notifyOnActiveDocumentChange(panel, oldActive) {
        for (const listener of this.layoutEventListeners) {
            if (listener.onActiveDocumentChange) {
                await listener.onActiveDocumentChange(this, panel, oldActive);
            }
        }
    }
    prepareElementForNewWindow = null;
    notifyOnNewWindow(panel, win) {
        this._checkShowBackgroundContext();
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onNewWindow) {
                listener.onNewWindow(this, panel, win);
            }
        });
    }
    saveState() {
        let serializer = new DockGraphSerializer();
        return serializer.serialize(this.context.model);
    }
    async loadState(json) {
        let deserializer = new DockGraphDeserializer(this);
        const model = await deserializer.deserialize(json);
        this.autoHideManager?.reset();
        Utils.removeNode(this.context.model.rootNode.container.containerElement);
        this.setModel(model);
        this.autoHideManager?.restore();
    }
    getPanels() {
        let panels = [];
        //all visible nodes
        this._allPanels(this.context.model.rootNode, panels);
        //all visible or not dialogs
        panels.push(...this.context.model.autoHidePanels.map(entry => entry.panel));
        this.context.model.dialogs.forEach((dialog) => {
            //TODO: check visible
            panels.push(dialog.panel);
        });
        return panels;
    }
    undockEnabled(state) {
        this._undockEnabled = state;
        this.getPanels().forEach((panel) => {
            panel.canUndock(state);
        });
    }
    /** Toggle auto-hide at runtime. Disabling it re-pins all collapsed panels. */
    setAutoHideEnabled(enabled) {
        this.config.enableAutoHide = enabled;
        if (!enabled)
            for (const entry of [...this.context.model.autoHidePanels])
                this.autoHideManager.setAutoHide(entry.panel, false);
        this.getPanels().forEach(panel => panel.updateAutoHideButton());
    }
    lockDockState(state) {
        this.undockEnabled(!state); // false - not enabled
        this.hideCloseButton(state); //true - hide
    }
    hideCloseButton(state) {
        this.getPanels().forEach((panel) => {
            panel.hideCloseButton(state);
        });
    }
    updatePanels(ids) {
        let panels = [];
        //all visible nodes
        this._allPanels(this.context.model.rootNode, panels);
        panels.push(...this.context.model.autoHidePanels.map(entry => entry.panel));
        //only remove
        panels.forEach((panel) => {
            if (!Utils.arrayContains(ids, panel.elementContent.id)) {
                panel.close();
            }
        });
        this.context.model.dialogs.forEach((dialog) => {
            if (Utils.arrayContains(ids, dialog.panel.elementContent.id)) {
                dialog.show();
            }
            else {
                dialog.hide();
            }
        });
        return panels;
    }
    getVisiblePanels() {
        let panels = [];
        //all visible nodes
        this._allPanels(this.context.model.rootNode, panels);
        panels.push(...this.context.model.autoHidePanels.filter(entry => entry.panel.elementPanel.style.display !== 'none').map(entry => entry.panel));
        //all visible
        this.context.model.dialogs.forEach((dialog) => {
            if (!dialog.isHidden) {
                panels.push(dialog.panel);
            }
        });
        return panels;
    }
    _allPanels(node, panels) {
        node.children.forEach((child) => {
            this._allPanels(child, panels);
        });
        if (node.container.containerType === 'panel') {
            panels.push(node.container);
        }
    }
    get activeDocument() {
        return this._activeDocument;
    }
    get activePanel() {
        return this._activePanel;
    }
    set activePanel(value) {
        if (value !== this._activePanel) {
            if (value && !value.isDialog) //todo store compliete list of panels, remove the closed ones and switch back focus
                this._lastPanelNotADialog = value;
            if (this._lastPanelNotADialog && this.getPanels().indexOf(this._lastPanelNotADialog) < 0)
                this._lastPanelNotADialog = null;
            let oldActive = this.activePanel;
            if (this.activePanel) {
                this.activePanel.elementTitle.classList.remove("dockspan-panel-active");
                this.activePanel.elementTitleText.classList.remove("dockspan-panel-titlebar-text-active");
                if (this.activePanel.tabPage) {
                    this.activePanel.tabPage.host.setActive(false);
                }
            }
            this._activePanel = value;
            let lastActiveDocument = this._activeDocument;
            if (value && value.panelType == PanelType.document) {
                this._activeDocument = value;
            }
            if (!value && oldActive && oldActive.isDialog && value == null && this._lastPanelNotADialog && this.activePanel != this._lastPanelNotADialog) {
                value = this._lastPanelNotADialog;
                this._lastPanelNotADialog = undefined;
            }
            this.notifyOnActivePanelChange(value, oldActive);
            if (lastActiveDocument != this._activeDocument) {
                this.notifyOnActiveDocumentChange(this._activeDocument, lastActiveDocument);
            }
            if (value) {
                value.elementTitle.classList.add("dockspan-panel-active");
                value.elementTitleText.classList.add("dockspan-panel-titlebar-text-active");
                if (value.tabPage) {
                    value.tabPage.host.setActive(true);
                }
            }
        }
        else {
            if (value && value.tabPage) {
                value.tabPage.host.setActive(true);
            }
        }
    }
}
//# sourceMappingURL=DockManager.js.map