import { Utils } from "./Utils.js";
import { UndockInitiator } from "./UndockInitiator.js";
import { ContainerType } from "./ContainerType.js";
import { EventHandler } from "./EventHandler.js";
import { PanelType } from "./enums/PanelType.js";
import { Localizer } from "./i18n/Localizer.js";
import { moveElementToNewBrowserWindow } from "./BrowserDialogHelper.js";
/**
 * This dock container wraps the specified element on a panel frame with a title bar and close button
 */
export class PanelContainer {
    constructor(elementContent, dockManager, title, panelType, hideCloseButton) {
        if (!title)
            title = Localizer.getString('DefaultPanelName');
        if (!panelType)
            panelType = PanelType.panel;
        this.panelType = panelType;
        elementContent._dockSpawnPanelContainer = this;
        this.elementContent = elementContent;
        elementContent.style.position = 'absolute';
        elementContent.style.width = '100%';
        elementContent.style.height = '100%';
        elementContent.style.top = '0';
        elementContent.style.bottom = '0';
        this.elementContentContainer = document.createElement('div');
        this.elementContentContainer.className = 'panel-element-content-container';
        this.elementContentContainer.style.position = 'absolute';
        this.elementContentContainer._panel = this;
        this.elementContentContainer.addEventListener('pointerdown', () => {
            if (this.isDialog) {
                this._floatingDialog.bringToFront();
            }
            else {
                if (this.tabPage)
                    this.tabPage.setSelected(true, true);
            }
            this.dockManager.activePanel = this;
        });
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
        this._initialize();
    }
    canUndock(state) {
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
    get floatingDialog() {
        return this._floatingDialog;
    }
    set floatingDialog(value) {
        this._floatingDialog = value;
        let canUndock = (this._floatingDialog === undefined);
        this.undockInitiator.enabled = canUndock;
    }
    static async loadFromState(state, dockManager) {
        let elementContent;
        let title;
        if (!dockManager.getElementCallback) {
            let elementName = state.element;
            elementContent = document.getElementById(elementName);
        }
        else {
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
    saveState(state) {
        state.element = this.elementContent.id;
        state.width = this.width;
        state.height = this.height;
        state.canUndock = this._canUndock;
        state.hideCloseButton = this._hideCloseButton;
        state.panelType = this.panelType;
    }
    loadState(state) {
        this.width = state.width;
        this.height = state.height;
        this.state = { width: state.width, height: state.height };
        this.canUndock(state.canUndock);
        this.hideCloseButton(state.hideCloseButton);
        this.panelType = state.panelType;
    }
    setActiveChild( /*child*/) {
    }
    get containerElement() {
        return this.elementPanel;
    }
    grayOut(show) {
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
        if (contentTitle)
            this.title = contentTitle;
        if (contentIcon)
            this.icon = contentIcon;
        this._updateTitle();
        this.undockInitiator = new UndockInitiator(this.elementTitle, this.performUndockToDialog.bind(this));
        delete this.floatingDialog;
        this.mouseDownHandler = new EventHandler(this.elementPanel, 'mousedown', this.onMouseDown.bind(this));
        this.touchDownHandler = new EventHandler(this.elementPanel, 'touchstart', this.onMouseDown.bind(this), { passive: true });
    }
    onMouseDown() {
        this.dockManager.activePanel = this;
    }
    hideCloseButton(state) {
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
        if (this.closeButtonTouchedHandler) {
            this.closeButtonTouchedHandler.cancel();
            delete this.closeButtonTouchedHandler;
        }
    }
    /**
     * Undocks the panel and and converts it to a dialog box
     */
    performUndockToDialog(e, dragOffset) {
        this.isDialog = true;
        this.undockInitiator.enabled = false;
        this.elementContentWrapper.style.display = "block";
        this.elementPanel.style.position = "";
        return this.dockManager.requestUndockToDialog(this, e, dragOffset);
    }
    /**
    * Closes the panel
    */
    performClose() {
        this.isDialog = true;
        this.undockInitiator.enabled = false;
        this.elementContentWrapper.style.display = "block";
        this.elementContentContainer.style.display = 'none';
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
    }
    ;
    prepareForDocking() {
        this.isDialog = false;
        this.undockInitiator.enabled = this._canUndock;
        if (this.elementContentContainer.parentElement != this.dockManager.config.dialogRootElement)
            this.dockManager.config.dialogRootElement.appendChild(this.elementContentContainer);
    }
    get width() {
        return this._cachedWidth;
    }
    set width(value) {
        if (value !== this._cachedWidth) {
            this._cachedWidth = value;
            this.elementPanel.style.width = value + 'px';
        }
    }
    get height() {
        return this._cachedHeight;
    }
    set height(value) {
        if (value !== this._cachedHeight) {
            this._cachedHeight = value;
            this.elementPanel.style.height = value + 'px';
        }
    }
    panelDocked() {
        if (this.elementContent.hidden)
            this.elementContent.hidden = false;
        this.dockManager.config.dialogRootElement.appendChild(this.elementContentContainer);
    }
    resize(width, height) {
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
        }
        catch (err) {
            console.log("error calling resizeHandler:", err, " elt:", this.elementContent);
        }
    }
    _setPanelDimensions(width, height) {
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
        const rect = this.elementContentWrapper.getBoundingClientRect();
        const rootRect = this.dockManager.config.dialogRootElement.getBoundingClientRect();
        this.elementContentContainer.style.left = (rect.x - rootRect.x) + 'px';
        this.elementContentContainer.style.top = (rect.y - rootRect.y) + 'px';
        this.elementContentContainer.style.width = rect.width + 'px';
        this.elementContentContainer.style.height = rect.height + 'px';
    }
    setDialogPosition(x, y) {
        this.elementContentContainer.style.left = x + 'px';
        //todo, 25px if it is a dialog, is it always 25px? where do we know...
        this.elementContentContainer.style.top = (y + this.elementTitle.clientHeight) + 'px';
    }
    setVisible(isVisible) {
        this.elementContentContainer.style.display = isVisible ? 'block' : 'none';
    }
    setTitle(title) {
        this.title = title;
        this._updateTitle();
        if (this.onTitleChanged)
            this.onTitleChanged(this, title);
    }
    setTitleIcon(icon) {
        this.icon = icon;
        this._updateTitle();
        if (this.onTitleChanged)
            this.onTitleChanged(this, this.title);
    }
    setHasChanges(changes) {
        this.hasChanges = changes;
        this._updateTitle();
        if (changes) {
            this.elementTitleText.classList.add('panel-has-changes');
        }
        else {
            this.elementTitleText.classList.remove('panel-has-changes');
        }
        if (this.onTitleChanged)
            this.onTitleChanged(this, this.title);
    }
    setCloseIconTemplate(closeIconTemplate) {
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
    performLayout(children, relayoutEvenIfEqual) {
    }
    onCloseButtonClicked(e) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
    }
    undockToBrowserDialog() {
        moveElementToNewBrowserWindow(this.elementContent, {
            title: '',
            closeCallback: () => { },
            newWindowClosedCallback: () => { },
            focused: (e) => {
                this.dockManager.activePanel = this;
            },
            blured: (e) => {
                this.dockManager.activePanel = null;
            }
        });
        this.closeInternal(false);
    }
    async close() {
        this.closeInternal(true);
    }
    async closeInternal(runCallback) {
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
                    }
                    catch (err) {
                        console.error(err);
                    }
                    this.performClose();
                }
            }
        }
    }
}
//# sourceMappingURL=PanelContainer.js.map