import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DockManager } from '../lib/js/DockManager.js';
import { DockNode } from '../lib/js/DockNode.js';

for (const vertical of [false, true]) for (const before of [false, true]) for (const referenceIndex of [0, 1, 2]) {
    test(`docking ${before ? 'before' : 'after'} pane ${referenceIndex} in a ${vertical ? 'vertical' : 'horizontal'} splitter only divides that pane`, () => {
        const originalSizes = [200, 550, 240];
        const original = originalSizes.map(size => ({ containerType: 'fill', width: vertical ? 900 : size, height: vertical ? size : 700 }));
        let finalSizes;
        const bar = { barElement: { clientWidth: 5, clientHeight: 5 } };
        const splitter = { containerType: vertical ? 'vertical' : 'horizontal', stackedVertical: vertical,
            width: vertical ? 900 : 1000, height: vertical ? 1000 : 700,
            splitterPanel: { childContainers: original, spiltterBars: [bar, bar] },
            setSizes(value) { finalSizes = value; } };
        const root = new DockNode(splitter);
        original.forEach(container => root.addChild(new DockNode(container)));
        const reference = root.children[referenceIndex], added = { containerType: 'fill' };
        const manager = Object.create(DockManager.prototype);
        Object.assign(manager, { context: { model: { rootNode: root } }, rebuildLayout() {}, invalidate() {}, _checkShowBackgroundContext() {} });
        manager._requestDockContainer(reference, added, (node, newNode) => {
            if (before) root.addChildBefore(node, newNode); else root.addChildAfter(node, newNode);
            splitter.splitterPanel.childContainers = root.children.map(child => child.container);
            splitter.splitterPanel.spiltterBars = [bar, bar, bar];
        }, 0.5);
        const available = 985, newSize = Math.floor((originalSizes[referenceIndex] - 5) / 2);
        const sizes = root.children.map((node, index) => [node.container, finalSizes[index]]);
        assert.equal(new Map(sizes).get(added), newSize);
        original.forEach((container, index) => assert.equal(new Map(sizes).get(container),
            index === referenceIndex ? originalSizes[index] - 5 - newSize : originalSizes[index]));
        assert.equal(sizes.reduce((sum, [, size]) => sum + size, 0), available);
    });
}
