import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DockGraphDeserializer } from '../lib/js/DockGraphDeserializer.js';
import { PanelContainer } from '../lib/js/PanelContainer.js';

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
