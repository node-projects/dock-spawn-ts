import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DockConfig } from '../lib/js/DockConfig.js';
import { DockManager } from '../lib/js/DockManager.js';
import { PanelContainer } from '../lib/js/PanelContainer.js';

test('fullscreen is disabled for existing integrations by default', t => {
    const previous = globalThis.document;
    globalThis.document = { body: {} };
    t.after(() => { globalThis.document = previous; });
    assert.equal(new DockConfig().enableFullscreen, false);
});

test('Escape restores fullscreen before closing even when panel closing is disabled', () => {
    let restored = false;
    const manager = Object.assign(Object.create(DockManager.prototype), {
        _activePanel: { _hideCloseButton: true, close() { assert.fail('Escape must restore first'); } },
        fullscreenPanel: { setFullscreen(enabled) { assert.equal(enabled, false); restored = true; } }
    });
    let prevented = false, stopped = false;
    manager.onKeyPress({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
    assert.ok(restored && prevented && stopped);
});

test('global disabling restores fullscreen and refreshes existing panel controls', () => {
    const calls = [];
    const manager = Object.assign(Object.create(DockManager.prototype), {
        _config: { enableFullscreen: true },
        fullscreenPanel: { setFullscreen(enabled) { calls.push(['restore', enabled]); } },
        getPanels: () => [1, 2].map(id => ({ updateFullscreenButton() { calls.push(['refresh', id]); } }))
    });
    manager.setFullscreenEnabled(false);
    assert.equal(manager.config.enableFullscreen, false);
    assert.deepEqual(calls, [['restore', false], ['refresh', 1], ['refresh', 2]]);
});

test('a pending layout frame cannot overwrite maximized content bounds or report stale sizes', async t => {
    const previous = globalThis.requestAnimationFrame;
    let frame;
    globalThis.requestAnimationFrame = callback => { frame = callback; };
    t.after(() => { globalThis.requestAnimationFrame = previous; });
    const element = () => ({ style: {} });
    const panel = Object.assign(Object.create(PanelContainer.prototype), {
        panelDocked() {}, setVisible() {},
        elementPanel: element(), elementTitle: { style: {}, clientHeight: 25 },
        elementContentHost: element(), elementContentContainer: element(),
        elementContentWrapper: { getBoundingClientRect() { assert.fail('Must not measure the old wrapper'); } },
        elementContent: { resizeHandler() { assert.fail('Must not report the previous layout size'); } }
    });
    const pending = panel.resize(300, 200);
    panel.fullscreen = { overlay: {} };
    panel.elementContentContainer.style.width = '100%';
    frame();
    await pending;
    assert.equal(panel.elementContentContainer.style.width, '100%');
});
