import { TabHost } from "./TabHost.js";
import { TabPage } from "./TabPage.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
import { PanelContainer } from "./PanelContainer.js";
/**
 * Specialized tab page that doesn't display the panel's frame when docked in a tab page
 */
export declare class DocumentTabPage extends TabPage {
    container: IDockContainer;
    panel: PanelContainer;
    containerElement: HTMLElement;
    constructor(host: TabHost, container: IDockContainer);
    destroy(): void;
}
