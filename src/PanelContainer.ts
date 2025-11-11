import { DockManager } from "./DockManager.js";
import { Utils } from "./Utils.js";
import { UndockInitiator } from "./UndockInitiator.js";
import { ContainerType } from "./ContainerType.js";
import { EventHandler } from "./EventHandler.js";
import { ISize } from "./interfaces/ISize.js";
import { IDockContainerWithSize } from "./interfaces/IDockContainerWithSize.js";
import { IState } from "./interfaces/IState.js";
import { Point } from "./Point.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { PanelType } from "./enums/PanelType.js";
import { Dialog } from "./Dialog.js";
import { TabPage } from './TabPage.js';
import { Localizer } from "./i18n/Localizer.js";
import { moveElementToNewBrowserWindow } from "./BrowserDialogHelper.js";

/**
 * This dock container wraps the specified element on a panel frame with a title bar and close button
 */
export class PanelContainer implements IDockContainerWithSize {

    public closePanelContainerCallback: (panelContainer: PanelContainer) => Promise<boolean>;

    onTitleChanged: (panelContainer: PanelContainer, title: string) => void;
    elementPanel: HTMLDivElement;
    elementTitle: HTMLDivElement;
    elementTitleText: HTMLDivElement;
    elementContentHost: HTMLDivElement;
    name: string;
    state: ISize;
    elementContent: HTMLElement & { resizeHandler?: any, _dockSpawnPanelContainer: PanelContainer };
    private _resolvedElementContent: HTMLElement;
    elementContentContainer: HTMLElement;
    elementContentWrapper: HTMLElement;
    dockManager: DockManager;
    title: string;
    containerType: ContainerType;
    icon: string;
    hasChanges: boolean;
    minimumAllowedChildNodes: number;
    isDialog: boolean;
    eventListeners: any[];
    undockInitiator: UndockInitiator;
    elementButtonClose: HTMLDivElement;
    closeButtonClickedHandler: EventHandler;
    closeButtonTouchedHandler: EventHandler;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    panelType: PanelType;
    tabPage?: TabPage;
    undockedToNewBrowserWindow = false;
    contextMenuHandler: EventHandler;

    lastDialogSize?: ISize;

    _floatingDialog?: Dialog;
    _canUndock: boolean;
    _cachedWidth: number;
    _cachedHeight: number;
    _hideCloseButton: boolean;
    _grayOut: HTMLDivElement;
    _ctxMenu: HTMLDivElement;

    constructor(elementContent: HTMLElement, dockManager: DockManager, title?: string, panelType?: PanelType, hideCloseButton?: boolean) {
        if (!title)
            title = Localizer.getString('DefaultPanelName');
        if (!panelType)
            panelType = PanelType.panel;
        this.panelType = panelType;

        (<any>elementContent)._dockSpawnPanelContainer = this;
        this.elementContent = <any>elementContent;
        elementContent.style.position = 'absolute'
        elementContent.style.width = '100%'
        elementContent.style.height = '100%'
        elementContent.style.top = '0'
        elementContent.style.bottom = '0'
        this.elementContentContainer = document.createElement('div');
        this.elementContentContainer.className = 'panel-element-content-container';
        this.elementContentContainer.style.position = 'absolute';
        (<any>this.elementContentContainer)._panel = this;
        this.elementContentContainer.addEventListener('pointerdown', (e) => {
            try {
                if (this.isDialog) {
                    this._floatingDialog.bringToFront();
                } else {
                    if (this.tabPage)
                        this.tabPage.setSelected(true, true);
                }
                this.dockManager.activePanel = this;
            }
            catch { }
        }, { passive: true });
        this.elementContentContainer.appendChild(elementContent);
        dockManager.config.dialogRootElement.appendChild(this.elementContentContainer);

        this.dockManager = dockManager;
        this.title = title;
        this.containerType = ContainerType.panel;
        this.icon = null;
        this.minimumAllowedChildNodes = 0;
        this._floatingDialog = undefined;
        this.isDialog = false;
        this._canUndock = dockManager._undockEnabled;
        this.eventListeners = [];
        this._hideCloseButton = hideCloseButton;
        this.windowsContextMenuClose = this.windowsContextMenuClose.bind(this);

        this._initialize();
    }

