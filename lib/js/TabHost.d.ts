/// <reference types="node" />
import { TabPage } from "./TabPage.js";
import { TabHostDirection } from "./enums/TabHostDirection.js";
import { TabHandle } from "./TabHandle.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { DockManager } from "./DockManager.js";
/**
 * Tab Host control contains tabs known as TabPages.
 * The tab strip can be aligned in different orientations
 */
export declare class TabHost {
    displayCloseButton: boolean;
    dockManager: DockManager;
    tabStripDirection: TabHostDirection;
    hostElement: HTMLDivElement;
    tabListElement: HTMLDivElement;
    separatorElement: HTMLDivElement;
    contentElement: HTMLDivElement;
    createTabPage: (tabHost: any, container: any) => any;
    timeoutPerform: NodeJS.Timeout;
    tabHandleListener: {
        onMoveTab: (e: any) => void;
    };
    eventListeners: any[];
    pages: TabPage[];
    activeTab: TabPage;
    constructor(dockManager: DockManager, tabStripDirection: TabHostDirection, displayCloseButton?: boolean);
    onMoveTab(e: any): void;
    performTabsLayout(indexes: number[]): void;
    getActiveTab(): TabPage;
    addListener(listener: any): void;
    removeListener(listener: any): void;
    change(host: TabHost, handle: TabHandle, state: any, index: any): void;
    _createDefaultTabPage(tabHost: TabHost, container: IDockContainer): TabPage;
    setActiveTab(container: IDockContainer): void;
    resize(width: number, height: number): void;
    resizeTabListElement(width: number, height?: number): void;
    performLayout(children: IDockContainer[]): void;
    _setTabHandlesVisible(visible: boolean): void;
    onTabPageSelected(page: TabPage): void;
}
