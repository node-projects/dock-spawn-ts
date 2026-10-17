import { DockManager } from "./DockManager.js";
import { DockNode } from "./DockNode.js";
import { DraggableContainer } from "./DraggableContainer.js";
import { EventHandler } from "./EventHandler.js";
import { PanelContainer } from "./PanelContainer.js";
import { Point } from "./Point.js";
import { ResizableContainer } from "./ResizableContainer.js";
import { Utils } from "./Utils.js";
import { ResizeDirection } from "./enums/ResizeDirection.js";
import { Localizer } from "./i18n/Localizer.js";
import { IContextMenuProvider } from "./interfaces/IContextMenuProvider.js";
import { TabHost } from './TabHost.js';
import { DocumentTabPage } from './DocumentTabPage.js';
import { TabHostDirection } from './enums/TabHostDirection.js';

export class Dialog implements IContextMenuProvider {
    elementDialog: HTMLDivElement & { floatingDialog: Dialog };
    draggable: DraggableContainer;
    panel: PanelContainer;
    dockManager: DockManager;
    eventListener: DockManager;
    position: Point;
    resizable: ResizableContainer;
    disableResize: boolean;
    mouseDownHandler: any;
    onKeyPressBound: any;
    noDocking: boolean;
    isHidden: boolean;
    keyPressHandler: EventHandler;
    focusHandler: EventHandler;
    grayoutParent: PanelContainer;
    panels: PanelContainer[];
    tabHost?: TabHost;
    private groupHeader?: HTMLDivElement;

    constructor(panel: PanelContainer, dockManager: DockManager, grayoutParent?: PanelContainer, disableResize?: boolean, panels?: PanelContainer[]) {
        this.panel = panel;
        this.panels = panels ?? [panel];
        this.dockManager = dockManager;
        this.eventListener = dockManager;
        this.grayoutParent = grayoutParent;
        this.disableResize = disableResize;
        this._initialize();
        this.dockManager.context.model.dialogs.push(this);
        this.position = dockManager.defaultDialogPosition;
        this.dockManager.notifyOnCreateDialog(this);
        this.panels.forEach(member => { member.isDialog = true; });
    }

    saveState(x: number, y: number) {
        this.position = new Point(x, y);
        this.dockManager.notifyOnChangeDialogPosition(this, x, y);
    }

    static fromElement(id: string, dockManager: DockManager) {
        return new Dialog(new PanelContainer(<HTMLElement>document.getElementById(id), dockManager), dockManager, null);
    }

    _initialize() {
        this.panels.forEach(panel => { panel.floatingDialog = this; });
        this.elementDialog = Object.assign(document.createElement('div'), { floatingDialog: this });
        this.elementDialog.tabIndex = 0;
        let dragHandle = this.panel.elementTitle;
        if (this.panels.length > 1) {
            this.groupHeader = document.createElement('div');
            this.groupHeader.className = 'panel-titlebar disable-selection';
            this.groupHeader.textContent = Localizer.getString('TabGroup');
            this.elementDialog.appendChild(this.groupHeader);
            dragHandle = this.groupHeader;
            this.tabHost = new TabHost(this.dockManager, TabHostDirection.TOP, true);
            this.tabHost.createTabPage = (host, container) => new DocumentTabPage(host, container);
            this.elementDialog.appendChild(this.tabHost.hostElement);
            this.tabHost.performLayout(this.panels);
            this.tabHost.setActiveTab(this.panel);
            this.tabHost.addListener({ onChange: e => {
                const index = e.index;
                const next = index + (e.state === 'left' ? -1 : 1);
                if (next < 0 || next >= this.panels.length) return;
                [this.panels[index], this.panels[next]] = [this.panels[next], this.panels[index]];
                const indexes = this.panels.map(panel => this.tabHost.pages.findIndex(page => page.panel === panel));
                this.tabHost.performTabsLayout(indexes);
                this.saveState(this.elementDialog.offsetLeft, this.elementDialog.offsetTop);
            } });
        } else this.elementDialog.appendChild(this.panel.elementPanel);
        this.draggable = new DraggableContainer(this, this.panel, this.elementDialog, dragHandle);

        const resizeDirection: ResizeDirection = this.disableResize
            ? ResizeDirection.None
            : ResizeDirection.All & ~ResizeDirection.NorthEast;
            
        this.resizable = new ResizableContainer(this, this.draggable, this.draggable.topLevelElement, resizeDirection);

        this.dockManager.config.dialogRootElement.appendChild(this.elementDialog);
        this.elementDialog.classList.add('dialog-floating');

        this.focusHandler = new EventHandler(this.elementDialog, 'focus', this.onFocus.bind(this), true);
        this.mouseDownHandler = new EventHandler(this.elementDialog, 'pointerdown', this.onMouseDown.bind(this), true);
        this.keyPressHandler = new EventHandler(this.elementDialog, 'keypress', this.dockManager.onKeyPressBound, true);

        this.resize(this.panel.elementPanel.clientWidth, this.panel.elementPanel.clientHeight);
        this.isHidden = false;

        if (this.grayoutParent != null) {
            this.grayoutParent.grayOut(true);
        }
        this.bringToFront();
    }

