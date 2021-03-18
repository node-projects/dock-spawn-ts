import { Utils } from "./Utils.js";
import { DockManager } from "./DockManager.js";
import { DockWheelItem } from "./DockWheelItem.js";
import { WheelTypes } from "./enums/WheelTypes.js";
import { Dialog } from "./Dialog.js";
import { DockNode } from "./DockNode.js";

/**
 * Manages the dock overlay buttons that are displayed over the dock manager
 */
export class DockWheel {
    dockManager: DockManager;
    elementMainWheel: HTMLDivElement;
    elementSideWheel: HTMLDivElement;
    wheelItems: { [index in WheelTypes]?: DockWheelItem; };
    elementPanelPreview: HTMLDivElement;
    activeDialog: Dialog;
    _activeNode?: DockNode;
    _visible: boolean;

    constructor(dockManager: DockManager) {
        this.dockManager = dockManager;
        this.elementMainWheel = document.createElement('div');    // Contains the main wheel's 5 dock buttons
        this.elementSideWheel = document.createElement('div');    // Contains the 4 buttons on the side
        this.wheelItems = {};
        for (let wheelType in WheelTypes) {
            this.wheelItems[wheelType] = new DockWheelItem(this, <WheelTypes>wheelType);
            if (wheelType.substr(-2, 2) === '-s')
                // Side button
                this.elementSideWheel.appendChild(this.wheelItems[wheelType].element);
            else
                // Main dock wheel button
                this.elementMainWheel.appendChild(this.wheelItems[wheelType].element);
        };

        let zIndex = 9000000;
        this.elementMainWheel.classList.add('dock-wheel-base');
        this.elementSideWheel.classList.add('dock-wheel-base');
        this.elementMainWheel.style.zIndex = String(zIndex + 1);
        this.elementSideWheel.style.zIndex = String(zIndex);
        this.elementPanelPreview = document.createElement('div');
        this.elementPanelPreview.classList.add('dock-wheel-panel-preview');
        this.elementPanelPreview.style.zIndex = String(zIndex - 1);
        this.activeDialog = undefined;  // The dialog being dragged, when the wheel is visible
        this._activeNode = undefined;
        this._visible = false;
    }

    /** The node over which the dock wheel is being displayed on */
    get activeNode(): DockNode {
        return this._activeNode;
    }
    set activeNode(value: DockNode) {
        let previousValue = this._activeNode;
        this._activeNode = value;

        if (previousValue !== this._activeNode) {
            // The active node has been changed.
            // Reattach the wheel to the new node's element and show it again
            if (this._visible)
                this.showWheel();
        }
    }

    showWheel() {
        this._visible = true;
        if (!this.activeNode) {
            // No active node selected. make sure the wheel is invisible
            Utils.removeNode(this.elementMainWheel);
            Utils.removeNode(this.elementSideWheel);
            return;
        }

        let element = this.activeNode.container.containerElement;
        let containerWidth = element.clientWidth;
        let containerHeight = element.clientHeight;
        let baseX = Math.floor(containerWidth / 2); // + element.offsetLeft;
        let baseY = Math.floor(containerHeight / 2); // + element.offsetTop;
        this.elementMainWheel.style.left = baseX + 'px';
        this.elementMainWheel.style.top = baseY + 'px';

        // The positioning of the main dock wheel buttons is done automatically through CSS
        // Dynamically calculate the positions of the buttons on the extreme sides of the dock manager
        let sideMargin = 20;
        let dockManagerWidth = this.dockManager.element.clientWidth;
        let dockManagerHeight = this.dockManager.element.clientHeight;

        Utils.removeNode(this.elementMainWheel);
        Utils.removeNode(this.elementSideWheel);
        if (!this.activeNode.container.disableDocking) {
            element.appendChild(this.elementMainWheel);
        }
        this.dockManager.element.appendChild(this.elementSideWheel);

        this._setWheelButtonPosition(WheelTypes["left-s"], sideMargin, -dockManagerHeight / 2);
        this._setWheelButtonPosition(WheelTypes["right-s"], dockManagerWidth - sideMargin * 2, -dockManagerHeight / 2);
        this._setWheelButtonPosition(WheelTypes["top-s"], dockManagerWidth / 2, -dockManagerHeight + sideMargin);
        this._setWheelButtonPosition(WheelTypes["down-s"], dockManagerWidth / 2, -sideMargin);
    }

    _setWheelButtonPosition(wheelId: WheelTypes, left: number, top: number) {
        let item = this.wheelItems[wheelId];
        let itemHalfWidth = item.element.clientWidth / 2;
        let itemHalfHeight = item.element.clientHeight / 2;

        let x = Math.floor(left - itemHalfWidth);
        let y = Math.floor(top - itemHalfHeight);
        //    item.element.style.left = '${x}px';
        //    item.element.style.top = '${y}px';
        item.element.style.marginLeft = x + 'px';
        item.element.style.marginTop = y + 'px';
    }

