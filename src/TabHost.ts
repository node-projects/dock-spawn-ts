import { TabPage } from "./TabPage.js";
import { Utils } from "./Utils.js";
import { TabHostDirection } from "./enums/TabHostDirection.js";
import { TabHandle } from "./TabHandle.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { DockManager } from "./DockManager.js";
import { PanelContainer } from "./PanelContainer.js";
import { EventHandler } from './EventHandler.js';
import { UndockInitiator } from './UndockInitiator.js';
import { TabStripMode } from './DockConfig.js';
import { Localizer } from './i18n/Localizer.js';

/**
 * Tab Host control contains tabs known as TabPages.
 * The tab strip can be aligned in different orientations
 */
export class TabHost {
    displayCloseButton: boolean;
    dockManager: DockManager;
    tabStripDirection: TabHostDirection;
    hostElement: HTMLDivElement;
    tabListElement: HTMLDivElement;
    separatorElement: HTMLDivElement;
    contentElement: HTMLDivElement;
    createTabPage: (tabHost: TabHost, container: IDockContainer) => any;
    tabHandleListener: { onMoveTab: (e: any) => void; };
    eventListeners: any[];
    pages: TabPage[];
    activeTab: TabPage;
    _resizeRequested: boolean;
    private tabListResize: Promise<void>;
    private tabListWidth: number;
    private tabListHeight: number;
    private destroyed = false;
    tabStripMode: TabStripMode;
    private stripControls: HTMLDivElement;
    private tabPicker: HTMLSelectElement;
    private modeButton: HTMLButtonElement;
    private stripHandlers: EventHandler[] = [];
    mouseDownHandler: EventHandler;
    focusHandler: EventHandler;
    private markedTabs = new Set<TabPage>();
    groupUndockInitiator: UndockInitiator;

    constructor(dockManager: DockManager, tabStripDirection: TabHostDirection, displayCloseButton?: boolean) {
        /**
         * Create a tab host with the tab strip aligned in the [tabStripDirection] direciton
         * Only TabHost.DIRECTION_BOTTOM and TabHost.DIRECTION_TOP are supported
         */
        if (tabStripDirection === undefined) {
            tabStripDirection = TabHostDirection.BOTTOM;
        }

        if (displayCloseButton === undefined) {
            displayCloseButton = false;
        }

        this.dockManager = dockManager;
        this.tabStripDirection = tabStripDirection;
        this.displayCloseButton = displayCloseButton; // Indicates if the close button next to the tab handle should be displayed
        this.pages = [];
        this.eventListeners = [];
        this.tabHandleListener = {
            onMoveTab: (e) => { this.onMoveTab(e); }
        };
        this.hostElement = document.createElement('div');       // The main tab host DOM element
        this.tabListElement = document.createElement('div');    // Hosts the tab handles
        this.separatorElement = document.createElement('div');  // A seperator line between the tabs and content
        this.contentElement = document.createElement('div');    // Hosts the active tab content
        this.contentElement.tabIndex = 0;
        this.createTabPage = this._createDefaultTabPage;        // Factory for creating tab pages

        if (this.tabStripDirection === TabHostDirection.BOTTOM) {
            this.hostElement.appendChild(this.contentElement);
            this.hostElement.appendChild(this.separatorElement);
            this.hostElement.appendChild(this.tabListElement);
        } else if (this.tabStripDirection === TabHostDirection.TOP) {
            this.hostElement.appendChild(this.tabListElement);
            this.hostElement.appendChild(this.separatorElement);
            this.hostElement.appendChild(this.contentElement);
        } else {
            throw new Error('Only top and bottom tab strip orientations are supported');
        }

        this.hostElement.classList.add('dockspan-tab-host');
        this.tabListElement.classList.add('dockspan-tab-handle-list-container');
        this.separatorElement.classList.add('dockspan-tab-handle-content-seperator');
        this.contentElement.classList.add('dockspan-tab-content');
        this.contentElement.tabIndex = 0;
        this.focusHandler = new EventHandler(this.contentElement, 'focus', this.onFocus.bind(this), true);
        this.mouseDownHandler = new EventHandler(this.contentElement, 'mousedown', this.onMousedown.bind(this), true);
        this.groupUndockInitiator = new UndockInitiator(this.tabListElement, (event, offset) => {
            const panels = this.pages.map(page => page.panel);
            this.groupUndockInitiator.enabled = true;
            return this.dockManager.requestUndockGroup(panels, event, offset, this.activeTab?.panel);
        });
        // A handle owns its own drag gesture. Only blank strip space starts a group drag.
        this.groupUndockInitiator.canStart = event => event.target === this.tabListElement
            && this.dockManager.config.enableTabGroups && this.dockManager._undockEnabled && this.pages.length > 0
            && this.pages.every(page => page.panel?._canUndock);
        this.groupUndockInitiator.enabled = true;
        this.stripControls = document.createElement('div');
        this.stripControls.className = 'dockspan-tab-strip-controls';
        this.stripControls.style[this.tabStripDirection === TabHostDirection.TOP ? 'top' : 'bottom'] = '0';
        this.tabPicker = document.createElement('select');
        this.tabPicker.setAttribute('aria-label', Localizer.getString('SelectTab'));
        this.tabPicker.title = Localizer.getString('SelectHiddenTab');
        this.modeButton = document.createElement('button');
        this.modeButton.type = 'button';
        this.modeButton.textContent = '☷';
        this.modeButton.setAttribute('aria-label', Localizer.getString('ShowTabRows'));
        this.stripControls.append(this.modeButton, this.tabPicker);
        this.hostElement.appendChild(this.stripControls);
        this.stripHandlers.push(new EventHandler(this.tabPicker, 'change', () => {
            this.pages[this.tabPicker.selectedIndex]?.onSelected();
        }), new EventHandler(this.modeButton, 'click', () => {
            void this.setTabStripMode(this.tabStripMode === 'wrap' ? 'scroll' : 'wrap');
        }));
        this.applyTabStripMode(dockManager.config.tabStripMode ?? 'scroll');
        this.stripControls.hidden = true;
    }

