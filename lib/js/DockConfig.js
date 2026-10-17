export class DockConfig {
    constructor() {
        this.escClosesWindow = true;
        this.escClosesDialog = true;
        this.dialogRootElement = document.body;
        this.moveOnlyWithinDockConatiner = false;
        this.enableBrowserWindows = true;
        this.enableAutoHide = false;
    }
    escClosesWindow;
    escClosesDialog;
    dialogRootElement;
    moveOnlyWithinDockConatiner;
    enableBrowserWindows;
    /** Allow tool panels to collapse to edge tabs. Disabled by default. */
    enableAutoHide;
}
//# sourceMappingURL=DockConfig.js.map