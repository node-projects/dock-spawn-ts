import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PanelContainer } from '../lib/js/PanelContainer.js';
import { TabHost } from '../lib/js/TabHost.js';
import { TabPage } from '../lib/js/TabPage.js';
import { FillDockContainer } from '../lib/js/FillDockContainer.js';
import { SplitterPanel } from '../lib/js/SplitterPanel.js';
import { SplitterDockContainer } from '../lib/js/SplitterDockContainer.js';
import { DockManager } from '../lib/js/DockManager.js';
import { AutoHideManager } from '../lib/js/AutoHideManager.js';
import { DraggableContainer } from '../lib/js/DraggableContainer.js';
import { ResizableContainer } from '../lib/js/ResizableContainer.js';
import { Dialog } from '../lib/js/Dialog.js';

function framesFor(t) {
    const previous = globalThis.requestAnimationFrame;
    const frames = [];
    globalThis.requestAnimationFrame = callback => frames.push(callback);
    t.after(() => { globalThis.requestAnimationFrame = previous; });
    return () => frames.splice(0).forEach(callback => callback());
}

function panel() {
    const element = () => ({ style: {} });
    return Object.assign(Object.create(PanelContainer.prototype), {
        panelDocked() {}, setVisible() {},
        elementTitle: { style: {}, clientHeight: 20 },
        elementContentHost: element(), elementPanel: element(),
        elementContentContainer: element(),
        elementContentWrapper: { getBoundingClientRect: () => ({ x: 40, y: 70, width: 300, height: 180 }) },
        dockManager: { config: { dialogRootElement: {
            getBoundingClientRect: () => ({ x: 10, y: 15 })
        } } },
        elementContent: {}
    });
}

function host(activePanel) {
    const page = Object.assign(Object.create(TabPage.prototype), { container: activePanel });
    return Object.assign(Object.create(TabHost.prototype), {
        pages: [], activeTab: page, hostElement: { style: {} },
        tabListElement: { clientHeight: 20 }, separatorElement: { clientHeight: 1 },
        contentElement: { style: {} }
    });
}

test('manager resize waits through splitter, fill, tab page and panel deferred layout', async t => {
    const flush = framesFor(t);
    const content = panel();
    let notified = false;
    content.elementContent.resizeHandler = () => {
        assert.equal(content.elementContentContainer.style.left, '30px');
        notified = true;
    };
    const tabs = host(content);
    let tabsResized = false;
    tabs.resizeTabListElement = () => { tabsResized = true; };
    const fill = Object.assign(Object.create(FillDockContainer.prototype), { element: { style: {} }, tabHost: tabs });
    fill.containerElement = fill.element;
    const other = { width: 200, height: 400, containerElement: { style: {}, clientWidth: 200 },
        resize() { return Promise.resolve(); } };
    const split = Object.assign(Object.create(SplitterPanel.prototype), {
        panelElement: { style: {} }, childContainers: [other, fill], stackedVertical: false,
        preferredChildSizes: new WeakMap(), preserveNonElasticSizes: true,
        spiltterBars: [{ barElement: { style: {}, clientWidth: 5 } }]
    });
    // Give the fill container measurable dimensions without a browser DOM.
    Object.assign(fill.element, { clientWidth: 395, clientHeight: 400 });
    fill.containerType = 'fill';
    const root = Object.assign(Object.create(SplitterDockContainer.prototype), { splitterPanel: split });
    const manager = Object.assign(Object.create(DockManager.prototype), {
        context: { model: { rootNode: { container: root }, dialogs: [] } },
        getPanels: () => [], element: { clientWidth: 600, clientHeight: 400 }
    });
    let settled = false;
    const resized = manager.invalidate().then(() => { settled = true; });
    assert.equal(root.width, 600);
    assert.equal(content.width, 395);
    await Promise.resolve();
    assert.equal(settled, false);
    assert.equal(notified, false);
    flush();
    await resized;
    assert.equal(tabsResized, true);
    assert.equal(notified, true);
    assert.equal(content.elementContentContainer.style.top, '55px');
    assert.equal(content.elementContentContainer.style.height, '180px');
});

test('every coalesced tab resize waits for tab widths and its active content', async t => {
    const flush = framesFor(t);
    let finishContent;
    const content = new Promise(resolve => { finishContent = resolve; });
    const tabs = host({ resize: () => content });
    const widths = [];
    tabs.resizeTabListElement = width => widths.push(width);
    let settled = 0;
    const pending = [800, 400, 200].map(width => tabs.resize(width, 500).then(() => settled++));
    flush();
    await Promise.resolve();
    assert.deepEqual(widths, [200]);
    assert.equal(settled, 0);
    finishContent();
    await Promise.all(pending);
    assert.equal(settled, 3);
    const next = tabs.resize(300, 500);
    flush();
    await next;
    assert.deepEqual(widths, [200, 300]);
});

