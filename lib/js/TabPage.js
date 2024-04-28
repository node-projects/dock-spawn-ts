import { TabHandle } from "./TabHandle.js";
import { PanelContainer } from "./PanelContainer.js";
import { Utils } from "./Utils.js";
export class TabPage {
    selected;
    host;
    container;
    panel;
    handle;
    containerElement;
    _initContent;
    constructor(host, container) {
        if (arguments.length === 0) {
            return;
        }
        this.selected = false;
        this.host = host;
        this.container = container;
        this.handle = new TabHandle(this);
        this.containerElement = container.containerElement;
        if (container instanceof PanelContainer) {
            this.panel = container;
            this.panel.onTitleChanged = this.onTitleChanged.bind(this);
            this.onTitleChanged();
        }
        container.tabPage = this;
    }
    onTitleChanged() {
        this.handle.updateTitle();
        if (this.panel) {
            if (this.panel.hasChanges) {
                this.handle.elementText.classList.add('panel-has-changes');
            }
            else {
                this.handle.elementText.classList.remove('panel-has-changes');
            }
        }
    }
    destroy() {
        this.handle.destroy();
        if (this.container instanceof PanelContainer) {
            let panel = this.container;
            delete panel.onTitleChanged;
        }
        if (this.host.dockManager.activePanel == this.panel)
            this.host.dockManager.activePanel = null;
        this.container.tabPage = null;
        Utils.removeNode(this.containerElement);
    }
    onSelected() {
        this.host.onTabPageSelected(this, true);
        if (this.container instanceof PanelContainer) {
            let panel = this.container;
            panel.dockManager.notifyOnTabChange(this);
        }
    }
    setSelected(flag, isActive) {
        this.selected = flag;
        this.handle.setSelected(flag);
        if (!this._initContent)
            this.host.contentElement.appendChild(this.containerElement);
        this._initContent = true;
        if (this.selected) {
            this.containerElement.style.display = 'block';
            this.panel.setVisible(true);
            // force a resize again
            let width = this.host.contentElement.clientWidth;
            let height = this.host.contentElement.clientHeight;
            this.container.resize(width, height);
            if (isActive)
                this.host.dockManager.activePanel = this.container;
        }
        else {
            this.containerElement.style.display = 'none';
            this.panel.setVisible(false);
        }
    }
    resize(width, height) {
        this.container.resize(width, height);
    }
}
//# sourceMappingURL=TabPage.js.map