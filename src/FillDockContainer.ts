import { DockManager } from "./DockManager.js";
import { Utils } from "./Utils.js";
import { ContainerType } from "./ContainerType.js";
import { TabHost } from "./TabHost.js";
import { TabHostDirection } from "./enums/TabHostDirection.js";
import { ISize } from "./interfaces/ISize.js";
import { IDockContainerWithSize } from "./interfaces/IDockContainerWithSize.js";
import { IState } from "./interfaces/IState.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { DocumentTabPage } from "./DocumentTabPage";
import { TabPage } from "./TabPage";

export class FillDockContainer implements IDockContainerWithSize {

    dockManager: DockManager;
    tabOrientation: TabHostDirection;
    name: string;
    element: HTMLDivElement;
    containerElement: HTMLDivElement;
    containerType: ContainerType;
    minimumAllowedChildNodes: number;
    tabHost: TabHost;
    tabHostListener: { onChange: (e: any) => void; };
    state: ISize;
    disableDocking?: boolean;

    constructor(dockManager: DockManager, tabStripDirection?: TabHostDirection) {
        if (tabStripDirection === undefined) {
            tabStripDirection = TabHostDirection.BOTTOM;
        }

        this.dockManager = dockManager;
        this.tabOrientation = tabStripDirection;
        this.name = Utils.getNextId('fill_');
        this.element = document.createElement('div');
        this.containerElement = this.element;
        this.containerType = ContainerType.fill;
        this.minimumAllowedChildNodes = 2;
        this.element.classList.add('dock-container');
        this.element.classList.add('dock-container-fill');
        this.tabHost = new TabHost(dockManager, this.tabOrientation);
        this.tabHostListener = {
            onChange: (e) => {
                this.dockManager._requestTabReorder(this, e);
            }
        };
        this.tabHost.addListener(this.tabHostListener);
        this.element.appendChild(this.tabHost.hostElement);

        if (tabStripDirection === TabHostDirection.BOTTOM)
            this.tabHost.createTabPage = this._createTabPage;
        else
            this.tabHost.createTabPage = this._createDocumentTabPage;

    }


    setActiveChild(child: IDockContainer) {
        this.tabHost.setActiveTab(child);
    }

    resize(width: number, height: number) {
        this.element.style.width = width + 'px';
        this.element.style.height = height + 'px';
        this.tabHost.resize(width, height);
    }

    performLayout(children: IDockContainer[]) {
        this.tabHost.performLayout(children);
    }

    destroy() {
        if (Utils.removeNode(this.element))
            delete this.element;
    }

    saveState(state: IState): void {
        state.width = this.width;
        state.height = this.height;
    }

    loadState(state: IState): void {
        // this.resize(state.width, state.height);
        // this.width = state.width;
        // this.height = state.height;
        this.state = { width: state.width, height: state.height };
    }

    get width(): number {
        // if(this.element.clientWidth === 0 && this.stateWidth !== 0)
        //     return this.stateWidth;
        return this.element.clientWidth;
    }
    set width(value: number) {
        this.element.style.width = value + 'px'
    }

    get height(): number {
        // if(this.element.clientHeight === 0 && this.stateHeight !== 0)
        //     return this.stateHeight;
        return this.element.clientHeight;
    }
    set height(value: number) {
        this.element.style.height = value + 'px'
    }

    private _createDocumentTabPage(tabHost: TabHost, container: IDockContainer) {
        return new DocumentTabPage(tabHost, container);
    }

    private _createTabPage(tabHost: TabHost, container: IDockContainer) {
        return new TabPage(tabHost, container);
    }
}
