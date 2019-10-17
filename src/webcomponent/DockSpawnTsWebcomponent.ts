import { DockManager } from "../DockManager.js";
import { PanelContainer } from "../PanelContainer.js";
import { PanelType } from "../enums/PanelType.js";
import { DockNode } from "../DockNode.js";

export class DockSpawnTsWebcomponent extends HTMLElement {
    public static cssRootDirectory = "../../lib/css/";

    private dockManager: DockManager;
    private slotId: number = 0;
    private windowResizedBound;
    private slotElementMap: Map<HTMLSlotElement, HTMLElement>;
    private observer: MutationObserver;
    private initialized = false;
    private elementContainerMap : Map<HTMLElement, PanelContainer> = new Map();

    constructor() {
        super();

        this.windowResizedBound = this.windowResized.bind(this);
        this.slotElementMap = new Map();
    }

    private initDockspawn() {
        const template = document.createElement('template')
        template.innerHTML = `
<link rel="stylesheet" href="${DockSpawnTsWebcomponent.cssRootDirectory}dock-manager.css">
<link rel="stylesheet" href="${DockSpawnTsWebcomponent.cssRootDirectory}dock-manager-style.css">
<div id="dockSpawnDiv" style="width:100%;height:100%;position:relative"></div>
`

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
            this.handleAddedChildNode(element as HTMLElement)
        }

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    this.handleAddedChildNode(node as HTMLElement);
                });
                mutation.removedNodes.forEach((node) => {
                    this.handleRemovedChildNode(node as HTMLElement);
                });
            });
        });
        this.observer.observe(this, { childList: true });

        this.dockManager.resize(this.clientWidth, this.clientHeight);
        requestAnimationFrame(() => {
            this.dockManager.resize(this.clientWidth, this.clientHeight);
        });
    }

    private handleAddedChildNode(element: HTMLElement) {
        let slot = document.createElement('slot');
        let slotName = 'slot_' + this.slotId++;
        slot.name = slotName;
        element.slot = slotName;
        let container = new PanelContainer(slot, this.dockManager);

        this.elementContainerMap.set(element, container);

        let dockRatio: number = 0.5;
        let dockRatioAttribute = element.getAttribute('dock-spawn-dock-ratio');
        if (dockRatioAttribute)
            dockRatio = <number><any>dockRatioAttribute;
        let dockType = element.getAttribute('dock-spawn-dock-type');

        let dockRelativeTo = this.dockManager.context.model.documentManagerNode;
        let dockToAttribute = element.getAttribute('dock-spawn-dock-to');
        if (dockToAttribute) {
            let dockToElement = this.ownerDocument.getElementById(dockToAttribute) as HTMLElement;
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

        if ((<HTMLElement>element).style.display == 'none')
            (<HTMLElement>element).style.display = 'block';
        this.slotElementMap.set(slot, (<HTMLElement>element));
    }

    private handleRemovedChildNode(element: HTMLElement) {
        let node = this.getDockNodeForElement(element);
        if (node)
            (<PanelContainer>node.container).close();
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