    setPosition(x: number, y: number) {
        let rect = this.dockManager.config.dialogRootElement.getBoundingClientRect();
        let left = x - rect.left;
        let top = y - rect.top;
        this.position = new Point(left, top);
        this.elementDialog.style.left = left + 'px';
        this.elementDialog.style.top = top + 'px';
        this.updateContentPosition(left, top);
        this.dockManager.notifyOnChangeDialogPosition(this, x, y);
    }

    getPosition(): Point {
        return new Point(this.position ? this.position.x : 0, this.position ? this.position.y : 0);
    }

    onFocus() {
        const panel = this.tabHost?.activeTab?.panel ?? this.panel;
        if (this.dockManager.activePanel != panel)
            this.dockManager.activePanel = panel;
    }

    onMouseDown(e: PointerEvent) {
        if (e.button != 2)
            this.bringToFront();
    }

    destroy() {
        this.panels.forEach(panel => {
            panel.lastDialogSize = this.tabHost
                ? { width: this.elementDialog.clientWidth, height: this.elementDialog.clientHeight }
                : { width: this.resizable.width, height: this.resizable.height };
        });
        this.tabHost?.destroy();

        if (this.focusHandler) {
            this.focusHandler.cancel();
            delete this.focusHandler;
        }
        if (this.mouseDownHandler) {
            this.mouseDownHandler.cancel();
            delete this.mouseDownHandler;
        }
        if (this.keyPressHandler) {
            this.keyPressHandler.cancel();
            delete this.keyPressHandler;
        }

        Utils.removeNode(this.elementDialog);
        this.draggable.removeDecorator();
        Utils.removeNode(this.panel.elementPanel);
        Utils.arrayRemove(this.dockManager.context.model.dialogs, this);
        this.panels.forEach(panel => { panel.floatingDialog = undefined; });

        if (this.grayoutParent) {
            this.grayoutParent.grayOut(false);
        }
    }

    resize(width: number, height: number): Promise<void> {
        return this.resizable.resize(width, height);
    }

    resizeContent(width: number, height: number): Promise<void> {
        if (!this.tabHost) return this.panel.resize(width, height);
        this.elementDialog.style.width = width + 'px';
        this.elementDialog.style.height = height + 'px';
        this.groupHeader.style.width = width + 'px';
        return this.tabHost.resize(width, Math.max(0, height - this.groupHeader.clientHeight));
    }

    updateContentPosition(x: number, y: number) {
        if (!this.tabHost) this.panel.setDialogPosition(x, y);
        else {
            const rect = this.tabHost.contentElement.getBoundingClientRect();
            const root = this.dockManager.config.dialogRootElement.getBoundingClientRect();
            this.panels.forEach(panel => {
                panel.elementContentContainer.style.left = (rect.left - root.left) + 'px';
                panel.elementContentContainer.style.top = (rect.top - root.top) + 'px';
            });
        }
    }

