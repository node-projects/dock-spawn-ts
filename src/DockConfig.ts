export type TabStripMode = 'scroll' | 'wrap';

export class DockConfig {
    public constructor() {
        this.escClosesWindow = true;
        this.escClosesDialog = true;
        this.dialogRootElement = document.body;
        this.moveOnlyWithinDockConatiner = false;
        this.enableBrowserWindows = true;
        this.enableAutoHide = false;
        this.enableTabGroups = false;
        this.persistTabGroups = true;
        this.tabStripMode = 'scroll';
    }

    escClosesWindow?: boolean;
    escClosesDialog?: boolean;
    dialogRootElement: HTMLElement;
    moveOnlyWithinDockConatiner?: boolean;
    enableBrowserWindows?: boolean;
    /** Allow tool panels to collapse to edge tabs. Disabled by default. */
    enableAutoHide?: boolean;
    /** Enable multi-tab dragging and grouping floating windows. Opt-in. */
    enableTabGroups?: boolean;
    /** Save floating group membership; false restores members as separate windows. */
    persistTabGroups?: boolean;
    /** Single scrollable row (default), or multiple rows of tabs. */
    tabStripMode?: TabStripMode;
}
