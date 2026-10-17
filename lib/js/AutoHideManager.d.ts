import { DockManager } from './DockManager.js';
import { DockNode } from './DockNode.js';
import { PanelContainer } from './PanelContainer.js';
export type AutoHideSide = 'left' | 'right' | 'top' | 'bottom';
export interface DockRestoreAnchor {
    elements: string[];
    document?: boolean;
}
export interface DockRestoreLocation {
    type: 'fill' | 'horizontal' | 'vertical';
    index: number;
    siblings: DockRestoreAnchor[];
    sizes: number[];
}
export interface DockRestoreState {
    width: number;
    height: number;
    locations: DockRestoreLocation[];
}
export interface AutoHidePanel {
    panel: PanelContainer;
    side: AutoHideSide;
    width: number;
    height: number;
    /** Restore membership in a surviving tool tab group when pinning. */
    tabGroupElement?: string;
    restoreLocations?: DockRestoreLocation[];
}
/** Edge tabs and a single overlay. Content stays in its original content container. */
export declare class AutoHideManager {
    private manager;
    private tabs;
    private rails;
    private openPanel?;
    private restoringPanel?;
    private readonly stripSize;
    private resizeHandle;
    private resizeDrag?;
    constructor(manager: DockManager);
    private get entries();
    getSide(panel: PanelContainer): AutoHideSide | undefined;
    isAutoHidden(panel: PanelContainer): boolean;
    isOpen(panel: PanelContainer): boolean;
    private anchor;
    private captureLocations;
    private panelKey;
    private captureState;
    /** Keep the layout before any panels are hidden, including peers still docked at that time. */
    private rememberLayout;
    /** Explicit docking starts a new remembered position for the moved panel. */
    onDock(node: DockNode): void;
    /** Locate the surviving branch, including empty document managers and composite siblings. */
    private resolveAnchor;
    private restoreLocation;
    private restoreSiblingLayout;
    setAutoHide(panel: PanelContainer, enabled: boolean, side?: AutoHideSide): void;
    private notify;
    private attach;
    show(panel: PanelContainer): void;
    private onOutside;
    private onKeyDown;
    hide(): void;
    remove(panel: PanelContainer): AutoHidePanel;
    /** Discard old edge UI before restoring a model. */
    reset(): void;
    restore(): void;
    resize(width: number, height: number): void;
    private layoutOverlay;
    private onResizeStart;
    private onResizeMove;
    private onResizeEnd;
    private stopResize;
}
