import { PanelContainer } from "./PanelContainer.js";
export type NewWindowParams = {
    title?: string;
    closeCallback?: () => void;
    newWindowClosedCallback?: () => void;
    focused: (e: FocusEvent) => void;
    blured: (e: FocusEvent) => void;
};
export declare function moveElementToNewBrowserWindow(panelContainer: PanelContainer, params: NewWindowParams): Window;
