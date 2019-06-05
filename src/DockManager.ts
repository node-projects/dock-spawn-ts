import { DockWheel } from "./DockWheel.js";
import { Utils } from "./Utils.js";
import { Point } from "./Point.js";
import { DockManagerContext } from "./DockManagerContext.js";
import { DockNode } from "./DockNode.js";
import { DockLayoutEngine } from "./DockLayoutEngine.js";
import { EventHandler } from "./EventHandler.js";
import { Dialog } from "./Dialog.js";
import { DockGraphSerializer } from "./DockGraphSerializer.js";
import { DockGraphDeserializer } from "./DockGraphDeserializer.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { TabPage } from "./TabPage.js";
import { SplitterDockContainer } from "./SplitterDockContainer.js";
import { PanelContainer } from "./PanelContainer.js";

/**
* The Dock Manager notifies the listeners of layout changes so client containers that have
* costly layout structures can detach and reattach themself to avoid reflow
*/
interface LayoutEventListener {
    onDock(dockManager: DockManager, dockNode: DockNode);
    onTabsReorder(dockManager: DockManager, dockNode: DockNode);
    onUndock(dockManager: DockManager, dockNode: DockNode);
    onClosePanel(dockManager: DockManager, dockNode: DockNode);
    onCreateDialog(dockManager: DockManager, dialog: Dialog);
    onHideDialog(dockManager: DockManager, dialog: Dialog);
    onShowDialog(dockManager: DockManager, dialog: Dialog);
    onChangeDialogPosition(dockManager: DockManager, dialog: Dialog, x: number, y: number);
    onTabChanged(dockManager: DockManager, tabpage: TabPage);
    onSuspendLayout(dockManager: DockManager);
    onResumeLayout(dockManager: DockManager, panel: IDockContainer);
}

/**
 * Dock manager manages all the dock panels in a hierarchy, similar to visual studio.
 * It owns a Html Div element inside which all panels are docked
 * Initially the document manager takes up the central space and acts as the root node
 */
export class DockManager {
    element: HTMLDivElement;
    context: any;
    dockWheel: DockWheel;
    layoutEngine: DockLayoutEngine;
    mouseMoveHandler: any;
    touchMoveHandler: any;
    layoutEventListeners: LayoutEventListener[];
    defaultDialogPosition: Point;
    backgroundContext: any;
    _undockEnabled: boolean;
    zIndexCounter: number;
    closeTabIconTemplate: any;
    constructor(element) {
        if (element === undefined)
            throw new Error('Invalid Dock Manager element provided');

        this.element = element;
        this.context = this.dockWheel = this.layoutEngine = this.mouseMoveHandler = this.touchMoveHandler = undefined;
        this.layoutEventListeners = [];

        this.defaultDialogPosition = new Point(0, 0);
    }


    initialize() {
        this.backgroundContext = this.element.children[0];
        this.context = new DockManagerContext(this);
        var documentNode = new DockNode(this.context.documentManagerView);
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
        if (this.backgroundContext != null) {
            this.context.model.rootNode.container.tabHost.hostElement
                .insertBefore(this.backgroundContext, this.context.model.rootNode.container.tabHost.hostElement.firstChild);
        }
    }

    checkXBounds(container, currentMousePosition, previousMousePosition) {
        var dx = Math.floor(currentMousePosition.x - previousMousePosition.x);
        var leftBounds = container.offsetLeft + container.offsetWidth + dx < 40; // || (container.offsetLeft + container.offsetWidth + dx - 40 ) < 0;
        var rightBounds = container.offsetLeft + dx > (window.innerWidth - 40);
        if (leftBounds) {
            previousMousePosition.x = currentMousePosition.x;
            dx = 0;
            let d = 40 - (container.offsetWidth + container.offsetLeft);
            if (d > 0)
                dx = d;
        } else if (rightBounds) {
            previousMousePosition.x = currentMousePosition.x;
            dx = 0;
            let d = (window.innerWidth - 40) - container.offsetLeft;
            if (d > 0)
                dx = d;
        }

        return dx;
    }

    checkYBounds(container, currentMousePosition, previousMousePosition) {
        var dy = Math.floor(currentMousePosition.y - previousMousePosition.y);
        var topBounds = container.offsetTop + dy < 0;
        var bottomBounds = container.offsetTop + dy > (window.innerHeight - 16);
        if (topBounds) {
            previousMousePosition.y = currentMousePosition.y;
            dy = 0;
        } else if (bottomBounds) {
            previousMousePosition.y = currentMousePosition.y;
            dy = 0;
            let d = (window.innerHeight - 25) - container.offsetTop;
            if (d > 0)
                dy = d;
        }
        return dy;
    }

    rebuildLayout(node) {
        var self = this;
        node.children.forEach(function (child) {
            self.rebuildLayout(child);
        });
        node.performLayout();
    }

    invalidate() {
        this.resize(this.element.clientWidth, this.element.clientHeight);
    }

