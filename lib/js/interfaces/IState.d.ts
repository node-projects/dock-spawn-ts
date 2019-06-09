import { PanelType } from "../enums/PanelType";
export interface IState {
    width?: number;
    height?: number;
    documentManager?: boolean;
    element?: string;
    canUndock?: boolean;
    hideCloseButton?: boolean;
    panelType?: PanelType;
}