    _initialize() {
        this.name = Utils.getNextId('panel_');
        this.elementPanel = document.createElement('div');
        this.elementPanel.tabIndex = 0;
        this.elementTitle = document.createElement('div');
        this.contextMenuHandler = new EventHandler(this.elementTitle, 'contextmenu', this.oncontextMenuClicked.bind(this));

        this.elementTitleText = document.createElement('div');
        this.elementContentHost = document.createElement('div');
        this.elementButtonClose = document.createElement('div');

        this.elementPanel.appendChild(this.elementTitle);
        this.elementTitle.appendChild(this.elementTitleText);
        this.elementTitle.appendChild(this.elementButtonClose);
        this.elementButtonClose.classList.add('panel-titlebar-button-close');
        this.elementButtonClose.style.display = this._hideCloseButton ? 'none' : 'block';

        this.elementPanel.appendChild(this.elementContentHost);

        this.elementPanel.classList.add('panel-base');
        this.elementTitle.classList.add('panel-titlebar');
        this.elementTitle.classList.add('disable-selection');
        this.elementTitleText.classList.add('panel-titlebar-text');
        this.elementContentHost.classList.add('panel-content');

        // set the size of the dialog elements based on the panel's size
        let panelWidth = this.elementContentContainer.clientWidth;
        let panelHeight = this.elementContentContainer.clientHeight;
        let titleHeight = this.elementTitle.clientHeight;

        this.elementContentWrapper = document.createElement("div");
        this.elementContentWrapper.classList.add('panel-content-wrapper');

        this._setPanelDimensions(panelWidth, panelHeight + titleHeight);

        if (!this._hideCloseButton) {
            this.closeButtonClickedHandler =
                new EventHandler(this.elementButtonClose, 'mousedown', this.onCloseButtonClicked.bind(this));
            this.closeButtonTouchedHandler =
                new EventHandler(this.elementButtonClose, 'touchstart', this.onCloseButtonClicked.bind(this));
        }

        Utils.removeNode(this.elementContentWrapper);
        this.elementContentHost.appendChild(this.elementContentWrapper);

        // Extract the title from the content element's attribute
        let contentTitle = this.elementContent.dataset.panelCaption;
        let contentIcon = this.elementContent.dataset.panelIcon;
        if (contentTitle) this.title = contentTitle;
        if (contentIcon) this.icon = contentIcon;
        this._updateTitle();

        this.undockInitiator = new UndockInitiator(this.elementTitle, this.performUndockToDialog.bind(this));
        delete this.floatingDialog;

        this.mouseDownHandler = new EventHandler(this.elementPanel, 'mousedown', this.onMouseDown.bind(this));
        this.touchDownHandler = new EventHandler(this.elementPanel, 'touchstart', this.onMouseDown.bind(this), { passive: true });

        this._resolvedElementContent = this.elementContent;
        if (this.elementContent instanceof HTMLSlotElement) {
            this._resolvedElementContent = <HTMLElement>this.elementContent.assignedElements()?.[0];
        }
    }

    static createContextMenuContentCallback = (panelContainer: PanelContainer): Node[] => {
        const result = [];

        if (panelContainer.dockManager.config.enableBrowserWindows) {
            let btnNewBrowserWindow = document.createElement('div');
            btnNewBrowserWindow.innerText = Localizer.getString('NewBrowserWindow');
            result.push(btnNewBrowserWindow);

            btnNewBrowserWindow.onclick = () => {
                panelContainer.undockToBrowserDialog();
                panelContainer.closeContextMenu();
            };
        }

        return result;
    }

