import { Dialog } from "./Dialog.js";
import { AutoHideManager } from './AutoHideManager.js';
import { DockConfig, TabStripMode } from "./DockConfig.js";
import { DockGraphDeserializer } from "./DockGraphDeserializer.js";
import { DockGraphSerializer } from "./DockGraphSerializer.js";
import { DockLayoutEngine } from "./DockLayoutEngine.js";
import { DockManagerContext } from "./DockManagerContext.js";
import { DockModel } from "./DockModel.js";
import { DockNode } from "./DockNode.js";
import { DockWheel } from "./DockWheel.js";
import { PanelType } from "./enums/PanelType.js";
import { EventHandler } from "./EventHandler.js";
import { FillDockContainer } from "./FillDockContainer.js";
import { NewWindowParams } from "./index.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { IDockContainerWithSize } from "./interfaces/IDockContainerWithSize.js";
import { ILayoutEventListener } from "./interfaces/ILayoutEventListener.js";
import { IState } from "./interfaces/IState.js";
import { PanelContainer } from "./PanelContainer.js";
import { Point } from "./Point.js";
import { SplitterDockContainer } from "./SplitterDockContainer.js";
import { TabPage } from "./TabPage.js";
import { Utils } from "./Utils.js";

/**
 * Dock manager manages all the dock panels in a hierarchy, similar to visual studio.
 * It owns a Html Div element inside which all panels are docked
 * Initially the document manager takes up the central space and acts as the root node
 */
export class DockManager {
    public autoHideManager: AutoHideManager;

    public element: HTMLElement;
    public context: DockManagerContext;
    public dockWheel: DockWheel;
    public layoutEngine: DockLayoutEngine;
    public mouseMoveHandler: EventHandler;
    public touchMoveHandler: EventHandler;
    public layoutEventListeners: ILayoutEventListener[];
    public closePanelContainerCallback: (panelContainer: PanelContainer) => Promise<boolean>;
    public defaultDialogPosition: Point;
    public backgroundContext: HTMLElement;
    public zIndexCounter: number;
    public zIndexTabHost: number;
    public zIndexTabHandle: number;
    public zIndexDialogCounter: number;
    public onKeyPressBound: any;
    public iframes: HTMLIFrameElement[];
    public _undockEnabled: boolean;
    public getElementCallback: (state: IState) => Promise<{ element: HTMLElement, title: string }>;

    private _config: DockConfig;
    private _activePanel: PanelContainer;
    private _lastPanelNotADialog: PanelContainer;

    private _activeDocument: PanelContainer;

    constructor(element: HTMLElement, config?: DockConfig) {
        if (element === undefined)
            throw new Error('Invalid Dock Manager element provided');

        this._config = Object.assign(new DockConfig(), config);

        this.element = element;
        this.context = this.dockWheel = this.layoutEngine = this.mouseMoveHandler = this.touchMoveHandler = undefined;
        this.layoutEventListeners = [];

        this.defaultDialogPosition = new Point(0, 0);
    }

    get config(): DockConfig {
        return this._config;
    }

    /** Set the default and update all docked and floating tab strips. */
    async setTabStripMode(mode: TabStripMode): Promise<void> {
        if (mode !== 'scroll' && mode !== 'wrap') throw new Error('Invalid tab strip mode');
        this.config.tabStripMode = mode;
        const hosts = new Set<import('./TabHost.js').TabHost>();
        const visit = (node: DockNode) => {
            if (node.container instanceof FillDockContainer) hosts.add(node.container.tabHost);
            node.children.forEach(visit);
        };
        visit(this.context.model.rootNode);
        this.context.model.dialogs.forEach(dialog => { if (dialog.tabHost) hosts.add(dialog.tabHost); });
        await Promise.all([...hosts].map(host => host.setTabStripMode(mode)));
    }

    initialize() {
        this.backgroundContext = this.element.children[0] as HTMLElement;
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
            (<FillDockContainer>this.context.model.rootNode.container).tabHost.hostElement
                .insertBefore(this.backgroundContext, (<FillDockContainer>this.context.model.rootNode.container).tabHost.hostElement.firstChild);
        }

