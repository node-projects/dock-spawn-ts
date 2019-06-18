import { DockManager } from "../DockManager.js";
import { PanelContainer } from "../PanelContainer.js";
import { PanelType } from "../enums/PanelType.js";
import { DockNode } from "../DockNode.js";

export class DockSpawnTsWebcomponent extends HTMLElement {

    public static cssRootDirectory = "../../";

    private dockManager: DockManager;
    private slotId: number = 0;
    private windowResizedBound;
    private slotElementMap: Map<HTMLSlotElement, HTMLElement>;
    private observer: MutationObserver;


    constructor() {
        super();

        const template = document.createElement('template')
        template.innerHTML = `
<link rel="stylesheet" href="${DockSpawnTsWebcomponent.cssRootDirectory}/lib/css/dock-manager.css">
<link rel="stylesheet" href="${DockSpawnTsWebcomponent.cssRootDirectory}/lib/css/dock-manager-style.css">
<div id="dockSpawnDiv" style="width:100%;height:100%;position:relative"></div>
`

        this.windowResizedBound = this.windowResized.bind(this);
        this.slotElementMap = new Map();

        let shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.appendChild(template.content.cloneNode(true));
        let dockSpawnDiv = shadowRoot.querySelector("#dockSpawnDiv") as HTMLDivElement;

        this.dockManager = new DockManager(dockSpawnDiv);
        this.dockManager.config.dialogRootElement = dockSpawnDiv;
        this.dockManager.initialize();

        this.dockManager.addLayoutListener({
            onClosePanel: (dockManager, dockNode) => {
                let slot = dockNode.elementContent as any as HTMLSlotElement;
                let element = this.slotElementMap.get(slot);
                this.removeChild(element);
                this.slotElementMap.delete(slot);
            }
        });

        for (let element of this.children) {
            this.handleAddedChildNode(element)
        }

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    this.handleAddedChildNode(node);
                });
                mutation.removedNodes.forEach((node) => {
                    this.handleRemovedChildNode(node);
                });
            });
        });
        this.observer.observe(this, { childList: true });

        this.dockManager.resize(this.clientWidth, this.clientHeight);
        requestAnimationFrame(() => {
            this.dockManager.resize(this.clientWidth, this.clientHeight);
        });
    }

    private handleAddedChildNode(element) {
        let slot = document.createElement('slot');
        let slotName = 'slot_' + this.slotId++;
        slot.name = slotName;
        element.slot = slotName;
        let container = new PanelContainer(slot, this.dockManager);
        this.dockManager.dockFill(this.dockManager.context.model.documentManagerNode, container);
        if ((<HTMLElement>element).style.display == 'none')
            (<HTMLElement>element).style.display = 'block';
        this.slotElementMap.set(slot, (<HTMLElement>element));
    }

    private handleRemovedChildNode(element) {
        (<PanelContainer>this.getDockNodeForElement(element).container).close();
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