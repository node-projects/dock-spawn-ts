import { DockManager } from "./DockManager.js";
import { DockNode } from "./DockNode.js";
import { DraggableContainer } from "./DraggableContainer.js";
import { FloatingPanel } from "./FloatingPanel.js";
import { PanelContainer } from "./PanelContainer.js";
import { Point } from "./Point.js";
import { ResizableContainer } from "./ResizableContainer.js";
import { Utils } from "./Utils.js";
import { ResizeDirection } from "./enums/ResizeDirection.js";
import { Localizer } from "./i18n/Localizer.js";

export class Dialog extends FloatingPanel {
    draggable: DraggableContainer;
    resizable: ResizableContainer;
    eventListener: DockManager;
    noDocking: boolean;
    grayoutParent: PanelContainer;

    constructor(
        panel: PanelContainer,
        dockManager: DockManager,
        grayoutParent?: PanelContainer,
        disableResize?: boolean
    ) {
        super(panel, dockManager);
        this.grayoutParent = grayoutParent;
        this.eventListener = dockManager;

        this.draggable = new DraggableContainer(
            this,
            panel,
            this.element,
            panel.elementTitle);

        const resizeDirection: ResizeDirection = disableResize
            ? ResizeDirection.None
            : ResizeDirection.All & ~ResizeDirection.NorthEast;

        this.resizable = new ResizableContainer(
            this,
            this.draggable,
            this.draggable.topLevelElement,
            resizeDirection);

        this.decoratedContainer = this.resizable;
    }

    public override initialize(): void {
        this.grayoutParent?.grayOut(true);

        super.initialize();

        this.dockManager.context.model.dialogs.push(this);
        this.position = this.dockManager.defaultDialogPosition;
        this.dockManager.notifyOnCreateDialog(this);
    }

    public saveState(x: number, y: number): void {
        this.position = new Point(x, y);
        this.dockManager.notifyOnChangeDialogPosition(this, x, y);
    }

    public override setPosition(x: number, y: number): void {
        super.setPosition(x, y);
        this.dockManager.notifyOnChangeDialogPosition(this, x, y);
    }

    public getPosition(): Point {
        return new Point(this.position ? this.position.x : 0, this.position ? this.position.y : 0);
    }

    public override hide(): void {
        super.hide();
        this.grayoutParent?.grayOut(false);
    }

    public override destroy(): void {
        super.destroy();

        this.draggable.removeDecorator();
        this.resizable.removeDecorator();
        Utils.arrayRemove(this.dockManager.context.model.dialogs, this);
    }

    public static fromElement(id: string, dockManager: DockManager): Dialog {
        const dialog: Dialog = new Dialog(
            new PanelContainer(<HTMLElement>document.getElementById(id), dockManager),
            dockManager,
            null);

        dialog.initialize();

        return dialog;
    }

    public static createContextMenuContentCallback = (dialog: Dialog, documentMangerNodes: DockNode[]): Node[] => {
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

    protected override onShow(): void {
        this.dockManager.notifyOnShowDialog(this);
    }

    protected override onHide(): void {
        this.dockManager.notifyOnHideDialog(this);
    }

    public get elementDialog(): HTMLDivElement & { floatingPanel: FloatingPanel } {
        return this.element;
    }
}
