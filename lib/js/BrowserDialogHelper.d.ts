export declare function moveElementToNewBrowserWindow(element: HTMLElement, params: {
    title?: string;
    closeCallback?: () => void;
    newWindowClosedCallback?: () => void;
    focused: (e: FocusEvent) => void;
    blured: (e: FocusEvent) => void;
}): void;