    /** Detach a member without closing the remaining tabs. */
    removePanel(panel: PanelContainer) {
        if (!this.tabHost) { this.destroy(); return; }
        Utils.arrayRemove(this.panels, panel);
        this.tabHost.performLayout(this.panels);
        panel.floatingDialog = undefined;
        panel.isDialog = false;
        if (!this.panels.length) { this.destroy(); return; }
        this.panel = this.panels[0];
        this.draggable.delegate = this.panel;
        if (!this.tabHost.activeTab) this.tabHost.setActiveTab(this.panel);
    }

    setTitle(title: string) {
        this.panel.setTitle(title);
    }

    setTitleIcon(iconName: string) {
        this.panel.setTitleIcon(iconName);
    }

    bringToFront() {
        this.panels.forEach(panel => { panel.elementContentContainer.style.zIndex = <any>this.dockManager.zIndexDialogCounter++; });
        this.elementDialog.style.zIndex = <any>this.dockManager.zIndexDialogCounter++;
        if (this.tabHost) this.panels.forEach(panel => {
            panel.elementContentContainer.style.zIndex = <any>this.dockManager.zIndexDialogCounter++;
        });
        this.dockManager.activePanel = this.tabHost?.activeTab?.panel ?? this.panel;
    }

    hide() {
        this.elementDialog.style.zIndex = '0';
        this.panel.elementContentContainer.style.zIndex = '';
        this.elementDialog.style.display = 'none';
        this.panels.forEach(panel => panel.setVisible(false));
        if (!this.isHidden) {
            this.isHidden = true;
            this.dockManager.notifyOnHideDialog(this);
        }
        if (this.grayoutParent) {
            this.grayoutParent.grayOut(false);
        }
    }

    close() {
        if (this.tabHost) {
            [...this.panels].forEach(panel => { if (!panel._hideCloseButton) panel.close(); });
            return;
        }
        this.hide();
        this.remove();
        this.dockManager.notifyOnClosePanel(this.panel);
        this.destroy();
    }

    remove() {
        this.elementDialog.parentNode.removeChild(this.elementDialog);
    }

    show() {
        this.panel.elementContentContainer.style.zIndex = <any>this.dockManager.zIndexDialogCounter++;
        this.elementDialog.style.zIndex = <any>this.dockManager.zIndexDialogCounter++;
        this.elementDialog.style.display = 'block';
        this.panels.forEach(panel => {
            panel.elementContentContainer.style.zIndex = <any>this.dockManager.zIndexDialogCounter++;
            panel.setVisible(!this.tabHost || this.tabHost.activeTab?.panel === panel);
        });
        if (this.isHidden) {
            this.isHidden = false;
            this.dockManager.notifyOnShowDialog(this);
        }
    }

    static createContextMenuContentCallback = (dialog: Dialog, documentMangerNodes: DockNode[]): Node[] => {
        if (!dialog.panel._hideCloseButton) {
            return [];
        }

        const result = [];

        let btnCloseDialog = document.createElement('div');
        btnCloseDialog.innerText = Localizer.getString('CloseDialog');
        result.push(btnCloseDialog);

        btnCloseDialog.onclick = () => {
            dialog.panel.closeContextMenu();
            dialog.panel.close();
        };

        if (dialog.dockManager.config.enableBrowserWindows) {
            let btnNewBrowserWindow = document.createElement('div');
            btnNewBrowserWindow.innerText = Localizer.getString('NewBrowserWindow');
            result.push(btnNewBrowserWindow);

            btnNewBrowserWindow.onclick = () => {
                dialog.panel.closeContextMenu();
                dialog.panel.undockToBrowserDialog();
            };
        }

        return result;
    }

    public createContextMenuItems(): Node[] {
        return Dialog.createContextMenuContentCallback(
            this, 
            this.dockManager.context.model.documentManagerNode.children);
    }
}
