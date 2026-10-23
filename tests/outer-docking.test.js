import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DockWheel } from '../lib/js/DockWheel.js';

for (const [side, method, direction, before] of [
    ['left', 'dockDialogLeft', 'horizontal', true],
    ['right', 'dockDialogRight', 'horizontal', false],
    ['top', 'dockDialogUp', 'vertical', true],
    ['down', 'dockDialogDown', 'vertical', false]
]) for (const outer of [false, true]) {
    test(`${outer ? 'outer' : 'panel'} ${side} guide routes the same scope to preview and docking even when the target is root`, () => {
        const root = {}, dialog = { panel: {} };
        let preview, dock;
        const manager = {
            context: { model: { rootNode: root } },
            layoutEngine: { getDockBounds(...args) { preview = args; } },
            [method](...args) { dock = args; }
        };
        const wheel = Object.assign(Object.create(DockWheel.prototype), {
            dockManager: manager, activeNode: root, activeDialog: dialog
        });
        const item = { id: side + (outer ? '-s' : ''), element: { classList: { remove() {} } } };
        wheel.onMouseOver(item);
        wheel._handleDockRequest(item, dialog);
        assert.deepEqual(preview.slice(0, 4), [root, dialog.panel, direction, before]);
        assert.equal(preview[4] ?? false, outer);
        assert.deepEqual(dock.slice(0, 2), [root, dialog]);
        assert.equal(dock[2] ?? false, outer);
    });
}
