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
    onTitleChanged: any;
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
    dockManager: DockManager;
    title: string;
    containerType: ContainerType;
    icon: string;
    minimumAllowedChildNodes: number;
    isDialog: boolean;
    eventListeners: any[];
    undockInitiator: UndockInitiator;
    elementButtonClose: HTMLDivElement;
    closeButtonClickedHandler: EventHandler;
    mouseDownHandler: EventHandler;
    touchDownHandler: EventHandler;
    panelType: PanelType;
    tabPage?: TabPage;
    _floatingDialog?: Dialog;
    _canUndock: boolean;
    _cachedWidth: number;
    _cachedHeight: number;
    _hideCloseButton: boolean;
    constructor(elementContent: HTMLElement, dockManager: DockManager, title?: string, panelType?: PanelType, hideCloseButton?: boolean);
    canUndock(state: boolean): void;
    addListener(listener: any): void;
    removeListener(listener: any): void;
    floatingDialog: Dialog;
    static loadFromState(state: IState, dockManager: DockManager): PanelContainer;
    saveState(state: IState): void;
    loadState(state: IState): void;
    setActiveChild(): void;
    readonly containerElement: HTMLDivElement;
    _initialize(): void;
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
    performClose(): void;
    /**
     * Undocks the container and from the layout hierarchy
     * The container would be removed from the DOM
     */
    performUndock(): void;
    prepareForDocking(): void;
    width: number;
    height: number;
    resize(width: number, height: number): void;
    _setPanelDimensions(width: number, height: number): void;
    setTitle(title: string): void;
    setTitleIcon(icon: string): void;
    setCloseIconTemplate(closeIconTemplate: string): void;
    _updateTitle(): void;
    getRawTitle(): string;
    performLayout(children: IDockContainer[], relayoutEvenIfEqual: boolean): void;
    onCloseButtonClicked(): void;
    close(): void;
}