    oncontextMenuClicked(e: MouseEvent) {
        e.preventDefault();

        if (!this._ctxMenu && PanelContainer.createContextMenuContentCallback) {
            const menuItems = PanelContainer.createContextMenuContentCallback(this);

            if (menuItems.length == 0) {
                return;
            }

            this._ctxMenu = document.createElement('div');
            this._ctxMenu.className = 'dockspab-tab-handle-context-menu';
            this._ctxMenu.append(...menuItems);
            this._ctxMenu.style.left = e.pageX + "px";
            this._ctxMenu.style.top = e.pageY + "px";
            document.body.appendChild(this._ctxMenu);
            window.addEventListener('mouseup', this.windowsContextMenuClose);
        } else {
            this.closeContextMenu();
        }
    }

    closeContextMenu() {
        if (this._ctxMenu) {
            document.body.removeChild(this._ctxMenu);
            delete this._ctxMenu;
            window.removeEventListener('mouseup', this.windowsContextMenuClose);
        }
    }

    windowsContextMenuClose(e: Event) {
        let cp = e.composedPath();
        for (let i in cp) {
            let el = cp[i];
            if (el == this._ctxMenu)
                return;
        }
        this.closeContextMenu();
    }

    canUndock(state: boolean) {
        this._canUndock = state;
        this.undockInitiator.enabled = state;
        this.eventListeners.forEach((listener) => {
            if (listener.onDockEnabled) {
                listener.onDockEnabled({ self: this, state: state });
            }
        });
    }

    addListener(listener) {
        this.eventListeners.push(listener);
    }

    removeListener(listener) {
        this.eventListeners.splice(this.eventListeners.indexOf(listener), 1);
    }

    get floatingDialog(): Dialog {
        return this._floatingDialog;
    }
    set floatingDialog(value: Dialog) {
        this._floatingDialog = value;
        let canUndock = (this._floatingDialog === undefined);
        this.undockInitiator.enabled = canUndock;
    }

    static async loadFromState(state: IState, dockManager: DockManager) {
        let elementContent: HTMLElement;
        let title: string;
        if (!dockManager.getElementCallback) {
            let elementName = state.element;
            elementContent = document.getElementById(elementName);
        } else {
            let res = await dockManager.getElementCallback(state);
            elementContent = res.element;
            title = res.title;
        }

        if (elementContent === null) {
            return null;
        }
        let ret = new PanelContainer(elementContent, dockManager, title);
        ret.loadState(state);
        return ret;
    }

    saveState(state: IState) {
        state.element = this.elementContent.id;
        state.width = this.width;
        state.height = this.height;
        state.canUndock = this._canUndock;
        state.hideCloseButton = this._hideCloseButton;
        state.panelType = this.panelType;
    }

    loadState(state: IState) {
        this.width = state.width;
        this.height = state.height;
        this.state = { width: state.width, height: state.height };
        this.canUndock(state.canUndock)
        this.hideCloseButton(state.hideCloseButton);
        this.panelType = state.panelType;
    }

    setActiveChild(/*child*/) {
    }

    get containerElement() {
        return this.elementPanel;
    }

    grayOut(show: boolean) {
        if (!show && this._grayOut) {
            this.elementContentWrapper.removeChild(this._grayOut);
            this.elementButtonClose.style.display = this._hideCloseButton ? 'none' : 'block';
            this._grayOut = null;
            if (!this._hideCloseButton)
                this.eventListeners.forEach((listener) => {
                    if (listener.onHideCloseButton) {
                        listener.onHideCloseButton({ self: this, state: this._hideCloseButton });
                    }
                });
        }
        else if (show && !this._grayOut) {
            this._grayOut = document.createElement('div');
            this._grayOut.className = 'panel-grayout';
            this.elementButtonClose.style.display = 'none';
            this.elementContentWrapper.appendChild(this._grayOut);
            this.eventListeners.forEach((listener) => {
                if (listener.onHideCloseButton) {
                    listener.onHideCloseButton({ self: this, state: true });
                }
            });
        }
    }

    onMouseDown() {
        this.dockManager.activePanel = this;
    }

    hideCloseButton(state: boolean) {
        this._hideCloseButton = state;
        this.elementButtonClose.style.display = state ? 'none' : 'block';
        this.eventListeners.forEach((listener) => {
            if (listener.onHideCloseButton) {
                listener.onHideCloseButton({ self: this, state: state });
            }
        });
    }

