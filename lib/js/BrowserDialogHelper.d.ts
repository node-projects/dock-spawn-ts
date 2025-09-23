import { PanelContainer } from "./PanelContainer.js";
export declare function moveElementToNewBrowserWindow(panelContainer: PanelContainer, params: {
    title?: string;
    closeCallback?: () => void;
    newWindowClosedCallback?: () => void;
    focused: (e: FocusEvent) => void;
    blured: (e: FocusEvent) => void;
}): Window;
