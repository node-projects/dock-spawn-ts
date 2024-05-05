import { DockManager } from "./DockManager.js";
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
import { TabPage } from './TabPage.js';
/**
 * This dock container wraps the specified element on a panel frame with a title bar and close button
 */
export declare class PanelContainer implements IDockContainerWithSize {
    closePanelContainerCallback: (panelContainer: PanelContainer) => Promise<boolean>;
    onTitleChanged: (panelContainer: PanelContainer, title: string) => void;
    elementPanel: HTMLDivElement;
    elementTitle: HTMLDivElement;
    elementTitleText: HTMLDivElement;
    elementContentHost: HTMLDivElement;
    name: string;
    state: ISize;
    elementContent: HTMLElement & {
        resizeHandler?: any;
        _dockSpawnPanelContainer: PanelContainer;
    };
    private _resolvedElementContent;
    elementContentContainer: HTMLElement;
    elementContentWrapper: HTMLElement;
    dockManager: DockManager;
    title: string;
    containerType: ContainerType;
    icon: string;
    hasChanges: boolean;
    minimumAllowedChildNodes: number;
    isDialog: boolean;
    eventListeners: any[];
    undockInitiator: UndockInitiator;
    elementButtonClose: HTMLDivElement;
    closeButtonClickedHandler: EventHandler;
    closeButtonTouchedHandler: EventHandler;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    panelType: PanelType;
    tabPage?: TabPage;
    undockedToNewBrowserWindow: boolean;
    contextMenuHandler: EventHandler;
    lastDialogSize?: ISize;
    _floatingDialog?: Dialog;
    _canUndock: boolean;
    _cachedWidth: number;
    _cachedHeight: number;
    _hideCloseButton: boolean;
    _grayOut: HTMLDivElement;
    _ctxMenu: HTMLDivElement;
    constructor(elementContent: HTMLElement, dockManager: DockManager, title?: string, panelType?: PanelType, hideCloseButton?: boolean);
    _initialize(): void;
    static createContextMenuContentCallback: (panelContainer: PanelContainer, contextMenuContainer: HTMLDivElement) => void;
    oncontextMenuClicked(e: MouseEvent): void;
    closeContextMenu(): void;
    windowsContextMenuClose(e: Event): void;
    canUndock(state: boolean): void;
    addListener(listener: any): void;
    removeListener(listener: any): void;
    get floatingDialog(): Dialog;
    set floatingDialog(value: Dialog);
    static loadFromState(state: IState, dockManager: DockManager): Promise<PanelContainer>;
    saveState(state: IState): void;
    loadState(state: IState): void;
    setActiveChild(): void;
    get containerElement(): HTMLDivElement;
    grayOut(show: boolean): void;
    onMouseDown(): void;
    hideCloseButton(state: boolean): void;
    destroy(): void;
    /**
     * Undocks the panel and and converts it to a dialog box
     */
    performUndockToDialog(e: any, dragOffset: Point): Dialog;
    /**
    * Closes the panel
    */
    private performClose;
    /**
     * Undocks the container and from the layout hierarchy
     * The container would be removed from the DOM
     */
    performUndock(): void;
    prepareForDocking(): void;
    get width(): number;
    set width(value: number);
    get height(): number;
    set height(value: number);
    get resolvedElementContent(): HTMLElement;
    private panelDocked;
    resize(width: number, height: number): void;
    _setPanelDimensions(width: number, height: number): void;
    setDialogPosition(x: number, y: number): void;
    setVisible(isVisible: boolean): void;
    setTitle(title: string): void;
    setTitleIcon(icon: string): void;
    setHasChanges(changes: boolean): void;
    setCloseIconTemplate(closeIconTemplate: string): void;
    _updateTitle(): void;
    getRawTitle(): string;
    performLayout(children: IDockContainer[], relayoutEvenIfEqual: boolean): void;
    onCloseButtonClicked(e: Event): void;
    undockToBrowserDialog(): void;
    close(): Promise<void>;
    private closeInternal;
}