    destroy() {
        if (this.mouseDownHandler) {
            this.mouseDownHandler.cancel();
            delete this.mouseDownHandler;
        }
        if (this.touchDownHandler) {
            this.touchDownHandler.cancel();
            delete this.touchDownHandler;
        }
        if (this.contextMenuHandler) {
            this.contextMenuHandler.cancel();
        }

        Utils.removeNode(this.elementPanel);
        if (this.closeButtonClickedHandler) {
            this.closeButtonClickedHandler.cancel();
            delete this.closeButtonClickedHandler;
        }
        if (this.closeButtonTouchedHandler) {
            this.closeButtonTouchedHandler.cancel();
            delete this.closeButtonTouchedHandler;
        }
    }

    /**
     * Undocks the panel and and converts it to a dialog box
     */
    performUndockToDialog(e, dragOffset: Point) {
        this.isDialog = true;
        this.undockInitiator.enabled = false;
        this.elementContentWrapper.style.display = "block";
        this.elementPanel.style.position = "";
        return this.dockManager.requestUndockToDialog(this, e, dragOffset);
    }

    /**
    * Closes the panel
    */
    private performClose() {
        this.isDialog = true;
        this.undockInitiator.enabled = false;
        this.elementContentWrapper.style.display = "block";
        this.elementContentContainer.style.visibility = 'hidden';
        this.elementPanel.style.position = "";
        this.dockManager.requestClose(this);
    }

    /**
     * Undocks the container and from the layout hierarchy
     * The container would be removed from the DOM
     */
    performUndock() {
        this.undockInitiator.enabled = false;
        this.dockManager.requestUndock(this);
    };

    prepareForDocking() {
        this.isDialog = false;
        this.undockInitiator.enabled = this._canUndock;
        if (this.elementContentContainer.parentElement != this.dockManager.config.dialogRootElement)
            this.dockManager.config.dialogRootElement.appendChild(this.elementContentContainer);
    }

    get width(): number {
        return this._cachedWidth;
    }
    set width(value: number) {
        if (value !== this._cachedWidth) {
            this._cachedWidth = value;
            this.elementPanel.style.width = value + 'px';
        }
    }

    get height(): number {
        return this._cachedHeight;
    }
    set height(value: number) {
        if (value !== this._cachedHeight) {
            this._cachedHeight = value;
            this.elementPanel.style.height = value + 'px';
        }
    }

    get resolvedElementContent(): HTMLElement {
        if (this._resolvedElementContent)
            return this._resolvedElementContent;
        this._resolvedElementContent = this.elementContent;
        if (this.elementContent instanceof HTMLSlotElement) {
            this._resolvedElementContent = <HTMLElement>this.elementContent.assignedElements()?.[0];
        }
        return this._resolvedElementContent;
    }

    private panelDocked() {
        if (this.elementContent.hidden)
            this.elementContent.hidden = false;
        if (this.elementContentContainer.parentElement !== this.dockManager.config.dialogRootElement)
            this.dockManager.config.dialogRootElement.appendChild(this.elementContentContainer);
    }

    resize(width: number, height: number) {
        // if (this._cachedWidth === width && this._cachedHeight === height)
        // {
        //     // Already in the desired size
        //     return;
        // }
        this.panelDocked();
        this.setVisible(true);
        this._setPanelDimensions(width, height);
        this._cachedWidth = width;
        this._cachedHeight = height;
        try {
            if (this.elementContent != undefined && (typeof this.elementContent.resizeHandler == 'function'))
                this.elementContent.resizeHandler(width, height - this.elementTitle.clientHeight);
        } catch (err) {
            console.log("error calling resizeHandler:", err, " elt:", this.elementContent);
        }
    }

