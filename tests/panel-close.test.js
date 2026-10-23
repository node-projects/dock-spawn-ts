import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PanelContainer } from '../lib/js/PanelContainer.js';

test('close waits for asynchronous close callbacks and panel removal', async () => {
    const panel = Object.create(PanelContainer.prototype);
    const root = { removeChild() {} };
    let allowClose;
    const permission = new Promise(resolve => { allowClose = resolve; });
    const events = [];
    Object.assign(panel, {
        elementContentContainer: { parentElement: root },
        dockManager: { config: { dialogRootElement: root }, notifyOnClosePanel() { events.push('closed'); } },
        closePanelContainerCallback: () => permission,
        performClose() { events.push('removed'); }
    });
    const closing = panel.close().then(() => events.push('resolved'));
    await Promise.resolve();
    assert.deepEqual(events, []);
    allowClose(true);
    await closing;
    assert.deepEqual(events, ['closed', 'removed', 'resolved']);
});

test('close propagates callback failures to its caller', async () => {
    const panel = Object.create(PanelContainer.prototype);
    const root = {};
    const error = new Error('Close failed');
    Object.assign(panel, {
        elementContentContainer: { parentElement: root },
        dockManager: { config: { dialogRootElement: root } },
        closePanelContainerCallback: async () => { throw error; }
    });
    await assert.rejects(panel.close(), error);
});