test('tab measurement failures reject resize and allow subsequent resizes', async t => {
    const flush = framesFor(t);
    const tabs = host({ resize: () => Promise.resolve() });
    tabs.resizeTabListElement = () => { throw new Error('measurement failed'); };
    const resized = tabs.resize(200, 300);
    flush();
    await assert.rejects(resized, /measurement failed/);
    tabs.resizeTabListElement = () => {};
    const retry = tabs.resize(400, 300);
    flush();
    await retry;
});

test('wrapped tab rows resize content using the final strip height and wait for it', async t => {
    const flush = framesFor(t);
    const sizes = [];
    let finish;
    const resizedContent = new Promise(resolve => { finish = resolve; });
    const tabs = host({ resize(width, height) {
        sizes.push([width, height]);
        return sizes.length === 1 ? Promise.resolve() : resizedContent;
    } });
    tabs.resizeTabListElement = () => { tabs.tabListElement.clientHeight = 66; };
    let settled = false;
    const pending = tabs.resize(300, 200).then(() => { settled = true; });
    flush();
    await Promise.resolve();
    assert.deepEqual(sizes, [[300, 179], [300, 133]]);
    assert.equal(tabs.contentElement.style.height, '133px');
    assert.equal(settled, false);
    finish();
    await pending;
});

test('destroying a host before its pending frame skips tab measurement', async t => {
    const flush = framesFor(t);
    const tabs = host({ resize: () => Promise.resolve() });
    tabs.groupUndockInitiator = { enabled: true };
    tabs.mouseDownHandler = tabs.focusHandler = { cancel() {} };
    tabs.resizeTabListElement = () => { throw Error('Destroyed DOM must not be measured'); };
    const pending = tabs.resize(300, 200);
    tabs.destroy();
    flush();
    await pending;
});

test('auto-hide resize waits for both the root and open overlay', async () => {
    const resolvers = [];
    const resize = () => new Promise(resolve => resolvers.push(resolve));
    const root = { width: 600, height: 400, containerElement: { style: {} }, resize };
    const overlay = { elementPanel: { style: {} }, resize };
    const manager = Object.assign(Object.create(AutoHideManager.prototype), {
        openPanel: overlay, stripSize: 25, rails: new Map(), resizeHandle: { style: {} },
        manager: { context: { model: { rootNode: { container: root },
            autoHidePanels: [{ side: 'left', panel: overlay, width: 200, height: 300 }]
        } } }
    });
    let settled = false;
    const resized = manager.resize(600, 400).then(() => { settled = true; });
    assert.equal(resolvers.length, 2);
    resolvers[0]();
    await Promise.resolve();
    assert.equal(settled, false);
    resolvers[1]();
    await resized;
});

test('dialog resize waits for decorated content before dispatching its resize event', async t => {
    let finish;
    const content = new Promise(resolve => { finish = resolve; });
    const draggable = Object.assign(Object.create(DraggableContainer.prototype), {
        delegate: { resize: () => content }
    });
    const events = [];
    const previous = globalThis.document;
    globalThis.document = { dispatchEvent: event => events.push(event) };
    t.after(() => { globalThis.document = previous; });
    const event = {};
    const resizable = Object.assign(Object.create(ResizableContainer.prototype), {
        delegate: draggable, _adjustResizeHandles() {}, dockSpawnResizedEvent: event
    });
    const dialog = Object.assign(Object.create(Dialog.prototype), { resizable });
    const resized = dialog.resize(300, 200);
    await Promise.resolve();
    assert.deepEqual(events, []);
    finish();
    await resized;
    assert.deepEqual(events, [event]);
});

for (const preserveNonElasticSizes of [false, true]) {
    test(`splitter waits for every child resize (preserve sizes: ${preserveNonElasticSizes})`, async () => {
        const resolvers = [];
        const children = ['panel', 'fill'].map(containerType => ({
            containerType, width: 200, height: 300,
            containerElement: { style: {}, clientWidth: 200 },
            resize(width, height) {
                this.width = width;
                this.height = height;
                return new Promise(resolve => resolvers.push(resolve));
            }
        }));
        const split = Object.assign(Object.create(SplitterPanel.prototype), {
            childContainers: children, panelElement: { style: {} }, stackedVertical: false,
            spiltterBars: [{ barElement: { style: {}, clientWidth: 5 } }],
            preferredChildSizes: new WeakMap(), preserveNonElasticSizes
        });
        let settled = false;
        const resized = split.resize(605, 300).then(() => { settled = true; });
        assert.equal(children[0].width + children[1].width, 600);
        resolvers.slice(1).forEach(resolve => resolve());
        await Promise.resolve();
        assert.equal(settled, false);
        resolvers[0]();
        await resized;
    });
}