    private applyTabStripMode(mode: TabStripMode) {
        this.tabStripMode = mode;
        this.tabListElement.classList.toggle('dockspan-tab-strip-wrap', mode === 'wrap');
        this.modeButton.setAttribute('aria-pressed', String(mode === 'wrap'));
        this.modeButton.title = Localizer.getString(mode === 'wrap' ? 'ShowSingleTabRow' : 'ShowTabRows');
    }

    /** Change this strip without changing the manager default for new strips. */
    setTabStripMode(mode: TabStripMode): Promise<void> {
        if (mode !== 'scroll' && mode !== 'wrap') throw new Error('Invalid tab strip mode');
        this.applyTabStripMode(mode);
        return this.resize(this.hostElement.clientWidth, this.hostElement.clientHeight);
    }

    private refreshTabPicker() {
        if (!this.tabPicker) return;
        this.tabPicker.replaceChildren(...this.pages.map(page => {
            const option = document.createElement('option');
            option.textContent = page.handle.elementText.textContent;
            option.selected = page === this.activeTab;
            return option;
        }));
    }

    /** Reflow a strip after a title changes its natural tab width. */
    refreshTabs() {
        if (this.tabListWidth !== undefined && !this.destroyed)
            void this.resize(this.tabListWidth, this.tabListHeight);
    }

    private revealActiveTab() {
        const handle = this.activeTab?.handle?.elementBase;
        if (!handle) return;
        // Scroll only the strip; scrollIntoView would also move the outer page.
        if (this.tabStripMode === 'wrap') {
            const top = handle.offsetTop - this.tabListElement.offsetTop;
            if (top < this.tabListElement.scrollTop) this.tabListElement.scrollTop = top;
            else if (top + handle.offsetHeight > this.tabListElement.scrollTop + this.tabListElement.clientHeight)
                this.tabListElement.scrollTop = top + handle.offsetHeight - this.tabListElement.clientHeight;
        } else {
            const left = handle.offsetLeft - this.tabListElement.offsetLeft;
            if (left < this.tabListElement.scrollLeft) this.tabListElement.scrollLeft = left;
            else if (left + handle.offsetWidth > this.tabListElement.scrollLeft + this.tabListElement.clientWidth)
                this.tabListElement.scrollLeft = left + handle.offsetWidth - this.tabListElement.clientWidth;
        }
    }

