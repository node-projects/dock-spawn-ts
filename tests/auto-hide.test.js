import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AutoHideManager } from '../lib/js/AutoHideManager.js';
import { DockNode } from '../lib/js/DockNode.js';
import { DockModel } from '../lib/js/DockModel.js';
import { DockGraphSerializer } from '../lib/js/DockGraphSerializer.js';
import { DockGraphDeserializer } from '../lib/js/DockGraphDeserializer.js';
import { PanelContainer } from '../lib/js/PanelContainer.js';
import { PanelType } from '../lib/js/enums/PanelType.js';
import { DockConfig } from '../lib/js/DockConfig.js';
import { DockManager } from '../lib/js/DockManager.js';

class Element {
    style = {};
    children = [];
    attributes = {};
    classList = { add() {}, remove() {} };
    appendChild(child) { child.remove(); this.children.push(child); child.parentElement = this; }
    remove() {
        if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
        this.parentElement = null;
    }
    setAttribute(name, value) { this.attributes[name] = value; }
    focus() {}
}

function setup(t, side) {
    const previousDocument = globalThis.document;
    const listeners = new Map();
    globalThis.document = {
        createElement: () => new Element(),
        addEventListener(name, fn) { listeners.set(name, fn); },
        removeEventListener(name) { listeners.delete(name); }
    };
    t.after(() => { globalThis.document = previousDocument; });
    const contentRoot = new Element(), content = new Element();
    contentRoot.appendChild(content);
    const panel = { title: side, width: 200, height: 180, _canUndock: true,
        elementPanel: new Element(), elementContent: { id: side }, elementContentContainer: content,
        undockInitiator: {}, updateAutoHideButton() {},
        resize(width, height) { this.width = width; this.height = height; this.setVisible(true); },
        setVisible(visible) { content.style.display = visible ? '' : 'none'; } };
    const root = new DockNode({ containerType: ['left', 'right'].includes(side) ? 'horizontal' : 'vertical',
        width: 1000, height: 700, containerElement: new Element(),
        resize(width, height) { this.width = width; this.height = height; } });
    const tool = new DockNode(panel), documentNode = new DockNode({ containerType: 'fill' });
    for (const node of ['left', 'top'].includes(side) ? [tool, documentNode] : [documentNode, tool]) root.addChild(node);
    const model = new DockModel();
    Object.assign(model, { rootNode: root, documentManagerNode: documentNode, dialogs: [] });
    let docked;
    const manager = { element: new Element(), context: { model }, config: { enableAutoHide: true }, _undockEnabled: true,
        layoutEventListeners: [{ onAutoHideChanged() {} }],
        layoutEngine: { undock(node) { node.detachFromParent(); } },
        getNodeByElement(element) { return root.children.find(node => node.container.elementContent === element); },
        getNodeByElementId(id) { return root.children.find(node => node.container.elementContent?.id === id); },
        invalidate() { this.autoHideManager.resize(1000, 700); } };
    for (const method of ['dockLeft', 'dockRight', 'dockUp', 'dockDown', 'dockFill'])
        manager[method] = (reference, container, ratio) => { docked = { method, reference, container, ratio }; };
    manager.autoHideManager = new AutoHideManager(manager);
    return { manager, panel, root, tool, documentNode, contentRoot, listeners, getDocked: () => docked };
}

