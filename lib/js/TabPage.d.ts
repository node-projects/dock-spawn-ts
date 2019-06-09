import { TabHandle } from "./TabHandle.js";
import { PanelContainer } from "./PanelContainer.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { TabHost } from "./TabHost.js";
export declare class TabPage {
    selected: boolean;
    host: TabHost;
    container: IDockContainer;
    panel?: PanelContainer;
    handle: TabHandle;
    containerElement: HTMLElement;
    _initContent: boolean;
    constructor(host: TabHost, container: IDockContainer);
    onTitleChanged(): void;
    destroy(): void;
    onSelected(): void;
    setSelected(flag: boolean): void;
    resize(width: number, height: number): void;
}
