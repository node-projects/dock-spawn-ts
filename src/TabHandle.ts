import { TabPage } from "./TabPage.js";
import { PanelContainer } from "./PanelContainer.js";
import { UndockInitiator } from "./UndockInitiator.js";
import { EventHandler } from "./EventHandler.js";
import { Utils } from "./Utils.js";
import { PanelType } from "./enums/PanelType.js";

/**
 * A tab handle represents the tab button on the tab strip
 */
export class TabHandle {

    parent: TabPage;
    elementBase: HTMLDivElement;
    elementText: HTMLDivElement;
    elementCloseButton: HTMLDivElement;
    undockInitiator: UndockInitiator;
    mouseClickHandler: EventHandler;
    mouseDownHandler: EventHandler;
    closeButtonHandler: EventHandler;
    auxClickHandler: EventHandler;
    contextMenuHandler: EventHandler;
    moveThreshold: number;
    zIndexCounter: number;
    mouseMoveHandler: EventHandler;
    touchMoveHandler: EventHandler;
    mouseUpHandler: EventHandler;
    touchUpHandler: EventHandler;
    stargDragPosition: any;
    dragged: boolean;
    eventListeners: any[];
    undockListener: { onDockEnabled: (e: any) => void; onHideCloseButton: (e: any) => void; };

    prev: number;
    current: number;
    direction: number;
    _ctxMenu: HTMLDivElement;
    _removeCtxMenuBound: any;

    constructor(parent: TabPage) {
        this.parent = parent;
        let undockHandler = TabHandle.prototype._performUndock.bind(this);
        this.elementBase = document.createElement('div');
        this.elementText = document.createElement('div');
        this.elementCloseButton = document.createElement('div');
        this.elementBase.classList.add('dockspan-tab-handle');
        this.elementBase.classList.add('disable-selection'); // Disable text selection
        this.elementText.classList.add('dockspan-tab-handle-text');
        this.elementCloseButton.classList.add('dockspan-tab-handle-close-button');
        this.elementBase.appendChild(this.elementText);
        if (this.parent.host.displayCloseButton)
            this.elementBase.appendChild(this.elementCloseButton);
        if ((<PanelContainer>this.parent.container)._hideCloseButton)
            this.elementCloseButton.style.display = 'none';
        this.parent.host.tabListElement.appendChild(this.elementBase);

        let panel = parent.container as PanelContainer;
        let title = panel.getRawTitle();
        this.undockListener = {
            onDockEnabled: (e) => { this.undockEnabled(e.state); },
            onHideCloseButton: (e) => { this.hideCloseButton(e.state); }
        };
        this.eventListeners = [];
        panel.addListener(this.undockListener);

        this.elementText.innerHTML = title;
        this.elementText.title = this.elementText.innerText;

        this._bringToFront(this.elementBase);

        this.undockInitiator = new UndockInitiator(this.elementBase, undockHandler);
        this.undockInitiator.enabled = true;
        this.mouseClickHandler = new EventHandler(this.elementBase, 'click', this.onMouseClicked.bind(this));
        this.mouseDownHandler = new EventHandler(this.elementBase, 'mousedown', this.onMouseDown.bind(this));
        this.closeButtonHandler = new EventHandler(this.elementCloseButton, 'mousedown', this.onCloseButtonClicked.bind(this));
        this.auxClickHandler = new EventHandler(this.elementBase, 'auxclick', this.onCloseButtonClicked.bind(this));
        this.contextMenuHandler = new EventHandler(this.elementBase, 'contextmenu', this.oncontextMenuClicked.bind(this));

        this.moveThreshold = 3;
        this.zIndexCounter = 100;
    }

    addListener(listener) {
        this.eventListeners.push(listener);
    }

    removeListener(listener) {
        this.eventListeners.splice(this.eventListeners.indexOf(listener), 1);
    }

    undockEnabled(state: boolean) {
        this.undockInitiator.enabled = state;
    }

    oncontextMenuClicked(e: MouseEvent) {
        e.preventDefault();

        if (!this._ctxMenu) {
            this._ctxMenu = document.createElement('div');
            this._ctxMenu.className = 'dockspab-tab-handle-context-menu';

            let btnCloseAll = document.createElement('div');
            btnCloseAll.innerText = 'Close all documents';
            this._ctxMenu.append(btnCloseAll);

            let btnCloseAllButThis = document.createElement('div');
            btnCloseAllButThis.innerText = 'Close all documents but this';
            this._ctxMenu.append(btnCloseAllButThis);

            btnCloseAll.onclick = () => {
                let length = this.parent.container.dockManager.context.model.documentManagerNode.children.length;
                for (let i = length - 1; i >= 0; i--) {
                    let panel = (<PanelContainer>this.parent.container.dockManager.context.model.documentManagerNode.children[i].container);
                    if (panel.panelType == PanelType.document)
                        panel.close();
                }
                this._removeCtxMenu();
            };

            btnCloseAllButThis.onclick = () => {
                let length = this.parent.container.dockManager.context.model.documentManagerNode.children.length;
                for (let i = length - 1; i >= 0; i--) {
                    let panel = (<PanelContainer>this.parent.container.dockManager.context.model.documentManagerNode.children[i].container);
                    if (this.parent.container != panel && panel.panelType == PanelType.document)
                        panel.close();
                }
                this._removeCtxMenu();
            };

            this._ctxMenu.style.left = e.pageX + "px";
            this._ctxMenu.style.top = e.pageY + "px";
            document.body.appendChild(this._ctxMenu);
            this._removeCtxMenuBound = this._removeCtxMenu.bind(this)
            window.addEventListener('mousedown', this._removeCtxMenuBound);
        } else {
            this._removeCtxMenu();
        }
    }