for (const side of ['left', 'right', 'top', 'bottom']) {
    test(`auto-hide ${side}: edge detection, overlay, dismissal, pinning and DOM preservation`, t => {
        const { manager, panel, root, contentRoot, listeners, getDocked } = setup(t, side);
        const autoHide = manager.autoHideManager;
        assert.equal(autoHide.getSide(panel), side);
        autoHide.setAutoHide(panel, true);
        assert.equal(autoHide.isAutoHidden(panel), true);
        assert.equal(panel.elementContentContainer.parentElement, contentRoot);
        assert.equal(panel.elementContentContainer.style.display, 'none');
        assert.equal(root.container.width, ['left', 'right'].includes(side) ? 974 : 1000);
        assert.equal(root.container.height, ['top', 'bottom'].includes(side) ? 674 : 700);
        const tab = manager.element.children.flatMap(rail => rail.children).find(el => el.textContent === side);
        tab.onclick();
        assert.equal(tab.attributes['aria-expanded'], 'true');
        assert.equal(panel.elementContentContainer.style.display, '');
        assert.equal(panel.elementContentContainer.style.zIndex, '9000');
        listeners.get('pointerdown')({ composedPath: () => [panel.elementContentContainer] });
        assert.equal(tab.attributes['aria-expanded'], 'true');
        listeners.get('focusin')({ composedPath: () => [] });
        assert.equal(tab.attributes['aria-expanded'], 'false');
        assert.equal(listeners.size, 0);
        autoHide.show(panel);
        let prevented = false;
        listeners.get('keydown')({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() {} });
        assert.equal(prevented, true);
        autoHide.setAutoHide(panel, false);
        assert.equal(autoHide.isAutoHidden(panel), false);
        assert.equal(root.container.width, 1000);
        assert.equal(root.container.height, 700);
        assert.equal(panel.elementContentContainer.parentElement, contentRoot);
        assert.equal(panel.elementContentContainer.style.zIndex, '');
        assert.equal(getDocked().method, { left: 'dockLeft', right: 'dockRight', top: 'dockUp', bottom: 'dockDown' }[side]);
    });
}

test('documents and locked panels cannot be auto-hidden', t => {
    const { manager, panel, documentNode, tool } = setup(t, 'left');
    panel._canUndock = false;
    manager.autoHideManager.setAutoHide(panel, true);
    assert.equal(manager.autoHideManager.isAutoHidden(panel), false);
    panel._canUndock = true;
    panel.panelType = PanelType.document;
    assert.equal(manager.autoHideManager.getSide(panel), undefined);
    panel.panelType = PanelType.panel;
    documentNode.addChild(tool);
    assert.equal(manager.autoHideManager.getSide(panel), undefined);
});

test('auto-hide is opt-in and disabling it re-pins existing panels', t => {
    const { manager, panel } = setup(t, 'left');
    assert.equal(new DockConfig().enableAutoHide, false);
    manager.getPanels = () => [panel];
    manager.autoHideManager.setAutoHide(panel, true);
    DockManager.prototype.setAutoHideEnabled.call(manager, false);
    assert.equal(manager.config.enableAutoHide, false);
    assert.equal(manager.autoHideManager.isAutoHidden(panel), false);
    manager.autoHideManager.setAutoHide(panel, true);
    assert.equal(manager.autoHideManager.isAutoHidden(panel), false);
});

test('only an open overlay enables title-bar dragging, respecting dock locks', t => {
    const { manager, panel } = setup(t, 'left');
    manager.autoHideManager.setAutoHide(panel, true);
    assert.equal(panel.undockInitiator.enabled, false);
    manager.autoHideManager.show(panel);
    assert.equal(panel.undockInitiator.enabled, true);
    manager.autoHideManager.hide();
    assert.equal(panel.undockInitiator.enabled, false);
    panel._canUndock = false;
    manager.autoHideManager.show(panel);
    assert.equal(panel.undockInitiator.enabled, false);
    manager.autoHideManager.hide();
});

for (const [edge, point] of [['left', [110, 300]], ['right', [1090, 300]], ['top', [500, 110]], ['bottom', [500, 790]]]) {
    test(`docking hit testing includes the ${edge} auto-hide strip`, () => {
        const root = new DockNode({ containerElement: { getBoundingClientRect: () =>
            ({ left: 126, top: 126, width: 948, height: 648 }) } });
        const manager = { context: { model: { rootNode: root } }, element: {
            getBoundingClientRect: () => ({ left: 100, top: 100, right: 1100, bottom: 800 }) } };
        assert.equal(DockManager.prototype._findNodeOnPoint.call(manager, ...point), root);
        assert.equal(DockManager.prototype._findNodeOnPoint.call(manager, 500, 500), root);
        assert.equal(DockManager.prototype._findNodeOnPoint.call(manager, 90, 300), undefined);
    });
}