    resize(width, height) {
        this.element.style.width = width + 'px';
        this.element.style.height = height + 'px';
        this.context.model.rootNode.container.resize(width, height);
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
        var self = this;
        node.children.reverse().forEach(function (child) {
            self.loadResize(child);
            node.container.setActiveChild(child.container);
        });
        node.children.reverse();
        node.container.resize(node.container.state.width, node.container.state.height);

        // node.performLayout();
    }

    setRootNode(node) {
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

    onDialogDragStarted(sender, e) {
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
        this.mouseMoveHandler = new EventHandler(window, 'mousemove', this.onMouseMoved.bind(this));
        this.touchMoveHandler = new EventHandler(window, 'touchmove', this.onMouseMoved.bind(this));
    }

    onDialogDragEnded(sender, e) {
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

    onMouseMoved(e) {

        if (e.changedTouches != null) { // TouchMove Event
            e = e.changedTouches[0];
        }
        this.dockWheel.activeNode = this._findNodeOnPoint(e.clientX, e.clientY);
    }

    /**
     * Perform a DFS on the dock model's tree to find the
     * deepest level panel (i.e. the top-most non-overlapping panel)
     * that is under the mouse cursor
     * Retuns null if no node is found under this point
     */
    _findNodeOnPoint(x, y) {
        var stack = [];
        stack.push(this.context.model.rootNode);
        var bestMatch;

        while (stack.length > 0) {
            var topNode = stack.pop();

            if (Utils.isPointInsideNode(x, y, topNode)) {
                // This node contains the point.
                bestMatch = topNode;

                // Keep looking future down
                [].push.apply(stack, topNode.children);
            }
        }
        return bestMatch;
    }

    /** Dock the [dialog] to the left of the [referenceNode] node */
    dockDialogLeft(referenceNode: DockNode, dialog: Dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockLeft.bind(this.layoutEngine));
    }

    /** Dock the [dialog] to the right of the [referenceNode] node */
    dockDialogRight(referenceNode: DockNode, dialog: Dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockRight.bind(this.layoutEngine));
    }

