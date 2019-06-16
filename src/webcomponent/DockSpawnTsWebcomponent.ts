import { DockManager } from "../DockManager.js";
import { PanelContainer } from "../PanelContainer.js";
import { PanelType } from "../enums/PanelType.js";
import { DockNode } from "../DockNode.js";

export class DockSpawnTsWebcomponent extends HTMLElement {

    private dockManager: DockManager;
    private slotId: number = 0;
    private windowResizedBound;
    private slotElementMap: Map<HTMLSlotElement, HTMLElement>;

    constructor() {
        super();

        this.windowResizedBound = this.windowResized.bind(this);
        this.slotElementMap = new Map();

        let shadowRoot = this.attachShadow({ mode: 'open' });
        let dockSpawnDiv = document.createElement("div");
        dockSpawnDiv.style.width = "100%";
        dockSpawnDiv.style.height = "100%";
        dockSpawnDiv.style.position = "relative";
        shadowRoot.innerHTML = '<link rel="stylesheet" href="../../lib/css/dock-manager.css"><link rel="stylesheet" href="../../lib/css/dock-manager-style.css">';
        shadowRoot.appendChild(dockSpawnDiv);

        this.dockManager = new DockManager(dockSpawnDiv);
        this.dockManager.config.dialogRootElement = dockSpawnDiv;
        this.dockManager.initialize();
        this.dockManager.resize(this.clientWidth, this.clientHeight);
        let documentNode = this.dockManager.context.model.documentManagerNode;

        for (let element of this.children) {
            let slot = document.createElement('slot');
            let slotName = 'slot_' + this.slotId++;
            slot.name = slotName;
            element.slot = slotName;
            let container = new PanelContainer(slot, this.dockManager);
            this.dockManager.dockFill(documentNode, container);
            if ((<HTMLElement>element).style.display == 'none')
            (<HTMLElement>element).style.display = 'block';
            this.slotElementMap.set(slot, (<HTMLElement>element));
        }

        this.dockManager.addLayoutListener({
            onClosePanel: (dockManager, dockNode) => {
                let slot = dockNode.elementContent as any as HTMLSlotElement;
                let element = this.slotElementMap.get(slot);
                this.removeChild(element);
                this.slotElementMap.delete(slot);
            }
        });
    }

    connectedCallback() {
        window.addEventListener('resize', this.windowResizedBound);
        window.addEventListener('orientationchange', this.windowResizedBound);
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.windowResizedBound);
        window.removeEventListener('orientationchange', this.windowResizedBound);
    }

    private windowResized() {
        this.resize();
    }

    resize() {
        this.dockManager.resize(this.clientWidth, this.clientHeight);
    }

    getDockNodeForElement(elementOrContainer: HTMLElement | PanelContainer): DockNode {
        let element = elementOrContainer as HTMLElement;
        if ((<any>element).containerElement)
            element = (<any>elementOrContainer).containerElement as HTMLElement;
        return this.dockManager.findNodeFromContainerElement(element);
    }

    dockFill(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, title?: string) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType);
        this.dockManager.dockFill(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container);
    }

    dockLeft(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType);
        this.dockManager.dockLeft(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }

    dockRight(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType);
        this.dockManager.dockRight(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }

    dockUp(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType);
        this.dockManager.dockUp(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }

    dockDown(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType);
        this.dockManager.dockDown(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }
}

window.customElements.define('dock-spawn-ts', DockSpawnTsWebcomponent);