    _setPanelDimensions(width: number, height: number) {
        this.elementTitle.style.width = width + 'px';
        this.elementContentHost.style.width = width + 'px';
        this.elementContentContainer.style.width = width + 'px';
        this.elementPanel.style.width = width + 'px';

        let titleBarHeight = this.elementTitle.clientHeight;
        let contentHeight = height - titleBarHeight;
        this.elementContentHost.style.height = contentHeight + 'px';
        this.elementContentContainer.style.height = contentHeight + 'px';
        this.elementPanel.style.height = height + 'px';

        //if (this.elementContentContainer.parentElement != this.dockManager.config.dialogRootElement)
        //    this.dockManager.config.dialogRootElement.appendChild(this.elementContentContainer);
        requestAnimationFrame(() => {
            const rect = this.elementContentWrapper.getBoundingClientRect();
            const rootRect = this.dockManager.config.dialogRootElement.getBoundingClientRect();
            this.elementContentContainer.style.left = (rect.x - rootRect.x) + 'px';
            this.elementContentContainer.style.top = (rect.y - rootRect.y) + 'px';
            this.elementContentContainer.style.width = rect.width + 'px';
            this.elementContentContainer.style.height = rect.height + 'px';
        });
    }

    setDialogPosition(x: number, y: number) {
        this.elementContentContainer.style.left = x + 'px';
        //todo, 25px if it is a dialog, is it always 25px? where do we know...
        this.elementContentContainer.style.top = (y + this.elementTitle.clientHeight) + 'px';
    }

    setVisible(isVisible: boolean) {
        this.elementContentContainer.style.visibility = isVisible ? '' : 'hidden';
    }

    setTitle(title: string) {
        this.title = title;
        this._updateTitle();
        if (this.onTitleChanged)
            this.onTitleChanged(this, title);
    }

    setTitleIcon(icon: string) {
        this.icon = icon;
        this._updateTitle();
        if (this.onTitleChanged)
            this.onTitleChanged(this, this.title);
    }

    setHasChanges(changes: boolean) {
        this.hasChanges = changes;
        this._updateTitle();
        if (changes) {
            this.elementTitleText.classList.add('panel-has-changes')
        } else {
            this.elementTitleText.classList.remove('panel-has-changes')
        }
        if (this.onTitleChanged)
            this.onTitleChanged(this, this.title);
    }

    setCloseIconTemplate(closeIconTemplate: string) {
        this.elementButtonClose.innerHTML = closeIconTemplate;
    }

    _updateTitle() {
        if (this.icon !== null) {
            this.elementTitleText.innerHTML = '<img class="panel-titlebar-icon" src="' + this.icon + '"><span>' + this.title + '</span>';
            return;
        }
        this.elementTitleText.innerHTML = this.title;
    }

    getRawTitle() {
        return this.elementTitleText.innerHTML;
    }

    performLayout(children: IDockContainer[], relayoutEvenIfEqual: boolean) {
    }

    onCloseButtonClicked(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
    }

    undockToBrowserDialog() {
        moveElementToNewBrowserWindow(this, {
            title: this.elementTitleText.textContent,
            closeCallback: () => {
                this.undockedToNewBrowserWindow = true;
                this.closeInternal(false);
            },
            newWindowClosedCallback: () => {
                this.undockedToNewBrowserWindow = false;
                this.dockManager.notifyOnClosePanel(this);
            },
            focused: (e) => {
                this.dockManager.activePanel = this;
            },
            blured: (e) => {
                this.dockManager.activePanel = null;
            }
        });
    }

    async close() {
        this.closeInternal(true);
    }

    private async closeInternal(runCallback: boolean) {
        let close = true;

        if (this.elementContentContainer.parentElement === this.dockManager.config.dialogRootElement) {
            if (!runCallback)
                close = true;
            else if (this.closePanelContainerCallback)
                close = await this.closePanelContainerCallback(this);
            else if (this.dockManager.closePanelContainerCallback)
                close = await this.dockManager.closePanelContainerCallback(this);

            if (close) {
                this.dockManager.config.dialogRootElement.removeChild(this.elementContentContainer);

                if (this.isDialog) {
                    if (this.floatingDialog) {
                        //this.floatingDialog.hide();
                        this.floatingDialog.close(); // fires onClose notification
                    }
                }
                else {
                    try {
                        this.dockManager.notifyOnClosePanel(this);
                    } catch (err) {
                        console.error(err);
                    }
                    this.performClose();
                }
            }
        }
    }
}