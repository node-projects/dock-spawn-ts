import { DockManager } from './DockManager.js';
import { EventHandler } from './EventHandler.js';
import { IContextMenuProvider } from './interfaces/IContextMenuProvider.js';
import { IDockContainer } from './interfaces/IDockContainer.js';
import { PanelContainer } from './PanelContainer.js';
import { Point } from './Point.js';
import { Utils } from './Utils.js';

export abstract class FloatingPanel implements IContextMenuProvider {
    public readonly panel: PanelContainer;
    public isHidden: boolean;

    protected decoratedContainer: IDockContainer;
    protected position: Point;
    protected readonly dockManager: DockManager;
    protected readonly keyPressHandler: EventHandler;
    protected readonly focusHandler: EventHandler;
    protected readonly mouseDownHandler: EventHandler;

    private _element: HTMLDivElement & { floatingPanel: FloatingPanel };

    public constructor(panel: PanelContainer, dockManager: DockManager) {
        this.panel = panel;
        this.dockManager = dockManager;
        this.panel.isDialog = true;
        this.panel.floatingPanel = this;
        this.isHidden = false;
        this.decoratedContainer = this.panel;

        this._element = Object.assign(document.createElement('div'), { floatingPanel: this });
        this._element.tabIndex = 0;
        this._element.appendChild(this.panel.elementPanel);

        this.focusHandler = new EventHandler(
            this.element,
            'focus',
            this.onFocus.bind(this),
            true);

        this.mouseDownHandler = new EventHandler(
            this.element,
            'pointerdown',
            this.onMouseDown.bind(this),
            true);

        this.keyPressHandler = new EventHandler(
            this.element,
            'keypress',
            this.dockManager.onKeyPressBound,
            true);
    }


    public initialize(): void {
        this.dockManager.config.dialogRootElement.appendChild(this.element);
        this.element.classList.add('dialog-floating');

        this.resize(
            this.panel.elementPanel.clientWidth,
            this.panel.elementPanel.clientHeight);

        this.bringToFront();
    }

    public abstract createContextMenuItems(): Node[];

    public bringToFront(): void {
        this.panel.elementContentContainer.style.zIndex = <any>this.dockManager.zIndexDialogCounter++;
        this.element.style.zIndex = <any>this.dockManager.zIndexDialogCounter++;
        this.dockManager.activePanel = this.panel;
    }

    public show(): void {
        this.panel.elementContentContainer.style.zIndex = <any>this.dockManager.zIndexDialogCounter++;
        this.element.style.zIndex = <any>this.dockManager.zIndexDialogCounter++;
        this.element.style.display = 'block';

        if (this.isHidden) {
            this.isHidden = false;
            this.onShow();
        }
    }

    public hide(): void {
        this.element.style.zIndex = '0';
        this.panel.elementContentContainer.style.zIndex = '';
        this.element.style.display = 'none';

        if (!this.isHidden) {
            this.isHidden = true;
            this.onHide();
        }
    }

    public remove(): void {
        Utils.removeNode(this.element);
    }

    public close(): void {
        this.hide();
        this.dockManager.notifyOnClosePanel(this.panel);
        this.destroy();
    }

    public destroy(): void {
        this.panel.lastDialogSize = {
            width: this.decoratedContainer.width,
            height: this.decoratedContainer.height
        };

        if (this.focusHandler) {
            this.focusHandler.cancel();
        }
        if (this.mouseDownHandler) {
            this.mouseDownHandler.cancel();
        }
        if (this.keyPressHandler) {
            this.keyPressHandler.cancel();
        }

        Utils.removeNode(this.element);
        Utils.removeNode(this.panel.elementPanel);
        this.panel.floatingPanel = undefined;
    }

    public resize(width: number, height: number): void {
        this.decoratedContainer.resize(width, height);
    }

    public setTitle(title: string): void {
        this.panel.setTitle(title);
    }

    public setTitleIcon(iconName: string): void {
        this.panel.setTitleIcon(iconName);
    }

    protected setPosition(x: number, y: number): void {
        const rect: DOMRect = this.dockManager
            .config
            .dialogRootElement
            .getBoundingClientRect();

        this.position = new Point(x - rect.left, y - rect.top);

        this.element.style.left = `${this.position.x}px`;
        this.element.style.top = `${this.position.y}px`;
        this.panel.setDialogPosition(x, y);
    }

    protected onShow(): void {
        //Empty
    }

    protected onHide(): void {
        //Empty
    }

    protected onFocus(): void {
        if (this.dockManager.activePanel != this.panel) {
            this.dockManager.activePanel = this.panel;
        }
    }

    protected onMouseDown(e: PointerEvent): void {
        if (e.button != 2)
            this.bringToFront();
    }

    public get element(): HTMLDivElement & { floatingPanel: FloatingPanel } {
        return this._element;
    }
}
