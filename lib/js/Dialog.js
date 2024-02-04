import { Point } from "./Point.js";
import { PanelContainer } from "./PanelContainer.js";
import { DraggableContainer } from "./DraggableContainer.js";
import { ResizableContainer } from "./ResizableContainer.js";
import { EventHandler } from "./EventHandler.js";
import { Utils } from "./Utils.js";
import { Localizer } from "./i18n/Localizer.js";
export class Dialog {
    constructor(panel, dockManager, grayoutParent, disableResize) {
        this.panel = panel;
        this.dockManager = dockManager;
        this.eventListener = dockManager;
        this.grayoutParent = grayoutParent;
        this.disableResize = disableResize;
        this._initialize();
        this.dockManager.context.model.dialogs.push(this);
        this.position = dockManager.defaultDialogPosition;
        this.dockManager.notifyOnCreateDialog(this);
        panel.isDialog = true;
    }
    saveState(x, y) {
        this.position = new Point(x, y);
        this.dockManager.notifyOnChangeDialogPosition(this, x, y);
    }
    static fromElement(id, dockManager) {
        return new Dialog(new PanelContainer(document.getElementById(id), dockManager), dockManager, null);
    }
    _initialize() {
        this.panel.floatingDialog = this;
        this.elementDialog = Object.assign(document.createElement('div'), { floatingDialog: this });
        this.elementDialog.tabIndex = 0;
        this.elementDialog.appendChild(this.panel.elementPanel);
        this.draggable = new DraggableContainer(this, this.panel, this.elementDialog, this.panel.elementTitle);
        this.resizable = new ResizableContainer(this, this.draggable, this.draggable.topLevelElement, this.disableResize);
        this.dockManager.config.dialogRootElement.appendChild(this.elementDialog);
        this.elementDialog.classList.add('dialog-floating');
        this.focusHandler = new EventHandler(this.elementDialog, 'focus', this.onFocus.bind(this), true);
        this.mouseDownHandler = new EventHandler(this.elementDialog, 'pointerdown', this.onMouseDown.bind(this), true);
        this.keyPressHandler = new EventHandler(this.elementDialog, 'keypress', this.dockManager.onKeyPressBound, true);
        this.contextmenuHandler = new EventHandler(this.panel.elementTitle, 'contextmenu', this.oncontextMenuClicked.bind(this));
        this.resize(this.panel.elementPanel.clientWidth, this.panel.elementPanel.clientHeight);
        this.isHidden = false;
        if (this.grayoutParent != null) {
            this.grayoutParent.grayOut(true);
        }
        this.bringToFront();
    }
    setPosition(x, y) {
        let rect = this.dockManager.config.dialogRootElement.getBoundingClientRect();
        this.position = new Point(x - rect.left, y - rect.top);
        this.elementDialog.style.left = (x - rect.left) + 'px';
        this.elementDialog.style.top = (y - rect.top) + 'px';
        this.panel.setDialogPosition(x, y);
        this.dockManager.notifyOnChangeDialogPosition(this, x, y);
    }
    getPosition() {
        return new Point(this.position ? this.position.x : 0, this.position ? this.position.y : 0);
    }
    onFocus() {
        if (this.dockManager.activePanel != this.panel)
            this.dockManager.activePanel = this.panel;
    }
    onMouseDown(e) {
        if (e.button != 2)
            this.bringToFront();
    }
    destroy() {
        this.panel.lastDialogSize = { width: this.resizable.width, height: this.resizable.height };
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
        if (this.contextmenuHandler) {
            this.contextmenuHandler.cancel();
            delete this.contextmenuHandler;
        }
        Utils.removeNode(this.elementDialog);
        this.draggable.removeDecorator();
        Utils.removeNode(this.panel.elementPanel);
        Utils.arrayRemove(this.dockManager.context.model.dialogs, this);
        delete this.panel.floatingDialog;
        if (this.grayoutParent) {
            this.grayoutParent.grayOut(false);
        }
    }
    resize(width, height) {
        this.resizable.resize(width, height);
    }
    setTitle(title) {
        this.panel.setTitle(title);
    }
    setTitleIcon(iconName) {
        this.panel.setTitleIcon(iconName);
    }
    bringToFront() {
        this.panel.elementContentContainer.style.zIndex = this.dockManager.zIndexDialogCounter++;
        this.elementDialog.style.zIndex = this.dockManager.zIndexDialogCounter++;
        this.dockManager.activePanel = this.panel;
    }
    hide() {
        this.elementDialog.style.zIndex = '0';
        this.panel.elementContentContainer.style.zIndex = '';
        this.elementDialog.style.display = 'none';
        if (!this.isHidden) {
            this.isHidden = true;
            this.dockManager.notifyOnHideDialog(this);
        }
        if (this.grayoutParent) {
            this.grayoutParent.grayOut(false);
        }
    }
    close() {
        this.hide();
        this.remove();
        this.dockManager.notifyOnClosePanel(this.panel);
        this.destroy();
    }
    remove() {
        this.elementDialog.parentNode.removeChild(this.elementDialog);
    }
    show() {
        this.panel.elementContentContainer.style.zIndex = this.dockManager.zIndexDialogCounter++;
        this.elementDialog.style.zIndex = this.dockManager.zIndexDialogCounter++;
        this.elementDialog.style.display = 'block';
        if (this.isHidden) {
            this.isHidden = false;
            this.dockManager.notifyOnShowDialog(this);
        }
    }
    oncontextMenuClicked(e) {
        e.preventDefault();
        if (!this._ctxMenu && Dialog.createContextMenuContentCallback) {
            this._ctxMenu = document.createElement('div');
            this._ctxMenu.className = 'dockspab-tab-handle-context-menu';
            let res = Dialog.createContextMenuContentCallback(this, this._ctxMenu, this.dockManager.context.model.documentManagerNode.children);
            if (res !== false) {
                this._ctxMenu.style.left = e.pageX + "px";
                this._ctxMenu.style.top = e.pageY + "px";
                document.body.appendChild(this._ctxMenu);
                this._windowsContextMenuCloseBound = this.windowsContextMenuClose.bind(this);
                window.addEventListener('pointerup', this._windowsContextMenuCloseBound);
            }
            else {
                this._ctxMenu = null;
            }
        }
        else {
            this.closeContextMenu();
        }
    }
    closeContextMenu() {
        if (this._ctxMenu) {
            document.body.removeChild(this._ctxMenu);
            delete this._ctxMenu;
            window.removeEventListener('pointerup', this._windowsContextMenuCloseBound);
        }
    }
    windowsContextMenuClose(e) {
        let cp = e.composedPath();
        for (let i in cp) {
            let el = cp[i];
            if (el == this._ctxMenu)
                return;
        }
        this.closeContextMenu();
    }
}
Dialog.createContextMenuContentCallback = (dialog, contextMenuContainer, documentMangerNodes) => {
    if (!dialog.panel._hideCloseButton) {
        let btnCloseDialog = document.createElement('div');
        btnCloseDialog.innerText = Localizer.getString('CloseDialog');
        contextMenuContainer.append(btnCloseDialog);
        btnCloseDialog.onclick = () => {
            dialog.panel.close();
            dialog.closeContextMenu();
        };
        return true;
    }
    else {
        return false;
    }
};
//# sourceMappingURL=Dialog.js.map