    hideWheel() {
        this._visible = false;
        this.activeNode = undefined;
        Utils.removeNode(this.elementMainWheel);
        Utils.removeNode(this.elementSideWheel);
        Utils.removeNode(this.elementPanelPreview);

        // deactivate all wheels
        for (let wheelType in this.wheelItems)
            this.wheelItems[wheelType].active = false;
    }

    onMouseOver(wheelItem: DockWheelItem) {
        if (!this.activeDialog)
            return;

        // Display the preview panel to show where the panel would be docked
        let rootNode = this.dockManager.context.model.rootNode;
        let bounds;
        if (wheelItem.id === WheelTypes.top) {
            bounds = this.dockManager.layoutEngine.getDockBounds(this.activeNode, this.activeDialog.panel, 'vertical', true);
        } else if (wheelItem.id === WheelTypes.down) {
            bounds = this.dockManager.layoutEngine.getDockBounds(this.activeNode, this.activeDialog.panel, 'vertical', false);
        } else if (wheelItem.id === WheelTypes.left) {
            bounds = this.dockManager.layoutEngine.getDockBounds(this.activeNode, this.activeDialog.panel, 'horizontal', true);
        } else if (wheelItem.id === WheelTypes.right) {
            bounds = this.dockManager.layoutEngine.getDockBounds(this.activeNode, this.activeDialog.panel, 'horizontal', false);
        } else if (wheelItem.id === WheelTypes.fill) {
            bounds = this.dockManager.layoutEngine.getDockBounds(this.activeNode, this.activeDialog.panel, 'fill', false);
        } else if (wheelItem.id === WheelTypes["top-s"]) {
            bounds = this.dockManager.layoutEngine.getDockBounds(rootNode, this.activeDialog.panel, 'vertical', true);
        } else if (wheelItem.id === WheelTypes["down-s"]) {
            bounds = this.dockManager.layoutEngine.getDockBounds(rootNode, this.activeDialog.panel, 'vertical', false);
        } else if (wheelItem.id === WheelTypes["left-s"]) {
            bounds = this.dockManager.layoutEngine.getDockBounds(rootNode, this.activeDialog.panel, 'horizontal', true);
        } else if (wheelItem.id === WheelTypes["right-s"]) {
            bounds = this.dockManager.layoutEngine.getDockBounds(rootNode, this.activeDialog.panel, 'horizontal', false);
        }

        if (bounds) {
            this.dockManager.element.appendChild(this.elementPanelPreview);
            this.elementPanelPreview.style.left = Math.round(bounds.x) + 'px';
            this.elementPanelPreview.style.top = Math.round(bounds.y) + 'px';
            this.elementPanelPreview.style.width = Math.round(bounds.width) + 'px';
            this.elementPanelPreview.style.height = Math.round(bounds.height) + 'px';
        }
    }

    onMouseOut() {
        Utils.removeNode(this.elementPanelPreview);
    }

    /**
     * Called if the dialog is dropped in a dock panel.
     * The dialog might not necessarily be dropped in one of the dock wheel buttons,
     * in which case the request will be ignored
     */
    onDialogDropped(dialog: Dialog) {
        // Check if the dialog was dropped in one of the wheel items
        let wheelItem = this._getActiveWheelItem();
        if (wheelItem)
            this._handleDockRequest(wheelItem, dialog);
    }

    /**
     * Returns the wheel item which has the mouse cursor on top of it
     */
    _getActiveWheelItem(): DockWheelItem {
        for (let wheelType in this.wheelItems) {
            let wheelItem = this.wheelItems[wheelType];
            if (wheelItem.active)
                return wheelItem;
        }
        return undefined;
    }

    _handleDockRequest(wheelItem: DockWheelItem, dialog: Dialog) {
        wheelItem.active = false;
        wheelItem.element.classList.remove(wheelItem.hoverIconClass);

        if (!this.activeNode)
            return;
        if (wheelItem.id === WheelTypes.left) {
            this.dockManager.dockDialogLeft(this.activeNode, dialog);
        } else if (wheelItem.id === WheelTypes.right) {
            this.dockManager.dockDialogRight(this.activeNode, dialog);
        } else if (wheelItem.id === WheelTypes.top) {
            this.dockManager.dockDialogUp(this.activeNode, dialog);
        } else if (wheelItem.id === WheelTypes.down) {
            this.dockManager.dockDialogDown(this.activeNode, dialog);
        } else if (wheelItem.id === WheelTypes.fill) {
            this.dockManager.dockDialogFill(this.activeNode, dialog);
        } else if (wheelItem.id === WheelTypes["left-s"]) {
            this.dockManager.dockDialogLeft(this.dockManager.context.model.rootNode, dialog);
        } else if (wheelItem.id === WheelTypes["right-s"]) {
            this.dockManager.dockDialogRight(this.dockManager.context.model.rootNode, dialog);
        } else if (wheelItem.id === WheelTypes["top-s"]) {
            this.dockManager.dockDialogUp(this.dockManager.context.model.rootNode, dialog);
        } else if (wheelItem.id === WheelTypes["down-s"]) {
            this.dockManager.dockDialogDown(this.dockManager.context.model.rootNode, dialog);
        }
    }
}
