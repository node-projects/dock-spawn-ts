import { DockManager } from "./DockManager";
import { Point } from "./Point";
import { PanelContainer } from "./PanelContainer";
import { DraggableContainer } from "./DraggableContainer";
import { ResizableContainer } from "./ResizableContainer";
import { EventHandler } from "./EventHandler";
import { Utils } from "./Utils";

export class Dialog {
    elementDialog: HTMLDivElement & { floatingDialog: Dialog };
    draggable: DraggableContainer;
    panel: PanelContainer;
    dockManager: DockManager;
    eventListener: DockManager;
    position: Point;
    resizable: ResizableContainer;
    mouseDownHandler: any;
    touchDownHandler: any;
    onKeyPressBound: any;
    isHidden: boolean;

    constructor(panel, dockManager: DockManager) {
        this.panel = panel;
        this.dockManager = dockManager;
        this.eventListener = dockManager;
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

    static fromElement(id, dockManager: DockManager) {
        return new Dialog(new PanelContainer(document.getElementById(id), dockManager), dockManager);
    }

    _initialize() {
        this.panel.floatingDialog = this;
        //@ts-ignore
        this.elementDialog = document.createElement('div');
        this.elementDialog.appendChild(this.panel.elementPanel);
        this.elementDialog.floatingDialog = this;
        this.draggable = new DraggableContainer(this, this.panel, this.elementDialog, this.panel.elementTitle);
        this.resizable = new ResizableContainer(this, this.draggable, this.draggable.topLevelElement);

        document.body.appendChild(this.elementDialog);
        this.elementDialog.classList.add('dialog-floating');
        this.elementDialog.classList.add('rounded-corner-top');
        this.panel.elementTitle.classList.add('rounded-corner-top');

        this.mouseDownHandler = new EventHandler(this.elementDialog, 'mousedown', this.onMouseDown.bind(this));
        this.touchDownHandler = new EventHandler(this.elementDialog, 'touchstart', this.onMouseDown.bind(this));
        this.onKeyPressBound = this.onKeyPress.bind(this);
        window.addEventListener('keydown', this.onKeyPressBound);
        this.resize(this.panel.elementPanel.clientWidth, this.panel.elementPanel.clientHeight);
        this.isHidden = false;
        this.bringToFront();
    }

    setPosition(x, y) {
        this.position = new Point(x, y);
        this.elementDialog.style.left = x + 'px';
        this.elementDialog.style.top = y + 'px';
        this.dockManager.notifyOnChangeDialogPosition(this, x, y);
    }

    getPosition(): Point {
        return new Point(this.position ? this.position.x : 0, this.position ? this.position.y : 0);
    }

    onKeyPress(e) {
        if (e.key == "Escape") {
            this.close();
        }
    }

    onMouseDown() {
        this.bringToFront();
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
        window.removeEventListener('keydown', this.onKeyPressBound);
        this.elementDialog.classList.remove('rounded-corner-top');
        this.panel.elementTitle.classList.remove('rounded-corner-top');
        Utils.removeNode(this.elementDialog);
        this.draggable.removeDecorator();
        Utils.removeNode(this.panel.elementPanel);
        this.dockManager.context.model.dialogs.remove(this);
        delete this.panel.floatingDialog;
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
        this.elementDialog.style.zIndex = <any>this.dockManager.zIndexCounter++;
    }

    hide() {
        this.elementDialog.style.zIndex = '0';
        this.elementDialog.style.display = 'none';
        if (!this.isHidden) {
            this.isHidden = true;
            this.dockManager.notifyOnHideDialog(this);
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
        this.elementDialog.style.zIndex = '1000';
        this.elementDialog.style.display = 'block';
        if (this.isHidden) {
            this.isHidden = false;
            this.dockManager.notifyOnShowDialog(this);
        }
    }
}