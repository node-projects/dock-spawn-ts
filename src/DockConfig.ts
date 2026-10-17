export class DockConfig {
    public constructor() {
        this.escClosesWindow = true;
        this.escClosesDialog = true;
        this.dialogRootElement = document.body;
        this.moveOnlyWithinDockConatiner = false;
        this.enableBrowserWindows = true;
        this.enableAutoHide = false;
    }

    escClosesWindow?: boolean;
    escClosesDialog?: boolean;
    dialogRootElement: HTMLElement;
    moveOnlyWithinDockConatiner?: boolean;
    enableBrowserWindows?: boolean;
    /** Allow tool panels to collapse to edge tabs. Disabled by default. */
    enableAutoHide?: boolean;
}
