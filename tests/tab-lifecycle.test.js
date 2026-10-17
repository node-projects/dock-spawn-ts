import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventHandler } from '../lib/js/EventHandler.js';
import { TabHost } from '../lib/js/TabHost.js';
import { TabHandle } from '../lib/js/TabHandle.js';
import { PanelContainer } from '../lib/js/PanelContainer.js';
import { DockManager } from '../lib/js/DockManager.js';

class EventSource {
    listeners = [];
    addEventListener(name, callback, options) {
        this.listeners.push({ name, callback, capture: typeof options === 'boolean' ? options : !!options?.capture });
    }
    removeEventListener(name, callback, capture = false) {
        this.listeners = this.listeners.filter(listener =>
            listener.name !== name || listener.callback !== callback || listener.capture !== capture);
    }
}

for (const options of [undefined, false, true, { capture: true, passive: false }, { passive: false }]) {
    test(`event cancellation matches capture mode: ${JSON.stringify(options)}`, () => {
        const source = new EventSource();
        const handler = new EventHandler(source, 'focus', () => {}, options);
        handler.cancel();
        handler.cancel();
        assert.equal(source.listeners.length, 0);
    });
}

for (const [Type, method, property] of [
    [TabHost, 'removeListener', 'eventListeners'],
    [TabHandle, 'removeListener', 'eventListeners'],
    [PanelContainer, 'removeListener', 'eventListeners'],
    [DockManager, 'removeLayoutListener', 'layoutEventListeners']
]) {
    test(`${Type.name}: removing an unknown or already removed listener preserves other listeners`, () => {
        const first = {}, second = {};
        const target = Object.create(Type.prototype);
        target[property] = [first, second];
        target[method]({});
        assert.deepEqual(target[property], [first, second]);
        target[method](first);
        target[method](first);
        assert.deepEqual(target[property], [second]);
    });
}

test('layout removes every obsolete tab, including consecutive tabs, and retains the active survivor', () => {
    const host = Object.create(TabHost.prototype);
    const destroyed = [], unregistered = [];
    const pages = [0, 1, 2, 3].map(id => ({
        container: { containerType: 'panel' },
        handle: { removeListener(listener) { unregistered.push(listener); } },
        destroy() { destroyed.push(id); },
        setSelected(selected) { this.selected = selected; }
    }));
    Object.assign(host, { pages: [...pages], activeTab: pages[3], tabHandleListener: {}, _setTabHandlesVisible() {} });
    host.performLayout([pages[3].container]);
    assert.deepEqual(destroyed, [0, 1, 2]);
    assert.equal(unregistered.length, 3);
    assert.deepEqual(host.pages, [pages[3]]);
    assert.equal(host.activeTab, pages[3]);
    assert.equal(pages[3].selected, true);
    host.performLayout([]);
    assert.deepEqual(destroyed, [0, 1, 2, 3]);
    assert.equal(host.pages.length, 0);
    assert.equal(host.activeTab, undefined);
});

function resizeHost() {
    return Object.assign(Object.create(TabHost.prototype), {
        pages: [], hostElement: { style: {} },
        tabListElement: { clientHeight: 20 }, separatorElement: { clientHeight: 1 },
        contentElement: { style: {} }
    });
}

test('rapid resizes schedule one tab resize using the most recent width', t => {
    const previous = globalThis.requestAnimationFrame;
    t.after(() => { globalThis.requestAnimationFrame = previous; });
    const frames = [];
    globalThis.requestAnimationFrame = callback => frames.push(callback);
    const host = resizeHost();
    host.resize(800, 600);
    host.resize(400, 600);
    host.resize(200, 600);
    assert.equal(frames.length, 1);
    const measured = [];
    host.resizeTabListElement = width => {
        measured.push(width);
        TabHost.prototype.resizeTabListElement.call(host, width);
    };
    frames.shift()();
    assert.deepEqual(measured, [200]);
    host.resize(300, 600);
    assert.equal(frames.length, 1);
});

test('tab sizing batches writes and reads and never assigns negative widths', () => {
    const host = resizeHost();
    const operations = [];
    const elements = [100, 200, 100].map((width, id) => ({
        style: { set width(value) { operations.push(['write', id, value]); } },
        get clientWidth() { operations.push(['read', id]); return width; }
    }));
    host.pages = elements.map(elementBase => ({ handle: { elementBase } }));
    host.resizeTabListElement(200);
    assert.deepEqual(operations.map(op => op[0]), [
        'write', 'write', 'write', 'read', 'read', 'read', 'write', 'write', 'write'
    ]);
    assert.deepEqual(operations.slice(-3).map(op => op[2]), ['50px', '100px', '45px']);
    operations.length = 0;
    host.resizeTabListElement(0);
    assert.deepEqual(operations.slice(-3).map(op => op[2]), ['0px', '0px', '0px']);
});

test('zero-width and destroyed tab handles do not produce invalid sizes', () => {
    const host = resizeHost();
    const element = { style: {}, clientWidth: 0 };
    host.pages = [{ handle: { elementBase: element } }, { handle: {} }];
    host.resizeTabListElement(0);
    assert.equal(element.style.width, '');
});

test('destroying a tab releases its undock gesture, context menu and event handlers', () => {
    let removed = false, menuClosed = false, cancellations = 0;
    const tab = Object.assign(Object.create(TabHandle.prototype), {
        parent: { container: { removeListener() { removed = true; } } },
        undockInitiator: { enabled: true },
        closeContextMenu() { menuClosed = true; }
    });
    for (const name of ['mouseDownHandler', 'touchDownHandler', 'closeButtonHandler',
        'closeButtonTouchHandler', 'auxClickHandler', 'mouseMoveHandler', 'touchMoveHandler',
        'mouseUpHandler', 'touchUpHandler', 'contextMenuHandler']) {
        tab[name] = { cancel() { cancellations++; } };
    }
    tab.destroy();
    assert.equal(tab.undockInitiator.enabled, false);
    assert.equal(menuClosed, true);
    assert.equal(removed, true);
    assert.equal(cancellations, 10);
});