    _removeCtxMenu() {
        if (this._ctxMenu) {
            setTimeout(() => {
                document.body.removeChild(this._ctxMenu);
                delete this._ctxMenu;
                window.removeEventListener('mousedown', this._removeCtxMenuBound);
            }, 100);
        }
    }

    onMouseDown(e) {
        //if(this.undockInitiator.enabled)
        //    this.undockInitiator.setThresholdPixels(10, false);
        if (this.mouseMoveHandler) {
            this.mouseMoveHandler.cancel();
            delete this.mouseMoveHandler;
        }
        if (this.touchMoveHandler) {
            this.touchMoveHandler.cancel();
            delete this.touchMoveHandler;
        }
        if (this.mouseUpHandler) {
            this.mouseUpHandler.cancel();
            delete this.mouseUpHandler;
        }
        if (this.touchUpHandler) {
            this.touchUpHandler.cancel();
            delete this.touchUpHandler;
        }
        this.stargDragPosition = e.clientX;
        this.mouseMoveHandler = new EventHandler(this.elementBase, 'mousemove', this.onMouseMove.bind(this));
        this.touchMoveHandler = new EventHandler(this.elementBase, 'touchmove', this.onMouseMove.bind(this));
        this.mouseUpHandler = new EventHandler(window, 'mouseup', this.onMouseUp.bind(this));
        this.touchUpHandler = new EventHandler(window, 'touchend', this.onMouseUp.bind(this));
    }

    onMouseUp() {
        //if(this.undockInitiator.enabled)
        //    this.undockInitiator.setThresholdPixels(10, true);
        if (this.elementBase) {
            this.elementBase.classList.remove('dockspan-tab-handle-dragged');
        }
        this.dragged = false;
        this.mouseMoveHandler.cancel();
        this.touchMoveHandler.cancel();
        this.mouseUpHandler.cancel();
        this.touchUpHandler.cancel();
        delete this.mouseMoveHandler;
        delete this.touchMoveHandler;
        delete this.mouseUpHandler;
        delete this.touchUpHandler;
    }

    generateMoveTabEvent(event, pos) {
        let contain = pos > event.rect.left && pos < event.rect.right;
        let m = Math.abs(event.bound - pos);
        if (m < this.moveThreshold && contain)
            this.moveTabEvent(this, event.state);
    }

    moveTabEvent(that, state) {
        that.eventListeners.forEach((listener) => {
            if (listener.onMoveTab) {
                listener.onMoveTab({ self: that, state: state });
            }
        });

    }

    onMouseMove(e) {
        if (Math.abs(this.stargDragPosition - e.clientX) < 10)
            return;
        if (this.elementBase != null) { //Todo: because of this is null, we need to drag 2 times, needs fix
            this.elementBase.classList.add('dockspan-tab-handle-dragged');
            this.dragged = true;
            this.prev = this.current;
            this.current = e.clientX;
            this.direction = this.current - this.prev;
            let tabRect = this.elementBase.getBoundingClientRect();
            let event = this.direction < 0
                ? { state: 'left', bound: tabRect.left, rect: tabRect }
                : { state: 'right', bound: tabRect.right, rect: tabRect };
            if (this.direction !== 0) this.generateMoveTabEvent(event, this.current);
        }
    }

    hideCloseButton(state) {
        this.elementCloseButton.style.display = state ? 'none' : 'block';
    }

    updateTitle() {
        if (this.parent.container instanceof PanelContainer) {
            let panel = this.parent.container;
            let title = panel.getRawTitle();
            this.elementText.innerHTML = title;
        }
    }

    destroy() {
        let panel = this.parent.container as PanelContainer;
        panel.removeListener(this.undockListener);

        this.mouseClickHandler.cancel();
        this.mouseDownHandler.cancel();
        this.closeButtonHandler.cancel();
        this.auxClickHandler.cancel();

        if (this.mouseUpHandler) {
            this.mouseUpHandler.cancel();
        }
        if (this.touchUpHandler) {
            this.touchUpHandler.cancel();
        }
        if (this.contextMenuHandler) {
            this.contextMenuHandler.cancel();
        }

        Utils.removeNode(this.elementBase);
        Utils.removeNode(this.elementCloseButton);
        delete this.elementBase;
        delete this.elementCloseButton;
    }

    _performUndock(e, dragOffset) {
        if (this.parent.container.containerType === 'panel') {
            this.undockInitiator.enabled = false;
            let panel = this.parent.container as PanelContainer;
            return panel.performUndockToDialog(e, dragOffset);
        }
        else
            return null;
    }

    onMouseClicked(e) {
        this.parent.onSelected();
    }

    onCloseButtonClicked(e) {
        if (e.button !== 2) {
            // If the page contains a panel element, undock it and destroy it
            if (this.parent.container.containerType === 'panel') {
                let panel = this.parent.container as PanelContainer;
                panel.close();
                // this.undockInitiator.enabled = false;
                // let panel = this.parent.container;
                // panel.performUndock();
            }
        }
    }

    setSelected(isSelected: boolean) {
        let selectedClassName = 'dockspan-tab-handle-selected';
        if (isSelected)
            this.elementBase.classList.add(selectedClassName);
        else
            this.elementBase.classList.remove(selectedClassName);
    }

    setZIndex(zIndex: number) {
        this.elementBase.style.zIndex = <string><any>zIndex;
    }

    _bringToFront(element: HTMLElement) {
        element.style.zIndex = <string><any>this.zIndexCounter;
        this.zIndexCounter++;
    }
}