export function moveElementToNewBrowserWindow(panelContainer, params) {
    const element = panelContainer.resolvedElementContent;
    const rect = element.getBoundingClientRect();
    const newWindowBounds = { x: rect.x + 24, y: rect.y + 60, width: rect.width, height: rect.height };
    const win = window.open('about:blank', undefined, `popup=yes,left=${newWindowBounds.x},top=${newWindowBounds.y},width=${newWindowBounds.width},height=${newWindowBounds.height}`);
    win.onfocus = (e) => params.focused(e);
    win.onblur = (e) => params.blured(e);
    let styles = [...document.head.querySelectorAll('link')].map(x => x.cloneNode());
    for (let s of styles) {
        win.document.head.appendChild(win.document.adoptNode(s));
    }
    let st = win.document.createElement("style");
    st.innerText = `
    html {
        overflow: hidden;
        position: fixed;
        width: 100%;
        height: 100%;
    }
    body {
        height: 100%;
        width: 100%;
        margin: 0;
    }
    `;
    win.document.head.appendChild(st);
    const titleEl = win.document.createElement("title");
    titleEl.innerText = params.title;
    win.document.head.appendChild(titleEl);
    win.onunload = () => params.newWindowClosedCallback();
    const cache = new Map();
    const listSs = new Map();
    function backupSs(el) {
        if (el.shadowRoot) {
            if (el.shadowRoot.adoptedStyleSheets.length > 0) {
                listSs.set(el, [...el.shadowRoot.adoptedStyleSheets.map(x => cloneStyleSheet(win, x, cache))]);
            }
            for (const e of el.shadowRoot.querySelectorAll('*')) {
                backupSs(e);
            }
        }
    }
    backupSs(element);
    for (const e of element.querySelectorAll('*')) {
        backupSs(e);
    }
    win.document.body.appendChild(win.document.adoptNode(element));
    for (const e of listSs) {
        e[0].shadowRoot.adoptedStyleSheets = e[1];
    }
    params.closeCallback();
    panelContainer.dockManager.notifyOnNewWindow(panelContainer, win);
    return win;
}
function cloneStyleSheet(window, stylesheet, cache) {
    const existingCopy = cache.get(stylesheet);
    if (existingCopy)
        return existingCopy;
    let payload = "";
    const rules = stylesheet.cssRules;
    for (var i = 0; i < rules.length; i++) {
        payload += rules[i].cssText + "\n";
    }
    //@ts-ignore
    const newStylesheet = new window.CSSStyleSheet();
    cache.set(stylesheet, newStylesheet);
    newStylesheet.replaceSync(payload);
    return newStylesheet;
}
//# sourceMappingURL=BrowserDialogHelper.js.map