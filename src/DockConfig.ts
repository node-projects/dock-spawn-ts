export class DockConfig {
    public constructor() {
        this.escClosesWindow = true;
        this.dialogRootElement = document.body;
        this.moveOnlyWithinDockConatiner = false;
    }

    escClosesWindow?: boolean;
    dialogRootElement: HTMLElement;
    moveOnlyWithinDockConatiner?: boolean
}