import { DockManager } from "../DockManager.js";
import { PanelContainer } from "../PanelContainer.js";
import { PanelType } from "../enums/PanelType.js";
//@ts-ignore
import style1 from "../../../lib/css/dock-manager-style.css" with { type: 'css' };
//@ts-ignore
import style2 from "../../../lib/css/dock-manager.css" with { type: 'css' };
function toParString(strings, values) {
    if (strings.length === 1)
        return strings.raw[0];
    else {
        let r = '';
        for (let i = 0; i < strings.length; i++) {
            r += strings[i] + (values[i] ?? '');
        }
        return r;
    }
}
const css = function (strings, ...values) {
    const cssStyleSheet = new CSSStyleSheet();
    cssStyleSheet.replaceSync(toParString(strings, values));
    return cssStyleSheet;
};
export class DockSpawnTsWebcomponent extends HTMLElement {
    dockManager;
    slotId = 0;
    windowResizedBound;
    slotElementMap;
    observer;
    initialized = false;
    elementContainerMap = new Map();
    static style = css `
    :host {
        display: block;
    }`;
    constructor() {
        super();
        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.adoptedStyleSheets = [DockSpawnTsWebcomponent.style, style1, style2];
        this.windowResizedBound = this.windowResized.bind(this);
        this.slotElementMap = new WeakMap();
    }
    initDockspawn() {
        const dockSpawnDiv = document.createElement('div');
        dockSpawnDiv.id = "dockSpawnDiv";
        dockSpawnDiv.style.width = "100%";
        dockSpawnDiv.style.height = "100%";
        dockSpawnDiv.style.position = "relative";
        this.shadowRoot.appendChild(dockSpawnDiv);
        this.dockManager = new DockManager(dockSpawnDiv);
        this.dockManager.config.dialogRootElement = dockSpawnDiv;
        setTimeout(() => {
            this.dockManager.initialize();
            this.dockManager.addLayoutListener({
                onClosePanel: (dockManager, dockNode) => {
                    let slot = dockNode.elementContent;
                    let element = this.slotElementMap.get(slot);
                    if (element)
                        this.removeChild(element);
                }
            });
            this.dockManager.resize(this.clientWidth, this.clientHeight);
            for (let element of this.children) {
                this.handleAddedChildNode(element);
            }
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        this.handleRemovedChildNode(node);
                    });
                    mutation.addedNodes.forEach((node) => {
                        this.handleAddedChildNode(node);
                    });
                });
            });
            this.observer.observe(this, { childList: true });
        }, 50);
    }
    getElementInSlot(slot) {
        return this.slotElementMap.get(slot);
    }
    handleAddedChildNode(element) {
        let slot = document.createElement('slot');
        let slotName = 'slot_' + this.slotId++;
        slot.name = slotName;
        let dockPanelType = PanelType.panel;
        let dockPanelTypeAttribute = element.getAttribute('dock-spawn-panel-type');
        if (dockPanelTypeAttribute)
            dockPanelType = dockPanelTypeAttribute;
        let hideCloseButton = element.hasAttribute('dock-spawn-hide-close-button');
        let dockSpawnTitle = element.getAttribute('dock-spawn-title');
        let container = new PanelContainer(slot, this.dockManager, dockSpawnTitle ?? element.title, dockPanelType, hideCloseButton);
        element.slot = slotName;
        this.slotElementMap.set(slot, element);
        this.elementContainerMap.set(element, container);
        let dockRatio = 0.5;
        let dockRatioAttribute = element.getAttribute('dock-spawn-dock-ratio');
        if (dockRatioAttribute)
            dockRatio = dockRatioAttribute;
        let dockType = element.getAttribute('dock-spawn-dock-type');
        let dockRelativeTo = this.dockManager.context.model.documentManagerNode;
        let dockToAttribute = element.getAttribute('dock-spawn-dock-to');
        if (dockToAttribute) {
            //@ts-ignore
            let dockToElement = this.getRootNode().getElementById(dockToAttribute);
            dockRelativeTo = this.dockManager.findNodeFromContainerElement(this.elementContainerMap.get(dockToElement).containerElement);
        }
        if (dockType == 'left')
            this.dockManager.dockLeft(dockRelativeTo, container, dockRatio);
        else if (dockType == 'right')
            this.dockManager.dockRight(dockRelativeTo, container, dockRatio);
        else if (dockType == 'up')
            this.dockManager.dockUp(dockRelativeTo, container, dockRatio);
        else if (dockType == 'down')
            this.dockManager.dockDown(dockRelativeTo, container, dockRatio);
        else
            this.dockManager.dockFill(dockRelativeTo, container);
        if (element.style.display == 'none')
            element.style.display = 'block';
    }
    handleRemovedChildNode(element) {
        let node = this.getDockNodeForElement(element);
        if (node)
            node.container.close();
        this.elementContainerMap.delete(element);
    }
    connectedCallback() {
        if (!this.initialized) {
            this.initDockspawn();
            this.initialized = true;
        }
        window.addEventListener('resize', this.windowResizedBound);
        window.addEventListener('orientationchange', this.windowResizedBound);
    }
    disconnectedCallback() {
        window.removeEventListener('resize', this.windowResizedBound);
        window.removeEventListener('orientationchange', this.windowResizedBound);
    }
    windowResized() {
        this.resize();
    }
    resize() {
        this.dockManager.resize(this.clientWidth, this.clientHeight);
    }
    getDockNodeForElement(elementOrContainer) {
        let element = elementOrContainer;
        if (element.containerElement)
            element = elementOrContainer.containerElement;
        return this.dockManager.findNodeFromContainerElement(element);
    }
    dockFill(element, panelType, dockNode, title, hideCloseButton) {
        let container = new PanelContainer(element, this.dockManager, title, panelType, hideCloseButton);
        this.dockManager.dockFill(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container);
    }
    dockLeft(element, panelType, dockNode, ratio, title, hideCloseButton) {
        let container = new PanelContainer(element, this.dockManager, title, panelType, hideCloseButton);
        this.dockManager.dockLeft(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }
    dockRight(element, panelType, dockNode, ratio, title, hideCloseButton) {
        let container = new PanelContainer(element, this.dockManager, title, panelType, hideCloseButton);
        this.dockManager.dockRight(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }
    dockUp(element, panelType, dockNode, ratio, title, hideCloseButton) {
        let container = new PanelContainer(element, this.dockManager, title, panelType, hideCloseButton);
        this.dockManager.dockUp(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }
    dockDown(element, panelType, dockNode, ratio, title, hideCloseButton) {
        let container = new PanelContainer(element, this.dockManager, title, panelType, hideCloseButton);
        this.dockManager.dockDown(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }
    floatDialog(element, x, y, width, height, panelType, title, hideCloseButton) {
        let container = new PanelContainer(element, this.dockManager, title, panelType, hideCloseButton);
        let dlg = this.dockManager.floatDialog(container, x, y, null);
        dlg.resize(width, height);
    }
}
window.customElements.define('dock-spawn-ts', DockSpawnTsWebcomponent);
//# sourceMappingURL=DockSpawnTsWebcomponent.js.map