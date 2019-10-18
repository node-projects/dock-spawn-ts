import { SplitterBar } from "./SplitterBar.js";
import { IDockContainer } from "./interfaces/IDockContainer.js";
/**
 * A splitter panel manages the child containers inside it with splitter bars.
 * It can be stacked horizontally or vertically
 */
export declare class SplitterPanel {
    panelElement: HTMLDivElement;
    spiltterBars: SplitterBar[];
    stackedVertical: boolean;
    childContainers: IDockContainer[];
    constructor(childContainers: IDockContainer[], stackedVertical: boolean);
    _buildSplitterDOMAndAddElements(): void;
    performLayout(children: IDockContainer[], relayoutEvenIfEqual: boolean): void;
    removeFromDOM(): void;
    destroy(): void;
    _insertContainerIntoPanel(container: IDockContainer, afterElement: HTMLElement): void;
    /**
     * Sets the percentage of space the specified [container] takes in the split panel
     * The percentage is specified in [ratio] and is between 0..1
     */
    setContainerRatio(container: IDockContainer, ratio: number): void;
    getRatios(): number[];
    setRatios(ratios: number[]): void;
    resize(width: number, height: number): void;
}