    onFocus() {
        if (this.activeTab && this.dockManager.activePanel != this.activeTab.panel)
            this.dockManager.activePanel = this.activeTab.panel;
    }

    setActive(isActive: boolean) {
        if (isActive) {
            this.separatorElement.classList.add('dockspan-tab-handle-content-seperator-active');
        } else {
            this.separatorElement.classList.remove('dockspan-tab-handle-content-seperator-active');
        }
        if (this.activeTab) {
            this.activeTab.handle.setActive(isActive);
        }
    }

    onMousedown() {
        if (this.activeTab && this.dockManager.activePanel != this.activeTab.panel)
            this.dockManager.activePanel = this.activeTab.panel;
    }

    onMoveTab(e) {
        let index = Array.prototype.slice.call(this.tabListElement.childNodes).indexOf(e.self.elementBase);
        this.change(this, /*handle*/e.self, e.state, index);
    }

    performTabsLayout(indexes: number[]) {
        this.pages = Utils.orderByIndexes(this.pages, indexes);

        let items = this.tabListElement.childNodes;
        let itemsArr = [];
        for (let i in items) {
            if (items[i].nodeType === 1) { // get rid of the whitespace text nodes
                itemsArr.push(items[i]);
            }
        }
        itemsArr = Utils.orderByIndexes(itemsArr, indexes);
        for (let i = 0; i < itemsArr.length; ++i) {
            this.tabListElement.appendChild(itemsArr[i]);
        }

        if (this.activeTab)
            this.onTabPageSelected(this.activeTab, false);
    }

    getActiveTab() {
        return this.activeTab;
    }

    addListener(listener) {
        this.eventListeners.push(listener);
    }

    removeListener(listener) {
        Utils.arrayRemove(this.eventListeners, listener);
    }

    change(host: TabHost, handle: TabHandle, state, index) {
        this.eventListeners.forEach((listener) => {
            if (listener.onChange) {
                listener.onChange({ host: host, handle: handle, state: state, index: index });
            }
        });
    }

    _createDefaultTabPage(tabHost: TabHost, container: IDockContainer) {
        return new TabPage(tabHost, container);
    }

    setActiveTab(container: IDockContainer) {
        let currentPage;
        this.pages.forEach((itm) => {
            if (itm.container === container) {
                currentPage = itm;
            }
        });
        if (this.pages.length > 0 && currentPage) {
            this.onTabPageSelected(currentPage, true);
            this.dockManager.activePanel = container as PanelContainer;
        }
    }

    async resize(width: number, height: number): Promise<void> {
        this.hostElement.style.width = width + 'px';
        this.hostElement.style.height = height + 'px';

        this.tabListWidth = width;
        this.tabListHeight = height;
        if (!this._resizeRequested) {
            this.tabListResize = new Promise<void>((resolve, reject) => {
                requestAnimationFrame(() => {
                    try {
                        if (this.destroyed) { resolve(); return; }
                        this.resizeTabListElement(this.tabListWidth);
                        const tabHeight = this.tabListElement.clientHeight;
                        if (this.stripControls) this.stripControls.style.height = tabHeight + 'px';
                        const contentHeight = Math.max(0, this.tabListHeight - tabHeight - this.separatorElement.clientHeight);
                        const heightChanged = this.contentElement.style.height !== contentHeight + 'px';
                        this.contentElement.style.height = contentHeight + 'px';
                        this.revealActiveTab();
                        Promise.resolve(heightChanged ? this.activeTab?.resize(this.tabListWidth, contentHeight) : undefined).then(resolve, reject);
                    } catch (error) {
                        reject(error);
                    } finally {
                        this._resizeRequested = false;
                    }
                });
            });
        }
        this._resizeRequested = true;
        let contentHeight = Math.max(0, height - this.tabListElement.clientHeight - this.separatorElement.clientHeight);
        this.contentElement.style.height = contentHeight + 'px';

        await Promise.all([this.tabListResize, this.activeTab?.resize(width, contentHeight)]);
    }

