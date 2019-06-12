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

/**
 * This dock container wraps the specified element on a panel frame with a title bar and close button
 */
export class PanelContainer implements IDockContainerWithSize {

    onTitleChanged: any;
    elementPanel: HTMLDivElement;
    elementTitle: HTMLDivElement;
    elementTitleText: HTMLDivElement;
    elementContentHost: HTMLDivElement;
    name: string;
    state: ISize;
    elementContent: HTMLElement & { resizeHandler?: any, _dockSpawnPanelContainer: PanelContainer };
    dockManager: DockManager;
    title: string;
    containerType: ContainerType;
    icon: string;
    minimumAllowedChildNodes: number;
    _floatingDialog?: Dialog;
    isDialog: boolean;
    _canUndock: boolean;
    eventListeners: any[];
    undockInitiator: UndockInitiator;
    elementButtonClose: HTMLDivElement;
    closeButtonClickedHandler: EventHandler;
    _cachedWidth: number;
    _cachedHeight: number;
    _hideCloseButton: boolean;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    panelType: PanelType;

    constructor(elementContent: HTMLElement, dockManager: DockManager, title?: string, panelType?: PanelType, hideCloseButton?: boolean) {
        if (!title)
            title = 'Panel';
        if (!panelType)
            panelType = PanelType.panel;
        this.panelType = panelType;
        this.elementContent = Object.assign(elementContent, { _dockSpawnPanelContainer: this });
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
        this._initialize();
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

    static loadFromState(state: IState, dockManager: DockManager) {
        let elementName = state.element;
        let elementContent = document.getElementById(elementName);
        if (elementContent === null) {
            return null;
        }
        let ret = new PanelContainer(elementContent, dockManager);
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

    _initialize() {
        this.name = Utils.getNextId('panel_');
        this.elementPanel = document.createElement('div');
        this.elementPanel.tabIndex = 0;
        this.elementTitle = document.createElement('div');
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
        let panelWidth = this.elementContent.clientWidth;
        let panelHeight = this.elementContent.clientHeight;
        let titleHeight = this.elementTitle.clientHeight;
        this._setPanelDimensions(panelWidth, panelHeight + titleHeight);

        if (!this._hideCloseButton) {
            this.closeButtonClickedHandler =
                new EventHandler(this.elementButtonClose, 'click', this.onCloseButtonClicked.bind(this));
        }

        Utils.removeNode(this.elementContent);
        this.elementContentHost.appendChild(this.elementContent);

        // Extract the title from the content element's attribute
        let contentTitle = this.elementContent.dataset.panelCaption;
        let contentIcon = this.elementContent.dataset.panelIcon;
        if (contentTitle) this.title = contentTitle;
        if (contentIcon) this.icon = contentIcon;
        this._updateTitle();

        this.undockInitiator = new UndockInitiator(this.elementTitle, this.performUndockToDialog.bind(this));
        delete this.floatingDialog;

        this.mouseDownHandler = new EventHandler(this.elementPanel, 'mousedown', this.onMouseDown.bind(this));
        this.touchDownHandler = new EventHandler(this.elementPanel, 'touchstart', this.onMouseDown.bind(this));

        this.elementContent.removeAttribute("hidden");
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

        Utils.removeNode(this.elementPanel);
        if (this.closeButtonClickedHandler) {
            this.closeButtonClickedHandler.cancel();
            delete this.closeButtonClickedHandler;
        }
    }

    /**
     * Undocks the panel and and converts it to a dialog box
     */
    performUndockToDialog(e, dragOffset: Point) {
        this.isDialog = true;
        this.undockInitiator.enabled = false;
        this.elementContent.style.display = "block";
        this.elementPanel.style.position = "";
        return this.dockManager.requestUndockToDialog(this, e, dragOffset);
    }

    /**
    * Closes the panel
    */
    performClose() {
        this.isDialog = true;
        this.undockInitiator.enabled = false;
        this.elementContent.style.display = "block";
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

    resize(width: number, height: number) {
        // if (this._cachedWidth === width && this._cachedHeight === height)
        // {
        //     // Already in the desired size
        //     return;
        // }
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
        this.elementContent.style.width = width + 'px';
        this.elementPanel.style.width = width + 'px';

        let titleBarHeight = this.elementTitle.clientHeight;
        let contentHeight = height - titleBarHeight;
        this.elementContentHost.style.height = contentHeight + 'px';
        this.elementContent.style.height = contentHeight + 'px';
        this.elementPanel.style.height = height + 'px';
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

    onCloseButtonClicked() {
        this.close();
    }

    close() {
        if (this.isDialog) {
            this.floatingDialog.hide();
            this.floatingDialog.remove();
        }
        else {
            this.performClose();
        }
        this.dockManager.notifyOnClosePanel(this);
    }
}