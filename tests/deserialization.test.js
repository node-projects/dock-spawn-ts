import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DockGraphDeserializer } from '../lib/js/DockGraphDeserializer.js';
import { PanelContainer } from '../lib/js/PanelContainer.js';
import { DockGraphSerializer } from '../lib/js/DockGraphSerializer.js';
import { Dialog } from '../lib/js/Dialog.js';
import { DockManager } from '../lib/js/DockManager.js';
import { FillDockContainer } from '../lib/js/FillDockContainer.js';

test('restoring a layout releases old docked and floating content layers and tab hosts', async t => {
    const events = [];
    function element(name) {
        const node = { parentNode: { removeChild(child) {
            events.push('remove ' + name);
            child.parentNode = null;
        } } };
        return node;
    }
    const panels = ['docked', 'floating'].map(name => ({
        elementContentContainer: element(name),
        destroy() { events.push('destroy ' + name); }
    }));
    const root = { children: [], container: Object.assign(Object.create(FillDockContainer.prototype), {
        containerElement: element('root'), tabHost: { destroy() { events.push('release tabs'); } }
    }) };
    const model = {};
    t.mock.method(DockGraphDeserializer.prototype, 'deserialize', async () => {
        events.push('restore content');
        return model;
    });
    const manager = Object.assign(Object.create(DockManager.prototype), {
        context: { model: { rootNode: root, dialogs: [{ destroy() { events.push('destroy dialog'); } }] } },
        getPanels: () => panels,
        setModel(restored) { assert.equal(restored, model); events.push('set model'); }
    });
    await manager.loadState('{}');
    assert.deepEqual(events, ['destroy dialog', 'restore content', 'release tabs',
        'destroy docked', 'remove docked', 'destroy floating', 'remove floating', 'remove root', 'set model']);
    assert.ok(panels.every(panel => panel.elementContentContainer.parentNode === null));
});

for (const disableResize of [true, false, undefined]) {
    test(`dialog resize behavior survives JSON round trip (disableResize: ${disableResize})`, async t => {
        class Element {
            parentNode = null;
            style = {};
            classList = { add() {} };
            children = [];
            clientWidth = 300;
            clientHeight = 200;
            offsetLeft = 0;
            offsetTop = 0;
            appendChild(child) { this.children.push(child); child.parentNode = this; }
            removeChild(child) {
                this.children.splice(this.children.indexOf(child), 1);
                child.parentNode = null;
            }
            addEventListener() {}
            getBoundingClientRect() { return { left: 0, top: 0 }; }
        }
        const previousDocument = globalThis.document;
        globalThis.document = {
            createElement: () => new Element(),
            body: { clientWidth: 1200, clientHeight: 800 },
            dispatchEvent() {}
        };
        t.after(() => { globalThis.document = previousDocument; });
        const manager = {
            config: { dialogRootElement: new Element() },
            context: { model: { dialogs: [] } }, defaultDialogPosition: { x: 0, y: 0 },
            zIndexDialogCounter: 1, notifyOnCreateDialog() {}, notifyOnChangeDialogPosition() {}
        };
        const createPanel = () => {
            const elementPanel = new Element();
            return {
                containerType: 'panel', dockManager: manager,
                elementPanel, containerElement: elementPanel,
                elementTitle: new Element(), elementContentContainer: new Element(),
                prepareForDocking() {}, setDialogPosition() {},
                resize: async () => {},
                saveState(state) { Object.assign(state, { element: 'visualizer', width: 300, height: 200 }); }
            };
        };
        const original = new Dialog(createPanel(), manager, undefined, disableResize);
        original.setPosition(100, 150);
        const serializer = new DockGraphSerializer();
        const saved = JSON.parse(JSON.stringify(serializer._buildDialogsInfo([original])));
        assert.equal(saved[0].disableResize, disableResize);
        if (disableResize === undefined)
            assert.equal(Object.hasOwn(saved[0], 'disableResize'), false, 'legacy layouts omit the flag');
        t.mock.method(PanelContainer, 'loadFromState', async () => createPanel());
        const [restored] = await new DockGraphDeserializer(manager)._buildDialogs(saved);
        assert.equal(restored.disableResize, disableResize);
        assert.equal(restored.resizable.resizeHandles.length, disableResize ? 0 : 7);
        assert.equal(restored.resizable.resizeHandles.length, original.resizable.resizeHandles.length);
        assert.deepEqual({ ...restored.getPosition() }, { x: 100, y: 150 });
        const savedAgain = JSON.parse(JSON.stringify(serializer._buildDialogsInfo([restored])));
        assert.deepEqual(savedAgain, saved);
    });
}

test('missing docked content is skipped when its DOM element no longer exists', async (t) => {
    const previousDocument = globalThis.document;
    globalThis.document = { getElementById: () => null };
    t.after(() => { globalThis.document = previousDocument; });
    const deserializer = new DockGraphDeserializer({});
    for (const element of ['', 'removed_panel']) {
        assert.equal(await deserializer._buildGraph({
            containerType: 'panel', state: { element }, children: []
        }), null);
    }
});

test('missing floating content is skipped for old empty IDs and removed elements', async (t) => {
    const previousDocument = globalThis.document;
    globalThis.document = { getElementById: () => null };
    t.after(() => { globalThis.document = previousDocument; });
    const deserializer = new DockGraphDeserializer({});
    assert.deepEqual(await deserializer._buildDialogs(['', 'removed_panel'].map(element => ({
        containerType: 'panel', state: { element }, position: { x: 200, y: 200 }
    }))), []);
});

test('asynchronous element callback can skip unavailable content', async () => {
    const deserializer = new DockGraphDeserializer({
        getElementCallback: async () => ({ element: null })
    });
    assert.equal(await deserializer._createContainer({
        containerType: 'panel', state: { element: 'missing' }
    }, []), null);
    assert.deepEqual(await deserializer._buildDialogs([{
        containerType: 'panel', state: { element: 'missing' }, position: { x: 0, y: 0 }
    }]), []);
});

test('restoration continues to an available panel after a missing sibling', async (t) => {
    const panel = {
        elementPanel: { parentNode: null },
        prepareForDocking: t.mock.fn(),
        loadState: t.mock.fn()
    };
    t.mock.method(PanelContainer, 'loadFromState', async state => state.element === 'available' ? panel : null);
    const deserializer = new DockGraphDeserializer({});
    const createContainer = deserializer._createContainer.bind(deserializer);
    t.mock.method(deserializer, '_createContainer', async (info, children) =>
        info.containerType === 'fill' ? {} : createContainer(info, children));
    const root = await deserializer._buildGraph({
        containerType: 'fill', state: {},
        children: ['missing', 'available'].map(element => ({
            containerType: 'panel', state: { element }, children: []
        }))
    });
    assert.equal(root.children.length, 1);
    assert.equal(root.children[0].container, panel);
    assert.equal(root.children[0].parent, root);
    assert.equal(panel.prepareForDocking.mock.callCount(), 1);
    assert.equal(panel.loadState.mock.callCount(), 1);
});
