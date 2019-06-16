export class DockConfig {
    public constructor() {
        this.escClosesWindow = true;
        this.dialogRootElement = document.body;
    }

    escClosesWindow?: boolean;
    dialogRootElement: HTMLElement;
}