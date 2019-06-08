import { SplitterBar } from "./SplitterBar.js";
import { Utils } from "./Utils.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";

/**
 * A splitter panel manages the child containers inside it with splitter bars.
 * It can be stacked horizontally or vertically
 */
export class SplitterPanel {
    panelElement: HTMLDivElement;
    spiltterBars: SplitterBar[];
    stackedVertical: boolean;
    childContainers: IDockContainer[];

    constructor(childContainers: IDockContainer[], stackedVertical: boolean) {
        this.childContainers = childContainers;
        this.stackedVertical = stackedVertical;
        this.panelElement = document.createElement('div');
        this.spiltterBars = [];
        this._buildSplitterDOM();
    }

    _buildSplitterDOM() {
        if (this.childContainers.length <= 1)
            throw new Error('Splitter panel should contain atleast 2 panels');

        this.spiltterBars = [];
        for (let i = 0; i < this.childContainers.length - 1; i++) {
            let previousContainer = this.childContainers[i];
            let nextContainer = this.childContainers[i + 1];
            let splitterBar = new SplitterBar(previousContainer, nextContainer, this.stackedVertical);
            this.spiltterBars.push(splitterBar);

            // Add the container and split bar to the panel's base div element
            this._insertContainerIntoPanel(previousContainer);
            this.panelElement.appendChild(splitterBar.barElement);
        }
        this._insertContainerIntoPanel(this.childContainers.slice(-1)[0]);
    }

    performLayout(children: IDockContainer[], relayoutEvenIfEqual: boolean) {
        let containersEqual = Utils.arrayEqual(this.childContainers, children);
        if (!containersEqual || relayoutEvenIfEqual) {
            this.removeFromDOM();

            // rebuild
            this.childContainers = children;
            this._buildSplitterDOM();
        }
    }

    removeFromDOM() {
        this.childContainers.forEach((container) => {
            if (container.containerElement) {
                container.containerElement.classList.remove('splitter-container-vertical');
                container.containerElement.classList.remove('splitter-container-horizontal');
                Utils.removeNode(container.containerElement);
            }
        });
        this.spiltterBars.forEach((bar) => { Utils.removeNode(bar.barElement); });
    }

    destroy() {
        this.removeFromDOM();
        this.panelElement.parentNode.removeChild(this.panelElement);
    }

    _insertContainerIntoPanel(container: IDockContainer) {
        if (!container) {
            console.error('container is undefined');
            return;
        }

        Utils.removeNode(container.containerElement);
        this.panelElement.appendChild(container.containerElement);
        container.containerElement.classList.add(
            this.stackedVertical ? 'splitter-container-vertical' : 'splitter-container-horizontal'
        );
    }

    /**
     * Sets the percentage of space the specified [container] takes in the split panel
     * The percentage is specified in [ratio] and is between 0..1
     */
    setContainerRatio(container: IDockContainer, ratio: number) {
        let splitPanelSize = this.stackedVertical ? this.panelElement.clientHeight : this.panelElement.clientWidth;
        let newContainerSize = splitPanelSize * ratio;
        let barSize = this.stackedVertical ?
            this.spiltterBars[0].barElement.clientHeight : this.spiltterBars[0].barElement.clientWidth;

        let otherPanelSizeQuota = splitPanelSize - newContainerSize - barSize * this.spiltterBars.length;
        let otherPanelScaleMultipler = otherPanelSizeQuota / splitPanelSize;

        for (let i = 0; i < this.childContainers.length; i++) {
            let child = this.childContainers[i];
            let size;
            if (child !== container) {
                size = this.stackedVertical ? child.containerElement.clientHeight : child.containerElement.clientWidth;
                size *= otherPanelScaleMultipler;
            }
            else
                size = newContainerSize;

            if (this.stackedVertical)
                child.resize(child.width, Math.floor(size));
            else
                child.resize(Math.floor(size), child.height);
        }
    }

    resize(width: number, height: number) {
        if (this.childContainers.length <= 1)
            return;

        let i;

        // Adjust the fixed dimension that is common to all (i.e. width, if stacked vertical; height, if stacked horizontally)
        for (i = 0; i < this.childContainers.length; i++) {
            let childContainer = this.childContainers[i];
            if (this.stackedVertical)
                childContainer.resize(width, childContainer.height);
            else
                childContainer.resize(childContainer.width, height);

            if (i < this.spiltterBars.length) {
                let splitBar = this.spiltterBars[i];
                if (this.stackedVertical)
                    splitBar.barElement.style.width = width + 'px';
                else
                    splitBar.barElement.style.height = height + 'px';
            }
        }

        // Adjust the varying dimension
        let totalChildPanelSize = 0;
        // Find out how much space existing child containers take up (excluding the splitter bars)
        this.childContainers.forEach((container) => {
            let size = this.stackedVertical ?
                container.height :
                container.width;
            totalChildPanelSize += size;
        });

        // Get the thickness of the bar
        let barSize = this.stackedVertical ?
            this.spiltterBars[0].barElement.clientHeight : this.spiltterBars[0].barElement.clientWidth;

        // Find out how much space existing child containers will take after being resized (excluding the splitter bars)
        let targetTotalChildPanelSize = this.stackedVertical ? height : width;
        targetTotalChildPanelSize -= barSize * this.spiltterBars.length;

        // Get the scale multiplier
        totalChildPanelSize = Math.max(totalChildPanelSize, 1);
        let scaleMultiplier = targetTotalChildPanelSize / totalChildPanelSize;


        // Update the size with this multiplier
        let updatedTotalChildPanelSize = 0;
        for (i = 0; i < this.childContainers.length; i++) {
            let child = this.childContainers[i];
            if (child.containerElement.style.display == 'none')
                child.containerElement.style.display = 'block';
            let original = this.stackedVertical ? child.containerElement.clientHeight : child.containerElement.clientWidth;
            let newSize = scaleMultiplier > 1 ? Math.floor(original * scaleMultiplier) : Math.ceil(original * scaleMultiplier);
            updatedTotalChildPanelSize += newSize;

            // If this is the last node, add any extra pixels to fix the rounding off errors and match the requested size
            if (i === this.childContainers.length - 1)
                newSize += targetTotalChildPanelSize - updatedTotalChildPanelSize;

            // Set the size of the panel
            if (this.stackedVertical)
                child.resize(child.width, newSize);
            else
                child.resize(newSize, child.height);
        }

        this.panelElement.style.width = width + 'px';
        this.panelElement.style.height = height + 'px';
    }
}