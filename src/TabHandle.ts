import { TabPage } from "./TabPage";
import { PanelContainer } from "./PanelContainer";
import { UndockInitiator } from "./UndockInitiator";
import { EventHandler } from "./EventHandler";

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
    constructor(parent: TabPage) {
        this.parent = parent;
        var undockHandler = TabHandle.prototype._performUndock.bind(this);
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

        this.parent.host.tabListElement.appendChild(this.elementBase);

        var panel = parent.container;
        var title = panel.getRawTitle();
        var that = this;
        this.undockListener = {
            onDockEnabled: function (e) { that.undockEnabled(e.state); },
            onHideCloseButton: function (e) { that.hideCloseButton(e.state); }
        };
        this.eventListeners = [];
        panel.addListener(this.undockListener);

        this.elementText.innerHTML = title;

        // Set the close button text (font awesome)
        if (this.parent.container instanceof PanelContainer && this.parent.container.dockManager.closeTabIconTemplate) {
            this.elementCloseButton.innerHTML = this.parent.container.dockManager.closeTabIconTemplate();
        }
        else {
            this.elementCloseButton.innerHTML = '<i class="fa fa-times"></i>';
        }

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

    undockEnabled(state) {
        this.undockInitiator.enabled = state;
    }

    oncontextMenuClicked(e) {
        e.preventDefault();

        if (!this._CtxMenu) {
            let el = newElementFromString(`<div class="context-menu">
    <div id="btnclose" class="context-menu-selected"><t-t>STD_CloseAllTabs</t-t></div>
    <div id="btnclosebut" class="context-menu-selected"><t-t>STD_CloseAllTabsButNotThis</t-t></div>
</div>
`);
            let btn = el.querySelector('#btnclose');
            btn.onclick = () => {
                let length = this.parent.container.dockManager.context.model.documentManagerNode.children.length;

                for (i = 0; i < length; i++) {
                    this.parent.container.dockManager.context.model.documentManagerNode.children[0].container.close();
                }
                this._CtxMenu.close();
            };

            btn = el.querySelector('#btnclosebut');
            btn.onclick = () => {
                let length = this.parent.container.dockManager.context.model.documentManagerNode.children.length;

                for (i = length - 1; i >= 0; i--) {
                    if (this.parent.container != this.parent.container.dockManager.context.model.documentManagerNode.children[i].container)
                        this.parent.container.dockManager.context.model.documentManagerNode.children[i].container.close();
                }
                if (this._CtxMenu)
                    this._CtxMenu.close();
            };
            this._CtxMenu = contextMenuHelper_showMenu(e, el, true, document.querySelector('#popuplayer'), () => {
                this._CtxMenu = null;
            });
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
        var contain = pos > event.rect.left && pos < event.rect.right;
        var m = Math.abs(event.bound - pos);
        if (m < this.moveThreshold && contain)
            this.moveTabEvent(this, event.state);
    }

    moveTabEvent(that, state) {
        that.eventListeners.forEach(function (listener) {
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
            var tabRect = this.elementBase.getBoundingClientRect();
            var event = this.direction < 0
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
            var panel = this.parent.container;
            var title = panel.getRawTitle();
            this.elementText.innerHTML = title;
        }
    }

    destroy() {
        var panel = this.parent.container;
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

        utils.removeNode(this.elementBase);
        utils.removeNode(this.elementCloseButton);
        delete this.elementBase;
        delete this.elementCloseButton;
    }

    _performUndock(e, dragOffset) {
        if (this.parent.container.containerType === 'panel') {
            this.undockInitiator.enabled = false;
            var panel = this.parent.container;
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
                this.parent.container.close();
                // this.undockInitiator.enabled = false;
                // var panel = this.parent.container;
                // panel.performUndock();
            }
        }
    }

    setSelected(selected) {
        var selectedClassName = 'dockspan-tab-handle-selected';
        if (selected)
            this.elementBase.classList.add(selectedClassName);
        else
            this.elementBase.classList.remove(selectedClassName);
    }

    setZIndex(zIndex) {
        this.elementBase.style.zIndex = zIndex;
    }

    _bringToFront(element) {
        element.style.zIndex = this.zIndexCounter;
        this.zIndexCounter++;
    }
}