test('edge state serializes original sizes even while the overlay is open', t => {
    const { manager, panel } = setup(t, 'bottom');
    manager.context.model.rootNode.container.saveState = () => {};
    manager.context.model.documentManagerNode.container.saveState = () => {};
    panel.saveState = state => Object.assign(state, { element: 'bottom', width: panel.width, height: panel.height });
    manager.autoHideManager.setAutoHide(panel, true);
    manager.autoHideManager.show(panel);
    const state = JSON.parse(new DockGraphSerializer().serialize(manager.context.model));
    assert.deepEqual(state.autoHidePanels[0].state, { element: 'bottom', width: 200, height: 180 });
    assert.equal(state.autoHidePanels[0].side, 'bottom');
    assert.equal(state.autoHidePanels[0].restoreLocations[0].index, 1);
    manager.autoHideManager.reset();
});

test('all panels remember the shared layout before the first unpin', t => {
    const { manager, panel, root, documentNode } = setup(t, 'left');
    const peer = { ...panel, width: 300, height: 700, elementContent: { id: 'peer' },
        elementPanel: new Element(), elementContentContainer: new Element(), undockInitiator: {} };
    root.addChildBefore(documentNode, new DockNode(peer));
    manager.autoHideManager.setAutoHide(panel, true);
    peer.width = 600;
    manager.autoHideManager.setAutoHide(peer, true);
    const entry = manager.context.model.autoHidePanels.find(entry => entry.panel === peer);
    assert.equal(entry.width, 300);
    assert.equal(entry.restoreLocations[0].index, 1);
    assert.deepEqual(entry.restoreLocations[0].siblings[0].elements, ['left']);
    assert.equal(manager.context.model.autoHideLayout['element:left'].locations[0].siblings.length, 3);
    manager.autoHideManager.reset();
    assert.equal(manager.context.model.autoHideLayout, undefined);
});

test('explicitly moving a panel updates its remembered position without losing hidden peers', t => {
    const { manager, panel, root, documentNode } = setup(t, 'left');
    const peer = { ...panel, width: 300, elementContent: { id: 'peer' },
        elementPanel: new Element(), elementContentContainer: new Element(), undockInitiator: {} };
    const peerNode = new DockNode(peer);
    root.addChildBefore(documentNode, peerNode);
    manager.autoHideManager.setAutoHide(panel, true);
    root.addChildAfter(documentNode, peerNode);
    manager.autoHideManager.onDock(peerNode);
    manager.autoHideManager.setAutoHide(peer, true);
    assert.equal(manager.context.model.autoHidePanels[1].restoreLocations[0].index, 1);
    assert.equal(manager.context.model.autoHideLayout['element:left'].locations[0].siblings[1].elements[0], 'peer');
    manager.autoHideManager.reset();
});

test('restoration supports old layouts, missing edge content and all four sides', async t => {
    const deserializer = new DockGraphDeserializer({});
    t.mock.method(deserializer, '_buildGraph', async () => ({}));
    t.mock.method(deserializer, '_buildDialogs', async () => []);
    t.mock.method(PanelContainer, 'loadFromState', async state => state.element === 'missing' ? null : { id: state.element });
    assert.deepEqual((await deserializer.deserialize('{}')).autoHidePanels, []);
    const entries = ['left', 'right', 'top', 'bottom', 'invalid'].map(side => ({ side,
        state: { element: side, width: 200, height: 180 }, tabGroupElement: 'tools' }));
    entries.push({ side: 'left', state: { element: 'missing' } });
    const model = await deserializer.deserialize(JSON.stringify({ autoHidePanels: entries }));
    assert.equal(model.autoHidePanels.length, 4);
    assert.deepEqual(model.autoHidePanels.map(entry => entry.side), ['left', 'right', 'top', 'bottom']);
    assert.ok(model.autoHidePanels.every(entry => entry.width === 200 && entry.tabGroupElement === 'tools'));
});