    resizeTabListElement(width: number, height?: number) {
        // Reserve control space without inserting controls among reorderable handles.
        this.tabListElement.style.width = Math.max(0, width - 56) + 'px';
        this.tabListElement.style.maxHeight = Math.max(22, (height ?? this.tabListHeight ?? 44) / 2) + 'px';
        this.pages.forEach(page => { if (page.handle.elementBase) page.handle.elementBase.style.width = ''; });
        this.refreshTabPicker();
    }

    performLayout(children: IDockContainer[]) {
        // Destroy all existing tab pages not in children
        const childSet = new Set(children);
        this.pages = this.pages.filter((tab) => {
            if (!childSet.has(tab.container)) {
                this.markedTabs?.delete(tab);
                tab.handle.removeListener(this.tabHandleListener);
                tab.destroy();
                return false;
            }
            return true;
        });

        let oldActiveTab = this.activeTab;
        delete this.activeTab;

        let childPanels = children.filter((child) => {
            return child.containerType === 'panel';
        });

        if (childPanels.length > 0) {
            // Rebuild new tab pages
            childPanels.forEach((child) => {
                let page = null;
                if (!this.pages.some((x) => {
                    if (x.container == child) {
                        page = x;
                        return true;
                    }
                    return false;
                })) {
                    page = this.createTabPage(this, child);
                    page.handle.addListener(this.tabHandleListener);
                    this.pages.push(page);
                }

                // Restore the active selected tab
                if (oldActiveTab && page.container === oldActiveTab.container)
                    this.activeTab = page;
            });
            this._setTabHandlesVisible(true);
        }
        else
            // Do not show an empty tab handle host with zero tabs
            this._setTabHandlesVisible(false);

        if (this.activeTab)
            this.onTabPageSelected(this.activeTab, false);
    }

    _setTabHandlesVisible(visible: boolean) {
        if (this.stripControls) this.stripControls.hidden = !visible;
        if (visible) {
            this.tabListElement.classList.add('dockspan-tab-handle-list-container-visible');
            this.separatorElement.classList.add('dockspan-tab-handle-content-seperator-visible');
        } else {
            this.tabListElement.classList.remove('dockspan-tab-handle-list-container-visible');
            this.separatorElement.classList.remove('dockspan-tab-handle-content-seperator-visible');
        }
    }

    onTabPageSelected(page: TabPage, active: boolean) {
        this.activeTab = page;
        this.pages.forEach((tabPage) => {
            let selected = (tabPage === page);
            tabPage.setSelected(selected, active);
        });
        this.refreshTabPicker();
        this.revealActiveTab();
    }

    selectForDrag(page: TabPage, toggle: boolean) {
        this.markedTabs ??= new Set();
        if (!this.dockManager.config.enableTabGroups) {
            this.clearDragSelection();
            return;
        }
        if (toggle) {
            if (!this.markedTabs.size && this.activeTab) this.markedTabs.add(this.activeTab);
            if (this.markedTabs.has(page)) this.markedTabs.delete(page);
            else this.markedTabs.add(page);
        } else if (!this.markedTabs.has(page)) {
            this.markedTabs.clear();
            this.markedTabs.add(page);
        }
        this.pages.forEach(tab => tab.handle.elementBase?.classList.toggle('dockspan-tab-handle-marked', this.markedTabs.has(tab)));
    }

    getDragPanels(page: TabPage): PanelContainer[] {
        if (!this.dockManager.config.enableTabGroups) return [page.panel];
        return this.pages.filter(tab => tab === page || this.markedTabs?.has(tab)).map(tab => tab.panel);
    }

    clearDragSelection() {
        this.markedTabs?.clear();
        this.pages.forEach(tab => tab.handle.elementBase?.classList.remove('dockspan-tab-handle-marked'));
    }

    destroy() {
        this.destroyed = true;
        this.stripHandlers?.forEach(handler => handler.cancel());
        this.groupUndockInitiator.enabled = false;
        this.mouseDownHandler.cancel();
        this.focusHandler.cancel();
        this.pages.forEach(page => page.destroy());
        this.pages = [];
        this.markedTabs?.clear();
    }
}
