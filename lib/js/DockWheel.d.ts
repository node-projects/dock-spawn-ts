import { DockManager } from "./DockManager.js";
import { DockWheelItem } from "./DockWheelItem.js";
import { WheelTypes } from "./enums/WheelTypes.js";
import { Dialog } from "./Dialog.js";
import { DockNode } from "./DockNode.js";
/**
 * Manages the dock overlay buttons that are displayed over the dock manager
 */
export declare class DockWheel {
    dockManager: DockManager;
    elementMainWheel: HTMLDivElement;
    elementSideWheel: HTMLDivElement;
    wheelItems: {
        [index in WheelTypes]?: DockWheelItem;
    };
    elementPanelPreview: HTMLDivElement;
    activeDialog: Dialog;
    _activeNode?: DockNode;
    _visible: boolean;
    constructor(dockManager: DockManager);
    /** The node over which the dock wheel is being displayed on */
    activeNode: DockNode;
    showWheel(): void;
    _setWheelButtonPosition(wheelId: WheelTypes, left: number, top: number): void;
    hideWheel(): void;
    onMouseOver(wheelItem: DockWheelItem): void;
    onMouseOut(): void;
    /**
     * Called if the dialog is dropped in a dock panel.
     * The dialog might not necessarily be dropped in one of the dock wheel buttons,
     * in which case the request will be ignored
     */
    onDialogDropped(dialog: Dialog): void;
    /**
     * Returns the wheel item which has the mouse cursor on top of it
     */
    _getActiveWheelItem(): DockWheelItem;
    _handleDockRequest(wheelItem: DockWheelItem, dialog: Dialog): void;
}