    /** Dock the [dialog] above the [referenceNode] node */
    dockDialogUp(referenceNode: DockNode, dialog: Dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockUp.bind(this.layoutEngine));
    }

    /** Dock the [dialog] below the [referenceNode] node */
    dockDialogDown(referenceNode: DockNode, dialog: Dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockDown.bind(this.layoutEngine));
    }

    /** Dock the [dialog] as a tab inside the [referenceNode] node */
    dockDialogFill(referenceNode: DockNode, dialog: Dialog) {
        return this._requestDockDialog(referenceNode, dialog, this.layoutEngine.dockFill.bind(this.layoutEngine));
    }

    /** Dock the [container] to the left of the [referenceNode] node */
    dockLeft(referenceNode: DockNode, container: PanelContainer, ratio: number) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockLeft.bind(this.layoutEngine), ratio);
    }

    /** Dock the [container] to the right of the [referenceNode] node */
    dockRight(referenceNode: DockNode, container: PanelContainer, ratio: number) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockRight.bind(this.layoutEngine), ratio);
    }

    /** Dock the [container] above the [referenceNode] node */
    dockUp(referenceNode: DockNode, container: PanelContainer, ratio: number) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockUp.bind(this.layoutEngine), ratio);
    }

    /** Dock the [container] below the [referenceNode] node */
    dockDown(referenceNode: DockNode, container: PanelContainer, ratio: number) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockDown.bind(this.layoutEngine), ratio);
    }

    /** Dock the [container] as a tab inside the [referenceNode] node */
    dockFill(referenceNode: DockNode, container: PanelContainer) {
        return this._requestDockContainer(referenceNode, container, this.layoutEngine.dockFill.bind(this.layoutEngine));
    }

    floatDialog(container: PanelContainer, x, y) {
        var retdiag = undefined;

        //check the dialog do not already exist
        this.context.model.dialogs.forEach(function (dialog) {
            if (container == dialog.panel) {
                dialog.show(x, y);
                retdiag = dialog;

            }
        });
        if (retdiag)
            return retdiag;
        //try to undock just in case
        try {
            var node = this._findNodeFromContainer(container);
            this.layoutEngine.undock(node);
        } catch (err) { }

        var panel = container;
        Utils.removeNode(panel.elementPanel);
        panel.isDialog = true;
        var dialog = new Dialog(panel, this);
        dialog.setPosition(x, y);
        return dialog;
    }

    _requestDockDialog(referenceNode, dialog, layoutDockFunction) {
        // Get the active dialog that was dragged on to the dock wheel
        var panel = dialog.panel;
        var newNode = new DockNode(panel);
        panel.prepareForDocking();
        dialog.destroy();
        layoutDockFunction(referenceNode, newNode);
        // this.invalidate();
        return newNode;
    }

    _checkShowBackgroundContext() {
        if (this.backgroundContext != null) {
            if (this.context.model.documentManagerNode.children.length > 0) {
                this.backgroundContext.style.display = "none";
            } else {
                this.backgroundContext.style.display = "block";
            }
        }
    }

    _requestDockContainer(referenceNode, container, layoutDockFunction, ratio?) {
        // Get the active dialog that was dragged on to the dock wheel
        let newNode = new DockNode(container);
        if (container.containerType === 'panel') {
            let panel = container;
            panel.prepareForDocking();
            Utils.removeNode(panel.elementPanel);
        }
        layoutDockFunction(referenceNode, newNode);

        if (ratio && newNode.parent &&
            (newNode.parent.container.containerType === 'vertical' || newNode.parent.container.containerType === 'horizontal')) {
            let splitter = newNode.parent.container as SplitterDockContainer;
            splitter.setContainerRatio(container, ratio);
        }

        this.rebuildLayout(this.context.model.rootNode);
        this.invalidate();

        this._checkShowBackgroundContext();

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
        var node = this._findNodeFromContainer(container);
        this.layoutEngine.undock(node);

        // Create a new dialog window for the undocked panel
        var dialog = new Dialog(node.container, this);

        if (event !== undefined) {
            // Adjust the relative position
            var dialogWidth = dialog.elementDialog.clientWidth;
            if (dragOffset.x > dialogWidth)
                dragOffset.x = 0.75 * dialogWidth;
            dialog.setPosition(
                event.clientX - dragOffset.x,
                event.clientY - dragOffset.y);
            dialog.draggable.onMouseDown(event);
        }
        return dialog;
    }

    /**
    * closes a Panel
    */
    requestClose(container) {
        var node = this._findNodeFromContainer(container);
        this.layoutEngine.close(node);
    }

    /**
     * Opens a Elemnt in a Dialog
     * It is assumed that only leaf nodes (panels) can be undocked
     */
    openInDialog(container, event, dragOffset) {
        // Create a new dialog window for the undocked panel
        var dialog = new Dialog(container, this);

        if (event !== undefined) {
            // Adjust the relative position
            var dialogWidth = dialog.elementDialog.clientWidth;
            if (dragOffset.x > dialogWidth)
                dragOffset.x = 0.75 * dialogWidth;
            dialog.setPosition(
                event.clientX - dragOffset.x,
                event.clientY - dragOffset.y);
            dialog.draggable.onMouseDown(event);
        }
        return dialog;
    }

    /** Undocks a panel and converts it into a floating dialog window
     * It is assumed that only leaf nodes (panels) can be undocked
     */
    requestUndock(container) {
        var node = this._findNodeFromContainer(container);
        this.layoutEngine.undock(node);
    }

    /**
     * Removes a dock container from the dock layout hierarcy
     * Returns the node that was removed from the dock tree
     */
    requestRemove(container) {
        var node = this._findNodeFromContainer(container);
        var parent = node.parent;
        node.detachFromParent();
        if (parent)
            this.rebuildLayout(parent);
        return node;
    }

    /** Finds the node that owns the specified [container] */
    _findNodeFromContainer(container) {
        //this.context.model.rootNode.debugDumpTree();

        var stack = [];
        stack.push(this.context.model.rootNode);

        while (stack.length > 0) {
            var topNode = stack.pop();

            if (topNode.container === container)
                return topNode;
            [].push.apply(stack, topNode.children);
        }

        throw new Error('Cannot find dock node belonging to the element');
    }

    findNodeFromContainerElement(containerElm) {
        //this.context.model.rootNode.debugDumpTree();

        var stack = [];
        stack.push(this.context.model.rootNode);

        while (stack.length > 0) {
            var topNode = stack.pop();

            if (topNode.container.containerElement === containerElm)
                return topNode;
            [].push.apply(stack, topNode.children);
        }

        throw new Error('Cannot find dock node belonging to the element');
    }

    addLayoutListener(listener) {
        this.layoutEventListeners.push(listener);
    }

    removeLayoutListener(listener) {
        this.layoutEventListeners.splice(this.layoutEventListeners.indexOf(listener), 1);
    }

    suspendLayout() {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onSuspendLayout) listener.onSuspendLayout(this);
        });
    }

    resumeLayout(panel) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onResumeLayout) listener.onResumeLayout(this, panel);
        });
    }

    notifyOnDock(dockNode: DockNode) {
        this._checkShowBackgroundContext();
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onDock) {
                listener.onDock(this, dockNode);
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

    notifyOnTabChange(tabpage) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onTabChanged) {
                listener.onTabChanged(this, tabpage);
            }
        });
    }

    saveState() {
        let serializer = new DockGraphSerializer();
        return serializer.serialize(this.context.model);
    }

    loadState(json) {
        let deserializer = new DockGraphDeserializer(this);
        this.context.model = deserializer.deserialize(json);
        this.setModel(this.context.model);
    }

    getPanels() {
        let panels = [];
        //all visible nodes
        this._allPanels(this.context.model.rootNode, panels);

        //all visible or not dialogs
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

    setCloseTabIconTemplate(template) {
        this.closeTabIconTemplate = template;
    }
}