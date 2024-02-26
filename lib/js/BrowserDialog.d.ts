declare function moveElementToNewBrowserWindow(element: HTMLElement, title: string, closeCallback: () => void, newWindowClosedCallback: () => void): void;
declare function cloneStyleSheet(window: Window, stylesheet: CSSStyleSheet, cache: Map<CSSStyleSheet, CSSStyleSheet>): any;
