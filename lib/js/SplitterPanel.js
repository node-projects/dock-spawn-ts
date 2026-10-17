import { SplitterBar } from "./SplitterBar.js";
import { Utils } from "./Utils.js";
import { ContainerType } from "./ContainerType.js";
/**
 * A splitter panel manages the child containers inside it with splitter bars.
 * It can be stacked horizontally or vertically
 */
export class SplitterPanel {
    panelElement;
    spiltterBars;
    stackedVertical;
    childContainers;
    preferredChildSizes = new WeakMap();
    preserveNonElasticSizes = false;
    constructor(childContainers, stackedVertical) {
        this.childContainers = childContainers;
        this.stackedVertical = stackedVertical;
        this.panelElement = document.createElement('div');
        this.spiltterBars = [];
        this._buildSplitterDOMAndAddElements();
    }
    _buildSplitterDOMAndAddElements() {
        if (this.childContainers.length <= 1)
            throw new Error('Splitter panel should contain atleast 2 panels');
        this.spiltterBars = [];
        let afterElement = null;
        for (let i = 0; i < this.childContainers.length - 1; i++) {
            let previousContainer = this.childContainers[i];
            let nextContainer = this.childContainers[i + 1];
            let splitterBar = new SplitterBar(previousContainer, nextContainer, this.stackedVertical);
            this.spiltterBars.push(splitterBar);
            // Add the container and split bar to the panel's base div element
            if (!Array.from(this.panelElement.children).includes(previousContainer.containerElement))
                this._insertContainerIntoPanel(previousContainer, afterElement);
            this.panelElement.insertBefore(splitterBar.barElement, previousContainer.containerElement.nextSibling);
            afterElement = splitterBar.barElement;
        }
        let last = this.childContainers.slice(-1)[0];
        if (!Array.from(this.panelElement.children).includes(last.containerElement))
            this._insertContainerIntoPanel(last, afterElement);
    }
    performLayout(children, relayoutEvenIfEqual) {
        let containersEqual = Utils.arrayEqual(this.childContainers, children);
        if (!containersEqual || relayoutEvenIfEqual) {
            if (!relayoutEvenIfEqual) {
                const onlyRemovedChildren = !containersEqual && children.every(child => this.childContainers.includes(child));
                this.preferredChildSizes = new WeakMap();
                // Closing or floating a panel gives its space to the elastic area,
                // without scaling unrelated tools or restoring stale splitter sizes.
                if (onlyRemovedChildren) {
                    for (const child of children)
                        this.preferredChildSizes.set(child, this.getChildSize(child));
                }
                this.preserveNonElasticSizes = onlyRemovedChildren;
            }
            this.childContainers.forEach((container) => {
                if (!children.some((item) => item == container)) {
                    if (container.containerElement) {
                        container.containerElement.classList.remove('splitter-container-vertical');
                        container.containerElement.classList.remove('splitter-container-horizontal');
                        Utils.removeNode(container.containerElement);
                    }
                }
            });
            this.spiltterBars.forEach((bar) => { Utils.removeNode(bar.barElement); });
            // rebuild
            this.childContainers = children;
            this._buildSplitterDOMAndAddElements();
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
    _insertContainerIntoPanel(container, afterElement) {
        if (!container) {
            console.error('container is undefined');
            return;
        }
        if (container.containerElement.parentNode != this.panelElement) {
            Utils.removeNode(container.containerElement);
            if (afterElement)
                this.panelElement.insertBefore(container.containerElement, afterElement.nextSibling);
            else {
                if (this.panelElement.children.length > 0)
                    this.panelElement.insertBefore(container.containerElement, this.panelElement.children[0]);
                else
                    this.panelElement.appendChild(container.containerElement);
            }
        }
        container.containerElement.classList.add(this.stackedVertical ? 'splitter-container-vertical' : 'splitter-container-horizontal');
    }
    /**
     * Sets the percentage of space the specified [container] takes in the split panel
     * The percentage is specified in [ratio] and is between 0..1
     */
    setContainerRatio(container, ratio) {
        const pending = [];
        let splitPanelSize = this.stackedVertical ? this.panelElement.clientHeight : this.panelElement.clientWidth;
        let newContainerSize = splitPanelSize * ratio;
        let barSize = this.stackedVertical ? this.spiltterBars[0].barElement.clientHeight : this.spiltterBars[0].barElement.clientWidth;
        let otherPanelSizeQuota = splitPanelSize - newContainerSize - barSize * this.spiltterBars.length;
        let otherPanelScaleMultipler = otherPanelSizeQuota / splitPanelSize;
        for (let i = 0; i < this.childContainers.length; i++) {
            let child = this.childContainers[i];
            let size;
            if (child !== container) {
                size = this.stackedVertical ? child.containerElement.parentElement.clientHeight : child.containerElement.parentElement.clientWidth;
                size *= otherPanelScaleMultipler;
            }
            else
                size = newContainerSize;
            if (this.stackedVertical)
                pending.push(child.resize(child.width, Math.floor(size)));
            else
                pending.push(child.resize(Math.floor(size), child.height));
            this.preferredChildSizes.set(child, Math.floor(size));
        }
        this.preserveNonElasticSizes = this.hasElasticChild();
        return Promise.all(pending).then(() => { });
    }
    getRatios() {
        let barSize = this.stackedVertical ? this.spiltterBars[0].barElement.clientHeight : this.spiltterBars[0].barElement.clientWidth;
        let splitPanelSize = (this.stackedVertical ? this.panelElement.clientHeight : this.panelElement.clientWidth) - barSize * this.spiltterBars.length;
        let result = [];
        for (let i = 0; i < this.childContainers.length; i++) {
            let child = this.childContainers[i];
            let sizeOld = this.stackedVertical ? child.containerElement.clientHeight : child.containerElement.clientWidth;
            result.push(sizeOld / splitPanelSize);
        }
        return result;
    }
    setRatios(ratios) {
        let barSize = this.stackedVertical ? this.spiltterBars[0].barElement.clientHeight : this.spiltterBars[0].barElement.clientWidth;
        let splitPanelSize = (this.stackedVertical ? this.panelElement.clientHeight : this.panelElement.clientWidth) - barSize * this.spiltterBars.length;
        let updatedTotalSize = 0;
        const sizes = [];
        for (let i = 0; i < this.childContainers.length; i++) {
            let size = Math.floor(splitPanelSize * ratios[i]);
            updatedTotalSize += size;
            // Fix rounding error on last child so panels fill the available space exactly
            if (i === this.childContainers.length - 1)
                size += splitPanelSize - updatedTotalSize;
            sizes.push(size);
        }
        return this.setSizes(sizes);
    }
    /** Apply pixel sizes without converting unchanged panes through fractional ratios. */
    setSizes(sizes) {
        const pending = [];
        for (let i = 0; i < this.childContainers.length; i++) {
            const child = this.childContainers[i], size = sizes[i];
            if (this.stackedVertical)
                pending.push(child.resize(child.width, size));
            else
                pending.push(child.resize(size, child.height));
            this.preferredChildSizes.set(child, size);
        }
        this.preserveNonElasticSizes = this.hasElasticChild();
        return Promise.all(pending).then(() => { });
    }
    resize(width, height) {
        const pending = [];
        if (this.childContainers.length <= 1)
            return Promise.resolve();
        this.panelElement.style.width = width + 'px';
        this.panelElement.style.height = height + 'px';
        for (let i = 0; i < this.childContainers.length; i++) {
            if (i < this.spiltterBars.length) {
                let splitBar = this.spiltterBars[i];
                if (this.stackedVertical)
                    splitBar.barElement.style.width = width + 'px';
                else
                    splitBar.barElement.style.height = height + 'px';
            }
        }
        let barSize = this.stackedVertical ? this.spiltterBars[0].barElement.clientHeight : this.spiltterBars[0].barElement.clientWidth;
        let targetTotalChildPanelSize = this.stackedVertical ? height : width;
        targetTotalChildPanelSize -= barSize * this.spiltterBars.length;
        if (!this.preserveNonElasticSizes || !this.hasElasticChild()) {
            return this.resizeProportionally(width, height, targetTotalChildPanelSize);
        }
        let resizeIndex = this.getElasticChildIndex();
        let childSizes = this.childContainers.map((container, index) => {
            let currentSize = this.getChildSize(container);
            if (index === resizeIndex)
                return currentSize;
            let preferredSize = this.preferredChildSizes.get(container);
            if (preferredSize === undefined || currentSize > preferredSize)
                preferredSize = currentSize;
            this.preferredChildSizes.set(container, preferredSize);
            return preferredSize;
        });
        let totalChildPanelSize = childSizes.reduce((sum, size) => sum + size, 0);
        if (totalChildPanelSize <= 0) {
            let size = targetTotalChildPanelSize / this.childContainers.length;
            childSizes = this.childContainers.map(() => size);
            totalChildPanelSize = targetTotalChildPanelSize;
        }
        let sizeDelta = targetTotalChildPanelSize - totalChildPanelSize;
        childSizes[resizeIndex] += sizeDelta;
        if (childSizes[resizeIndex] < 0) {
            let deficit = -childSizes[resizeIndex];
            childSizes[resizeIndex] = 0;
            for (let i = this.childContainers.length - 1; i >= 0 && deficit > 0; i--) {
                if (i === resizeIndex)
                    continue;
                let reduction = Math.min(childSizes[i], deficit);
                childSizes[i] -= reduction;
                deficit -= reduction;
            }
        }
        childSizes = childSizes.map((size) => Math.floor(size));
        childSizes[resizeIndex] += targetTotalChildPanelSize - childSizes.reduce((sum, size) => sum + size, 0);
        for (let i = 0; i < this.childContainers.length; i++) {
            let child = this.childContainers[i];
            if (child.containerElement.style.display == 'none')
                child.containerElement.style.display = 'block';
            let newSize = childSizes[i];
            if (this.stackedVertical)
                pending.push(child.resize(width, newSize));
            else
                pending.push(child.resize(newSize, height));
        }
        return Promise.all(pending).then(() => { });
    }
    resizeProportionally(width, height, targetTotalChildPanelSize) {
        const pending = [];
        for (let i = 0; i < this.childContainers.length; i++) {
            let childContainer = this.childContainers[i];
            if (this.stackedVertical)
                pending.push(childContainer.resize(width, !childContainer.height ? height : childContainer.height));
            else
                pending.push(childContainer.resize(!childContainer.width ? width : childContainer.width, height));
        }
        let totalChildPanelSize = 0;
        this.childContainers.forEach((container) => {
            let size = this.stackedVertical ? container.height : container.width;
            totalChildPanelSize += size;
        });
        totalChildPanelSize = Math.max(totalChildPanelSize, 1);
        let scaleMultiplier = targetTotalChildPanelSize / totalChildPanelSize;
        let updatedTotalChildPanelSize = 0;
        for (let i = 0; i < this.childContainers.length; i++) {
            let child = this.childContainers[i];
            if (child.containerElement.style.display == 'none')
                child.containerElement.style.display = 'block';
            let original = this.stackedVertical ? child.containerElement.clientHeight : child.containerElement.clientWidth;
            let newSize = Math.floor(original * scaleMultiplier);
            updatedTotalChildPanelSize += newSize;
            if (i === this.childContainers.length - 1)
                newSize += targetTotalChildPanelSize - updatedTotalChildPanelSize;
            if (this.stackedVertical)
                pending.push(child.resize(child.width, newSize));
            else
                pending.push(child.resize(newSize, child.height));
            this.preferredChildSizes.set(child, newSize);
        }
        return Promise.all(pending).then(() => { });
    }
    hasElasticChild() {
        return this.childContainers.some((container) => container.containerType === ContainerType.fill ||
            container.containerType === ContainerType.horizontal ||
            container.containerType === ContainerType.vertical);
    }
    getElasticChildIndex() {
        let fillIndex = this.childContainers.findIndex((container) => container.containerType === ContainerType.fill);
        if (fillIndex >= 0)
            return fillIndex;
        let compositeIndex = this.childContainers.findIndex((container) => container.containerType === ContainerType.horizontal || container.containerType === ContainerType.vertical);
        if (compositeIndex >= 0)
            return compositeIndex;
        return this.childContainers.length - 1;
    }
    getChildSize(container) {
        return this.stackedVertical ? container.height : container.width;
    }
}
//# sourceMappingURL=SplitterPanel.js.map