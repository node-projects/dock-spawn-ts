export type TabStripMode = 'scroll' | 'wrap';
export type DockingSizeStrategy = 'proportional' | 'split-reference' | 'equal-distribution';

export class DockConfig {
    public constructor() {
        this.escClosesWindow = true;
        this.escClosesDialog = true;
        this.dialogRootElement = document.body;
        this.moveOnlyWithinDockConatiner = false;
        this.enableBrowserWindows = true;
        this.enableAutoHide = false;
        this.enableFullscreen = false;
        this.enableTabGroups = false;
        this.persistTabGroups = true;
        this.tabStripMode = 'scroll';
        this.dockingSizeStrategy = 'proportional';
    }

    escClosesWindow?: boolean;
    escClosesDialog?: boolean;
    dialogRootElement: HTMLElement;
    moveOnlyWithinDockConatiner?: boolean;
    enableBrowserWindows?: boolean;
    /** Allow tool panels to collapse to edge tabs. Disabled by default. */
    enableAutoHide?: boolean;
    /** Allow panels to fill the DockSpawn container. Disabled by default. */
    enableFullscreen?: boolean;
    /** Enable multi-tab dragging and grouping floating windows. Opt-in. */
    enableTabGroups?: boolean;
    /** Save floating group membership; false restores members as separate windows. */
    persistTabGroups?: boolean;
    /** Single scrollable row (default), or multiple rows of tabs. */
    tabStripMode?: TabStripMode;
    /** Equal-distribution balances outer drops; panel-relative drops use split-reference. */
    dockingSizeStrategy?: DockingSizeStrategy;
}
