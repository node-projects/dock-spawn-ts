import { DockManager } from "../DockManager.js";
import { PanelContainer } from "../PanelContainer.js";
import { PanelType } from "../enums/PanelType.js";
import { DockNode } from "../DockNode.js";
//@ts-ignore
import style1 from "../../../lib/css/dock-manager-style.css" with { type: 'css'}
//@ts-ignore
import style2 from "../../../lib/css/dock-manager.css" with { type: 'css'}

function toParString(strings: TemplateStringsArray, values: any[]) {
    if (strings.length === 1)
        return strings.raw[0];
    else {
        let r = ''
        for (let i = 0; i < strings.length; i++) {
            r += strings[i] + (values[i] ?? '');
        }
        return r;
    }
}

const css = function (strings: TemplateStringsArray, ...values: any[]): CSSStyleSheet {
    const cssStyleSheet = new CSSStyleSheet();
    cssStyleSheet.replaceSync(toParString(strings, values));
    return cssStyleSheet;
};

export class DockSpawnTsWebcomponent extends HTMLElement {
    public dockManager: DockManager;
    private slotId: number = 0;
    private windowResizedBound;
    private slotElementMap: WeakMap<HTMLSlotElement, HTMLElement>;
    private observer: MutationObserver;
    private initialized = false;
    private elementContainerMap: Map<HTMLElement, PanelContainer> = new Map();

    static style = css`
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

    private initDockspawn() {
        const dockSpawnDiv = document.createElement('div')
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
                    let slot = dockNode.elementContent as any as HTMLSlotElement;
                    let element = this.slotElementMap.get(slot);
                    if (element)
                        this.removeChild(element);
                }
            });

            this.dockManager.resize(this.clientWidth, this.clientHeight);

            for (let element of this.children) {
                this.handleAddedChildNode(element as HTMLElement)
            }

            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        this.handleRemovedChildNode(node as HTMLElement);
                    });
                    mutation.addedNodes.forEach((node) => {
                        this.handleAddedChildNode(node as HTMLElement);
                    });
                });
            });
            this.observer.observe(this, { childList: true });
        }, 50);
    }

    public getElementInSlot(slot: HTMLSlotElement): HTMLElement {
        return this.slotElementMap.get(slot);
    }

    private handleAddedChildNode(element: HTMLElement) {
        let slot = document.createElement('slot');
        let slotName = 'slot_' + this.slotId++;
        slot.name = slotName;

        let dockPanelType = PanelType.panel;
        let dockPanelTypeAttribute = element.getAttribute('dock-spawn-panel-type');
        if (dockPanelTypeAttribute)
            dockPanelType = <PanelType><any>dockPanelTypeAttribute;
        let hideCloseButton = element.hasAttribute('dock-spawn-hide-close-button');
        let dockSpawnTitle = element.getAttribute('dock-spawn-title');
        let container = new PanelContainer(slot, this.dockManager, dockSpawnTitle ?? element.title, dockPanelType, hideCloseButton);
        element.slot = slotName;
        this.slotElementMap.set(slot, (<HTMLElement>element));
        this.elementContainerMap.set(element, container);

        let dockRatio: number = 0.5;
        let dockRatioAttribute = element.getAttribute('dock-spawn-dock-ratio');
        if (dockRatioAttribute)
            dockRatio = <number><any>dockRatioAttribute;
        let dockType = element.getAttribute('dock-spawn-dock-type');

        let dockRelativeTo = this.dockManager.context.model.documentManagerNode;
        let dockToAttribute = element.getAttribute('dock-spawn-dock-to');
        if (dockToAttribute) {
            //@ts-ignore
            const dockToElement = this.getRootNode().getElementById(dockToAttribute) as HTMLElement;
            if (dockToElement) {
                dockRelativeTo = this.dockManager.findNodeFromContainerElement(this.elementContainerMap.get(dockToElement).containerElement);
            }
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

    dockFill(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, title?: string, hideCloseButton?: boolean) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType, hideCloseButton);
        return this.dockManager.dockFill(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container);
    }

    dockLeft(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string, hideCloseButton?: boolean) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType, hideCloseButton);
        return this.dockManager.dockLeft(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }

    dockRight(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string, hideCloseButton?: boolean) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType, hideCloseButton);
        return this.dockManager.dockRight(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }

    dockUp(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string, hideCloseButton?: boolean) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType, hideCloseButton);
        return this.dockManager.dockUp(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }

    dockDown(element: HTMLElement, panelType?: PanelType, dockNode?: DockNode, ratio?: number, title?: string, hideCloseButton?: boolean) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType, hideCloseButton);
        return this.dockManager.dockDown(dockNode != null ? dockNode : this.dockManager.context.model.documentManagerNode, container, ratio);
    }

    floatDialog(element: HTMLElement, x: number, y: number, width: number, height: number, panelType?: PanelType, title?: string, hideCloseButton?: boolean) {
        let container = new PanelContainer(element as HTMLElement, this.dockManager, title, panelType, hideCloseButton);
        let dlg = this.dockManager.floatDialog(container, x, y, null);
        dlg.resize(width, height);
        return dlg;
    }
}

window.customElements.define('dock-spawn-ts', DockSpawnTsWebcomponent);