        this.onKeyPressBound = this.onKeyPress.bind(this);
        this.element.addEventListener('keydown', this.onKeyPressBound);
        this.autoHideManager = new AutoHideManager(this);
    }

    onKeyPress(e: KeyboardEvent) {
        if (e.key == "Escape" && this.activePanel && !this.activePanel._hideCloseButton) {
            if ((this.activePanel.isDialog && this._config.escClosesDialog) || (!this.activePanel.isDialog && this._config.escClosesWindow)) {
                let panel = this.activePanel;
                this.activePanel = null;
                panel.close();
            }
        }
    }

    checkXBounds(container: HTMLElement, currentMousePosition: Point, previousMousePosition: Point, resizeWest: boolean, resizeEast: boolean) {
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
        } else if (rightBounds) {
            previousMousePosition.x = currentMousePosition.x;
            dx = 0;
            let d = (window.innerWidth - 40) - container.offsetLeft - rect.left;
            if (d > 0)
                dx = d;
        }

        return dx;
    }

    checkXBoundsWithinDockContainer(container: HTMLElement, currentMousePosition: Point, previousMousePosition: Point, resizeWest: boolean, resizeEast: boolean) {
        let dx = currentMousePosition.x - previousMousePosition.x;
        let bbOuter = this.element.getBoundingClientRect();
        let bbInner = container.getBoundingClientRect();
        let leftBounds = dx < 0 && bbInner.left + dx < bbOuter.left && !resizeEast;
        let rightBounds = dx > 0 && bbInner.right + dx > bbOuter.right && !resizeWest;

        if (leftBounds) {
            currentMousePosition.x -= dx;
            dx = bbOuter.left - bbInner.left;
            currentMousePosition.x -= dx;
        } else if (rightBounds) {
            currentMousePosition.x -= dx;
            dx = bbOuter.right - bbInner.right;
            currentMousePosition.x -= dx;
        }
        return dx;
    }

    checkYBounds(container: HTMLElement, currentMousePosition: Point, previousMousePosition: Point, resizeNorth: boolean, resizeSouth: boolean) {
        if (this._config.moveOnlyWithinDockConatiner)
            return this.checkYBoundsWithinDockContainer(container, currentMousePosition, previousMousePosition, resizeNorth, resizeSouth);

        let rect = this.element.getBoundingClientRect();
        let dy = Math.floor(currentMousePosition.y - previousMousePosition.y);
        let topBounds = dy < 0 && container.offsetTop + dy < 0;
        let bottomBounds = dy > 0 && container.offsetTop + dy + rect.top > (window.innerHeight - 16);
        if (topBounds) {
            previousMousePosition.y = currentMousePosition.y;
            dy = 0;
        } else if (bottomBounds) {
            previousMousePosition.y = currentMousePosition.y;
            dy = 0;
            let d = (window.innerHeight - 16) - container.offsetTop - rect.top;
            if (d > 0)
                dy = d;
        }
        return dy;
    }

    checkYBoundsWithinDockContainer(container: HTMLElement, currentMousePosition: Point, previousMousePosition: Point, resizeNorth: boolean, resizeSouth: boolean) {
        let dy = currentMousePosition.y - previousMousePosition.y;
        let bbOuter = this.element.getBoundingClientRect();
        let bbInner = container.getBoundingClientRect();
        let topBounds = dy < 0 && bbInner.top + dy < bbOuter.top && !resizeSouth;
        let bottomBounds = dy > 0 && bbInner.bottom + dy > bbOuter.bottom && !resizeNorth;

        if (topBounds) {
            currentMousePosition.y -= dy;
            dy = bbOuter.top - bbInner.top;
            currentMousePosition.y -= dy;
        } else if (bottomBounds) {
            currentMousePosition.y -= dy;
            dy = bbOuter.bottom - bbInner.bottom;
            currentMousePosition.y -= dy;
        }
        return dy;
    }

    rebuildLayout(node: DockNode) {
        node.children.forEach((child) => {
            this.rebuildLayout(child);
        });
        node.performLayout(false);
    }

    invalidate() {
        return this.resize(this.element.clientWidth, this.element.clientHeight);
    }

    resize(width: number, height: number): Promise<void> {
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
    setModel(model: DockModel) {
        Utils.removeNode(this.context.documentManagerView.containerElement);
        this.context.model = model;
        this.setRootNode(model.rootNode);

        this.rebuildLayout(model.rootNode);
        this.loadResize(model.rootNode);
        // this.invalidate();
    }

    loadResize(node: DockNode) {
        node.children.reverse().forEach((child) => {
            this.loadResize(child);
            node.container.setActiveChild(child.container);
        });
        node.children.reverse();
        let container = node.container as IDockContainerWithSize;
        node.container.resize(container.state.width, container.state.height);
        // node.performLayout();
    }


    setRootNode(node: DockNode) {
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

    _onDialogDragStarted(sender: Dialog, e) {
        this.dockWheel.activeNode = this._findNodeOnPoint(e.clientX, e.clientY);
        this.dockWheel.activeDialog = sender;
        if (this._undockEnabled && (sender.noDocking == null || sender.noDocking !== true))
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

    _onDialogDragEnded(sender: Dialog, e) {
        if (this.mouseMoveHandler) {
            this.mouseMoveHandler.cancel();
            delete this.mouseMoveHandler;
        }
        if (this.touchMoveHandler) {
            this.touchMoveHandler.cancel();
            delete this.touchMoveHandler;
        }
        const point = e.changedTouches?.[0] ?? e;
        const target = this.findFloatingGroupTarget(sender, point.clientX, point.clientY);
        this.showFloatingGroupTarget(undefined);
        if (target) {
            this.dockWheel.hideWheel();
            delete this.dockWheel.activeDialog;
            this.mergeDialogs(sender, target);
            return;
        }
        if (this._undockEnabled) this.dockWheel.onDialogDropped(sender);
        this.dockWheel.hideWheel();
        delete this.dockWheel.activeDialog;
        //TODO: not so good
        sender.saveState(sender.elementDialog.offsetLeft, sender.elementDialog.offsetTop);
    }

    private _onMouseMoved(e) {
        if (e.changedTouches != null) { // TouchMove Event
            e = e.changedTouches[0];
        }
        const target = this.findFloatingGroupTarget(this.dockWheel.activeDialog, e.clientX, e.clientY);
        this.showFloatingGroupTarget(target);
        if (target) this.dockWheel.hideWheel();
        else {
            const dialog = this.dockWheel.activeDialog;
            if (dialog && this._undockEnabled && !dialog.noDocking) this.dockWheel.showWheel();
            this.dockWheel.activeNode = this._findNodeOnPoint(e.clientX, e.clientY);
        }
    }

    private floatingGroupTarget?: Dialog;

    private showFloatingGroupTarget(target?: Dialog) {
        if (target === this.floatingGroupTarget) return;
        const mark = (dialog: Dialog, enabled: boolean) => {
            dialog.elementDialog.classList.toggle('dock-tab-group-drop-target', enabled);
            dialog.panels.forEach(panel => panel.elementContentContainer.classList.toggle('dock-tab-group-drop-target', enabled));
        };
        if (this.floatingGroupTarget) mark(this.floatingGroupTarget, false);
        this.floatingGroupTarget = target;
        if (target) mark(target, true);
    }

    private findFloatingGroupTarget(source: Dialog, x: number, y: number): Dialog | undefined {
        if (!source || !this.config.enableTabGroups || !this._undockEnabled || source.noDocking || source.grayoutParent
            || source.panels.some(panel => !panel._canUndock)) return undefined;
        return [...this.context.model.dialogs].filter(dialog => {
            if (dialog === source || dialog.isHidden || dialog.noDocking || dialog.grayoutParent
                || dialog.panels.some(panel => !panel._canUndock)) return false;
            const rect = dialog.elementDialog.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        }).sort((a, b) => Number(b.elementDialog.style.zIndex) - Number(a.elementDialog.style.zIndex))[0];
    }

    /** Merge two floating windows, preserving target order and the dragged active tab. */
    mergeDialogs(source: Dialog, target: Dialog): Dialog {
        if (!this.config.enableTabGroups || !this._undockEnabled || source === target
            || source.dockManager !== this || target.dockManager !== this
            || source.noDocking || target.noDocking || source.grayoutParent || target.grayoutParent
            || source.isHidden || target.isHidden
            || [...source.panels, ...target.panels].some(panel => !panel._canUndock)) return null;
        const rect = target.elementDialog.getBoundingClientRect();
        const panels = [...target.panels, ...source.panels];
        const active = source.tabHost?.activeTab?.panel ?? source.panel;
        source.destroy();
        target.destroy();
        const group = new Dialog(active, this, undefined, target.disableResize, panels);
        group.resize(rect.width, rect.height);
        group.setPosition(rect.left, rect.top);
        return group;
    }

    /** Disable grouping at runtime, splitting floating groups into individual windows. */
    setTabGroupsEnabled(enabled: boolean) {
        this.config.enableTabGroups = enabled;
        if (enabled) return;
        this.showFloatingGroupTarget(undefined);
        const clear = (node: DockNode) => {
            if (node.container instanceof FillDockContainer) node.container.tabHost.clearDragSelection();
            node.children.forEach(clear);
        };
        clear(this.context.model.rootNode);
        for (const dialog of [...this.context.model.dialogs]) {
            if (!dialog.tabHost) continue;
            const rect = dialog.elementDialog.getBoundingClientRect();
            const panels = [...dialog.panels];
            dialog.destroy();
            panels.forEach((panel, index) => {
                panel.elementPanel.style.display = 'block';
                panel.elementContentWrapper.style.display = 'block';
                const single = new Dialog(panel, this, undefined, dialog.disableResize);
                single.resize(rect.width, rect.height);
                single.setPosition(rect.left + index * 24, rect.top + index * 24);
                if (dialog.isHidden) single.hide();
            });
        }
    }

    /**
     * Perform a DFS (DeepFirstSearch) on the dock model's tree to find the
     * deepest level panel (i.e. the top-most non-overlapping panel)
     * that is under the mouse cursor
     * Retuns null if no node is found under this point
     */
    private _findNodeOnPoint(x: number, y: number) {
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
    dockDialogLeft(referenceNode: DockNode, dialog: Dialog, outerDock = false) {
        return this._requestDockDialog(referenceNode, dialog, (reference, node) => this.layoutEngine.dockLeft(reference, node, outerDock));
    }

    /** Dock the [dialog] to the right of the [referenceNode] node */
    dockDialogRight(referenceNode: DockNode, dialog: Dialog, outerDock = false) {
        return this._requestDockDialog(referenceNode, dialog, (reference, node) => this.layoutEngine.dockRight(reference, node, outerDock));
    }

    /** Dock the [dialog] above the [referenceNode] node */
    dockDialogUp(referenceNode: DockNode, dialog: Dialog, outerDock = false) {
        return this._requestDockDialog(referenceNode, dialog, (reference, node) => this.layoutEngine.dockUp(reference, node, outerDock));
    }

    /** Dock the [dialog] below the [referenceNode] node */
    dockDialogDown(referenceNode: DockNode, dialog: Dialog, outerDock = false) {
        return this._requestDockDialog(referenceNode, dialog, (reference, node) => this.layoutEngine.dockDown(reference, node, outerDock));
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

    floatDialog(container: PanelContainer, x: number, y: number, grayoutParent?: PanelContainer, disableResize?: boolean): Dialog {
        let retdiag = undefined;

        //check the dialog do not already exist
        this.context.model.dialogs.forEach((dialog) => {
            if (dialog.panels.includes(container)) {
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
        } catch (err) { }

        let panel = container;
        Utils.removeNode(panel.elementPanel);
        panel.elementPanel.style.display = 'block';
        panel.elementContentWrapper.style.display = 'block';
        panel.isDialog = true;
        let dialog = new Dialog(panel, this, grayoutParent, disableResize);
        dialog.setPosition(x, y);
        return dialog;
    }

    private _requestDockDialog(referenceNode: DockNode, dialog: Dialog, layoutDockFunction: (referenceNode: DockNode, newNode: DockNode) => void) {
        if (dialog.tabHost) {
            const panels = [...dialog.panels];
            const active = dialog.tabHost.activeTab?.panel ?? panels[0];
            dialog.destroy();
            panels.forEach(panel => {
                panel.prepareForDocking();
                panel.elementContentContainer.style.zIndex = '';
            });
            const first = new DockNode(panels[0]);
            layoutDockFunction(referenceNode, first);
            let previous = first;
            for (const panel of panels.slice(1)) {
                const node = new DockNode(panel);
                this.layoutEngine.dockFill(previous, node);
                previous = node;
                this.autoHideManager?.onDock(node);
            }
            first.parent?.container.setActiveChild(active);
            this.autoHideManager?.onDock(first);
            return first;
        }
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

    private _checkShowBackgroundContext() {
        if (this.backgroundContext != null) {
            if (this.context.model.documentManagerNode.children.length > 0) {
                this.backgroundContext.style.display = "none";
            } else {
                this.backgroundContext.style.display = "block";
            }
        }
    }

    private _requestDockContainer(referenceNode: DockNode, container: IDockContainer, layoutDockFunction: (referenceNode: DockNode, newNode: DockNode) => void, ratio?: number) {
        // Get the active dialog that was dragged on to the dock wheel
        let newNode = new DockNode(container);
        if (container.containerType === 'panel') {
            let panel = container as PanelContainer;
            panel.prepareForDocking();
            Utils.removeNode(panel.elementPanel);
        }

        const reference = referenceNode.parent?.container.containerType === 'fill' ? referenceNode.parent : referenceNode;
        let sizes: Map<IDockContainer, number>;
        let oldSplitter: SplitterDockContainer;
        if (reference.parent && reference.parent.container) {
            oldSplitter = reference.parent.container as SplitterDockContainer;
            if (oldSplitter.splitterPanel)
                sizes = new Map(oldSplitter.splitterPanel.childContainers.map(child =>
                    [child, oldSplitter.stackedVertical ? child.height : child.width]));
        }

        layoutDockFunction(referenceNode, newNode);

        if (ratio && newNode.parent && (newNode.parent.container.containerType === 'vertical' || newNode.parent.container.containerType === 'horizontal')) {
            let splitter = newNode.parent.container as SplitterDockContainer;
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

    _requestTabReorder(container: IDockContainer, e) {
        let node = this._findNodeFromContainer(container);
        this.layoutEngine.reorderTabs(node, e.handle, e.state, e.index);
    }

    /** Float tabs from one host together, preserving their order and active member. */
    requestUndockGroup(panels: PanelContainer[], event?, dragOffset = new Point(0, 0), activePanel = panels[0]): Dialog {
        if (!this.config.enableTabGroups || !panels.length || !this._undockEnabled || panels.some(panel => !panel?._canUndock)) return null;
        const host = panels[0].tabPage?.host;
        if (!host || new Set(panels).size !== panels.length || panels.some(panel => panel.tabPage?.host !== host)) return null;
        panels = host.pages.filter(page => panels.includes(page.panel)).map(page => page.panel);
        if (!panels.includes(activePanel)) activePanel = panels[0];
        const width = host.hostElement.clientWidth;
        const height = host.hostElement.clientHeight;
        for (const panel of panels) {
            if (panel.floatingDialog?.tabHost) panel.floatingDialog.removePanel(panel);
            else this.layoutEngine.undock(this._findNodeFromContainer(panel));
        }
        const dialog = new Dialog(activePanel, this, undefined, false, panels);
        dialog.resize(width, height);
        if (event) {
            dialog.setPosition(event.clientX - Math.min(dragOffset.x, width * 0.75), event.clientY - dragOffset.y);
            dialog.draggable.onMouseDown(event);
        }
        return dialog;
    }

    /**
     * Undocks a panel and converts it into a floating dialog window
     * It is assumed that only leaf nodes (panels) can be undocked
     */
    requestUndockToDialog(container: PanelContainer, event, dragOffset: Point) {
        if (container.floatingDialog?.tabHost) {
            container.floatingDialog.removePanel(container);
            return this.openInDialog(container, event, dragOffset);
        }
        const autoHideEntry = this.autoHideManager?.isAutoHidden(container)
            ? this.autoHideManager.remove(container) : undefined;
        if (autoHideEntry) {
            // Transfer the overlay directly into a dialog without re-pinning or changing the dock tree.
            container.resize(autoHideEntry.width, autoHideEntry.height);
        } else {
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
    requestClose(container: PanelContainer) {
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
    openInDialog(container: PanelContainer, event, dragOffset: Point, disableResize?: boolean) {
        // Create a new dialog window for the undocked panel
        let dialog = new Dialog(container, this, null, disableResize);

        if (event != null) {
            // Adjust the relative position
            let dialogWidth = dialog.elementDialog.clientWidth;
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
    requestUndock(container: PanelContainer) {
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
    requestRemove(container: PanelContainer) {
        let node = this._findNodeFromContainer(container);
        let parent = node.parent;
        node.detachFromParent();
        if (parent)
            this.rebuildLayout(parent);
        return node;
    }

    getNodeByElementId(id: string): DockNode {
        let stack = [];
        stack.push(this.context.model.rootNode);

        while (stack.length > 0) {
            let topNode = stack.pop();

            if (topNode.container instanceof PanelContainer) {
                if (topNode.container.elementContent.id === id)
                    return topNode;
                if (topNode.container.elementContent instanceof HTMLSlotElement) {
                    if ((<HTMLSlotElement>topNode.container.elementContent).assignedElements()?.[0]?.id === id)
                        return topNode;
                }
            }

            [].push.apply(stack, topNode.children);
        }

        return null;
    }

    getNodeByElement(element: Element): DockNode {
        let stack = [];
        stack.push(this.context.model.rootNode);

        while (stack.length > 0) {
            let topNode = stack.pop();

            if (topNode.container instanceof PanelContainer) {
                if (topNode.container.elementContent === element)
                    return topNode;
                if (topNode.container.elementContent instanceof HTMLSlotElement) {
                    if ((<HTMLSlotElement>topNode.container.elementContent).assignedElements()?.[0] === element)
                        return topNode;
                }
            }

            [].push.apply(stack, topNode.children);
        }

        return null;
    }

    /** Finds the node that owns the specified [container] */
    private _findNodeFromContainer(container: IDockContainer): DockNode {
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

    findNodeFromContainerElement(containerElement: HTMLElement) {
        let stack: DockNode[] = [];
        stack.push(this.context.model.rootNode);

        while (stack.length > 0) {
            let topNode = stack.pop();

            if (topNode.container.containerElement === containerElement)
                return topNode;
            [].push.apply(stack, <any>topNode.children);
        }

        return null;
    }

    addLayoutListener(listener: ILayoutEventListener) {
        this.layoutEventListeners.push(listener);
    }

    removeLayoutListener(listener: ILayoutEventListener) {
        Utils.arrayRemove(this.layoutEventListeners, listener);
    }

    suspendLayout(panel: IDockContainer) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onSuspendLayout) listener.onSuspendLayout(this, panel);
        });
    }

    resumeLayout(panel: IDockContainer) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onResumeLayout) listener.onResumeLayout(this, panel);
        });
    }

    notifyOnDock(dockNode: DockNode) {
        this._checkShowBackgroundContext();
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onDock) {
                listener.onDock(this, dockNode);
                dockNode.container.resize(dockNode.container.width, dockNode.container.height);
            }
        });
    }

    notifyOnTabsReorder(dockNode: DockNode) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onTabsReorder) {
                listener.onTabsReorder(this, dockNode);
            }
        });
    }

    notifyOnUnDock(dockNode: DockNode) {
        this._checkShowBackgroundContext();
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onUndock) {
                listener.onUndock(this, dockNode);
            }
        });
    }

    notifyOnClosePanel(panel: PanelContainer) {
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

    notifyOnCreateDialog(dialog: Dialog) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onCreateDialog) {
                listener.onCreateDialog(this, dialog);
            }
        });
    }

    notifyOnHideDialog(dialog: Dialog) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onHideDialog) {
                listener.onHideDialog(this, dialog);
            }
        });
    }


    notifyOnShowDialog(dialog: Dialog) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onShowDialog) {
                listener.onShowDialog(this, dialog);
            }
        });
    }

    notifyOnChangeDialogPosition(dialog: Dialog, x: number, y: number) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onChangeDialogPosition) {
                listener.onChangeDialogPosition(this, dialog, x, y);
            }
        });
    }

    notifyOnContainerResized(dockContainer: IDockContainer) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onContainerResized) {
                listener.onContainerResized(this, dockContainer);
            }
        });
    }

    notifyOnTabChange(tabpage: TabPage) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onTabChanged) {
                listener.onTabChanged(this, tabpage);
            }
        });
    }

    notifyOnActivePanelChange(panel: PanelContainer, oldActive: PanelContainer) {
        this.layoutEventListeners.forEach((listener) => {
            if (listener.onActivePanelChange) {
                listener.onActivePanelChange(this, panel, oldActive);
            }
        });
    }

    async notifyOnActiveDocumentChange(panel: PanelContainer, oldActive: PanelContainer) {
        for (const listener of this.layoutEventListeners) {
            if (listener.onActiveDocumentChange) {
                await listener.onActiveDocumentChange(this, panel, oldActive);
            }
        }
    }

    prepareElementForNewWindow: (element: HTMLElement, params: NewWindowParams, newWindow: Window) => HTMLElement = null;

    notifyOnNewWindow(panel: PanelContainer, win: Window) {
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

    async loadState(json: string) {
        let deserializer = new DockGraphDeserializer(this);
        const previousPanels = this.getPanels();
        // Release floating tab hosts before reusing their content elements in the restored layout.
        for (const dialog of [...this.context.model.dialogs]) dialog.destroy();
        const model = await deserializer.deserialize(json);
        // Content layers live outside the layout tree. Removing only its root
        // leaves empty floating layers above the restored workspace.
        const releaseTabs = (node: DockNode) => {
            if (node.container instanceof FillDockContainer) node.container.tabHost.destroy();
            node.children.forEach(releaseTabs);
        };
        releaseTabs(this.context.model.rootNode);
        for (const panel of previousPanels) {
            panel.destroy();
            Utils.removeNode(panel.elementContentContainer);
        }
        this.autoHideManager?.reset();
        Utils.removeNode(this.context.model.rootNode.container.containerElement);
        this.setModel(model);
        this.autoHideManager?.restore();
    }

    getPanels() {
        let panels: PanelContainer[] = [];
        //all visible nodes
        this._allPanels(this.context.model.rootNode, panels);

        //all visible or not dialogs
        panels.push(...this.context.model.autoHidePanels.map(entry => entry.panel));
        this.context.model.dialogs.forEach((dialog) => {
            //TODO: check visible
            panels.push(...dialog.panels);
        });

        return panels;
    }

    undockEnabled(state: boolean) {
        this._undockEnabled = state;
        this.getPanels().forEach((panel) => {
            panel.canUndock(state);
        });
    }

    /** Toggle auto-hide at runtime. Disabling it re-pins all collapsed panels. */
    setAutoHideEnabled(enabled: boolean) {
        this.config.enableAutoHide = enabled;
        if (!enabled)
            for (const entry of [...this.context.model.autoHidePanels])
                this.autoHideManager.setAutoHide(entry.panel, false);
        this.getPanels().forEach(panel => panel.updateAutoHideButton());
    }

    lockDockState(state: boolean) {
        this.undockEnabled(!state); // false - not enabled
        this.hideCloseButton(state); //true - hide
    }

    hideCloseButton(state: boolean) {
        this.getPanels().forEach((panel) => {
            panel.hideCloseButton(state);
        });
    }

    updatePanels(ids: string[]) {
        let panels: PanelContainer[] = [];
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
            if (dialog.panels.some(panel => Utils.arrayContains(ids, panel.elementContent.id))) {
                dialog.show();
            }
            else {
                dialog.hide();
            }
        });
        return panels;
    }

    getVisiblePanels(): PanelContainer[] {
        let panels: PanelContainer[] = [];
        //all visible nodes
        this._allPanels(this.context.model.rootNode, panels);
        panels.push(...this.context.model.autoHidePanels.filter(entry =>
            entry.panel.elementPanel.style.display !== 'none').map(entry => entry.panel));

        //all visible
        this.context.model.dialogs.forEach((dialog) => {
            if (!dialog.isHidden) {
                panels.push(...dialog.panels);
            }
        });

        return panels;
    }

    _allPanels(node: DockNode, panels: PanelContainer[]) {
        node.children.forEach((child) => {
            this._allPanels(child, panels);
        });
        if (node.container.containerType === 'panel') {
            panels.push(node.container as PanelContainer);
        }
    }

    get activeDocument(): PanelContainer {
        return this._activeDocument;
    }

    get activePanel(): PanelContainer {
        return this._activePanel;
    }
    set activePanel(value: PanelContainer) {
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
