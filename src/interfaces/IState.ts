import { PanelType } from "../enums/PanelType.js";

export interface IState {
    width?: number;
    height?: number;
    documentManager?: boolean;
    element?: string;
    canUndock?: boolean;
    hideCloseButton?: boolean;
    panelType?: PanelType;
}
