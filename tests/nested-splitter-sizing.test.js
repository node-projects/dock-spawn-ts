import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HorizontalDockContainer } from '../lib/js/HorizontalDockContainer.js';
import { VerticalDockContainer } from '../lib/js/VerticalDockContainer.js';
import { DockLayoutEngine } from '../lib/js/DockLayoutEngine.js';
import { DockManager } from '../lib/js/DockManager.js';
import { DockNode } from '../lib/js/DockNode.js';
import { DockConfig } from '../lib/js/DockConfig.js';

// Keep DOM measurements synchronous, as in a browser, while using the real
// splitter containers, bars and preferred-size bookkeeping.
class Element {
    style = {};
    children = [];
    parentNode = null;
    classList = { add() {}, remove() {} };
    get clientWidth() { return parseFloat(this.style.width) || 5; }
    get clientHeight() { return parseFloat(this.style.height) || 5; }
    get nextSibling() { return this.parentNode?.children[this.parentNode.children.indexOf(this) + 1] ?? null; }
    get parentElement() { return this.parentNode; }
    appendChild(child) { this.insertBefore(child, null); }
    insertBefore(child, before) {
        child.parentNode?.removeChild(child);
        const index = before ? this.children.indexOf(before) : this.children.length;
        this.children.splice(index, 0, child);
        child.parentNode = this;
    }
    removeChild(child) { this.children.splice(this.children.indexOf(child), 1); child.parentNode = null; }
    addEventListener() {}
    removeEventListener() {}
}

function fixture(t, vertical) {
    const previous = globalThis.document;
    const previousWindow = globalThis.window;
    globalThis.document = { createElement: () => new Element(), dispatchEvent() {} };
    globalThis.window = new Element();
    t.after(() => { globalThis.document = previous; globalThis.window = previousWindow; });
    const manager = { config: { dialogRootElement: new Element() } };
    const axis = vertical ? 'height' : 'width';
    const resize = (container, size) => container.resize(vertical ? 900 : size, vertical ? size : 700);
    function leaf(type, size) {
        const container = { containerType: type, dockManager: manager, containerElement: new Element(),
            width: vertical ? 900 : size, height: vertical ? size : 700,
            resize(width, height) {
                this.width = width; this.height = height;
                this.containerElement.style.width = width + 'px';
                this.containerElement.style.height = height + 'px';
                return Promise.resolve();
            } };
        container.resize(container.width, container.height);
        return container;
    }
    async function split(children, sizes) {
        const Split = vertical ? VerticalDockContainer : HorizontalDockContainer;
        const container = new Split(manager, children);
        await resize(container, sizes.reduce((sum, size) => sum + size, 0) + 5 * (sizes.length - 1));
        await container.setSizes(sizes);
        return container;
    }
    const drag = (bar, delta) => bar._performDrag(vertical ? 0 : delta, vertical ? delta : 0);
    return { axis, leaf, split, resize, drag, manager };
}

for (const vertical of [false, true]) for (const before of [false, true]) for (const strategy of [undefined, 'proportional', 'split-reference', 'equal-distribution']) {
    test(`${strategy ?? 'default'} docking ${before ? 'before' : 'after'} a ${vertical ? 'vertical' : 'horizontal'} target from a floating dialog`, async t => {
        const { axis, leaf, split, resize, manager } = fixture(t, vertical);
        assert.equal(new DockConfig().dockingSizeStrategy, 'proportional');
        manager.config.dockingSizeStrategy = strategy;
        const list = leaf('fill', 300), detail = leaf('panel', 295), neighbor = leaf('panel', 195);
        const splitter = await split([list, detail, neighbor], [300, 295, 195]);
        const root = new DockNode(splitter);
        [list, detail, neighbor].forEach(container => root.addChild(new DockNode(container)));
        const target = root.children[1];
        const pivot = leaf('panel', 700);
        pivot.prepareForDocking = () => {};
        pivot.elementContentContainer = { style: {} };
        const dialog = { panel: pivot, destroy() {} };
        Object.assign(manager, {
            context: { model: { rootNode: root } },
            element: { getBoundingClientRect: () => ({ left: 10, top: 20 }) },
            invalidate() { resize(splitter, 800); },
            notifyOnDock() {}
        });
        detail.containerElement.getBoundingClientRect = () => ({ left: 10, top: 20 });
        splitter.containerElement.getBoundingClientRect = () => ({ left: 10, top: 20 });
        const engine = new DockLayoutEngine(manager);
        const direction = vertical ? 'vertical' : 'horizontal';
        const preview = engine.getDockBounds(target, pivot, direction, before);
        const dock = vertical ? (before ? engine.dockUp : engine.dockDown) : (before ? engine.dockLeft : engine.dockRight);
        DockManager.prototype._requestDockDialog.call(manager, target, dialog, dock.bind(engine));
        if (strategy === 'split-reference' || strategy === 'equal-distribution') {
            assert.deepEqual([list[axis], detail[axis], neighbor[axis], pivot[axis]], [300, 145, 195, 145]);
            assert.equal(preview[axis], pivot[axis], 'Preview matches the docked pane size');
            assert.equal(vertical ? preview.y : preview.x, before ? 0 : 150);
            await resize(splitter, 800);
            assert.deepEqual([list[axis], detail[axis], neighbor[axis], pivot[axis]], [300, 145, 195, 145],
                'A later layout pass retains the allocated sizes');
        } else {
            assert.notEqual(list[axis], 300, 'Default and explicit proportional mode retain the existing allocation');
            assert.ok(pivot[axis] > detail[axis], 'Proportional mode uses the floating pane size');
        }
        assert.equal(root.children.reduce((sum, child) => sum + child.container[axis], 0), 785);
    });
}

function dockingManager(manager, root, resize) {
    Object.assign(manager, {
        context: { model: { rootNode: root } },
        element: { getBoundingClientRect: () => ({ left: 10, top: 20 }) },
        setRootNode(node) { node.detachFromParent(); this.context.model.rootNode = node; },
        rebuildLayout() {},
        invalidate() { return resize(this.context.model.rootNode.container, 800); },
        notifyOnDock() {}
    });
    root.container.containerElement.getBoundingClientRect = () => ({ left: 30, top: 40 });
    return new DockLayoutEngine(manager);
}

for (const vertical of [false, true]) for (const before of [false, true]) for (const originalCount of [2, 3]) {
    test(`equal outer ${vertical ? 'vertical' : 'horizontal'} ${before ? 'start' : 'end'} drop balances ${originalCount + 1} direct panes and preview`, async t => {
        const { axis, leaf, split, resize, manager } = fixture(t, vertical);
        manager.config.dockingSizeStrategy = 'equal-distribution';
        const originalSizes = originalCount === 2 ? [300, 495] : [300, 295, 195];
        const originals = originalSizes.map((size, i) => leaf(i === 0 ? 'fill' : 'panel', size));
        const root = new DockNode(await split(originals, originalSizes));
        originals.forEach(container => root.addChild(new DockNode(container)));
        const engine = dockingManager(manager, root, resize);
        const added = new DockNode(leaf('panel', 1800));
        const direction = vertical ? 'vertical' : 'horizontal';
        const preview = engine.getDockBounds(root, added.container, direction, before, true);
        const method = vertical ? (before ? 'dockUp' : 'dockDown') : (before ? 'dockLeft' : 'dockRight');
        engine[method](root, added, true);
        assert.equal(manager.context.model.rootNode, root, 'Reuse the existing root instead of nesting the old group');
        assert.deepEqual(root.children.filter(child => child !== added).map(child => child.container), originals);
        assert.equal(root.children[before ? 0 : originalCount], added);
        const sizes = root.children.map(child => child.container[axis]);
        assert.equal(sizes.reduce((sum, size) => sum + size, 0), 800 - originalCount * 5);
        assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, 'Equal shares differ by at most one rounding pixel');
        assert.equal(preview[axis], added.container[axis]);
        assert.equal(vertical ? preview.y : preview.x, 20 + (before ? 0 : 800 - added.container[axis]));
        await manager.invalidate();
        assert.deepEqual(root.children.map(child => child.container[axis]), sizes, 'Later layout retains the equal allocation');
    });
}

for (const vertical of [false, true]) for (const before of [false, true]) {
    test(`equal outer ${vertical ? 'vertical' : 'horizontal'} drop creates two equal groups and preserves the nested tree`, async t => {
        const { axis, leaf, resize, manager } = fixture(t, vertical);
        manager.config.dockingSizeStrategy = 'equal-distribution';
        const one = leaf('fill', 300), two = leaf('panel', 495);
        const Opposite = vertical ? HorizontalDockContainer : VerticalDockContainer;
        const nested = new Opposite(manager, [one, two]);
        await resize(nested, 800);
        const root = new DockNode(nested);
        root.addChild(new DockNode(one)); root.addChild(new DockNode(two));
        const engine = dockingManager(manager, root, resize);
        const direction = vertical ? 'vertical' : 'horizontal';
        const added = new DockNode(leaf('panel', 1200));
        const preview = engine.getDockBounds(root, added.container, direction, before, true);
        engine[vertical ? (before ? 'dockUp' : 'dockDown') : (before ? 'dockLeft' : 'dockRight')](root, added, true);
        const outer = manager.context.model.rootNode;
        assert.equal(outer.children.length, 2);
        assert.equal(outer.children[before ? 1 : 0], root, 'The opposite-orientation group is not flattened');
        assert.deepEqual(root.children.map(child => child.container), [one, two]);
        assert.ok(Math.abs(nested[axis] - added.container[axis]) <= 1);
        assert.equal(nested[axis] + added.container[axis], 795);
        assert.equal(preview[axis], added.container[axis]);
    });
}

for (const vertical of [false, true]) {
    test(`equal-distribution retains an explicit programmatic ${vertical ? 'vertical' : 'horizontal'} ratio`, async t => {
        const { axis, leaf, split, resize, manager } = fixture(t, vertical);
        manager.config.dockingSizeStrategy = 'equal-distribution';
        const document = leaf('fill', 300), reference = leaf('panel', 495);
        const root = new DockNode(await split([document, reference], [300, 495]));
        root.addChild(new DockNode(document)); root.addChild(new DockNode(reference));
        const engine = dockingManager(manager, root, resize);
        manager._checkShowBackgroundContext = () => {};
        const added = leaf('fill', 1500);
        DockManager.prototype._requestDockContainer.call(manager, root.children[1], added,
            engine[vertical ? 'dockDown' : 'dockRight'].bind(engine), .25);
        assert.deepEqual([document[axis], reference[axis], added[axis]], [300, 368, 122]);
    });
    for (const strategy of [undefined, 'proportional', 'split-reference']) {
        test(`${strategy ?? 'default'} outer docking retains its existing root grouping (${vertical ? 'vertical' : 'horizontal'})`, async t => {
            const { leaf, split, resize, manager } = fixture(t, vertical);
            manager.config.dockingSizeStrategy = strategy;
            const original = [leaf('fill', 300), leaf('panel', 495)];
            const root = new DockNode(await split(original, [300, 495]));
            original.forEach(container => root.addChild(new DockNode(container)));
            const engine = dockingManager(manager, root, resize);
            const added = new DockNode(leaf('panel', 400));
            engine[vertical ? 'dockDown' : 'dockRight'](root, added, true);
            assert.deepEqual(manager.context.model.rootNode.children, [root, added]);
        });
    }
}

for (const vertical of [false, true]) for (const groupFirst of [false, true]) {
    test(`${vertical ? 'vertical' : 'horizontal'} nested group ${groupFirst ? 'before' : 'after'} its neighbor scales current proportions on repeated drags`, async t => {
        const { axis, leaf, split, resize, drag } = fixture(t, vertical);
        const list = leaf('fill', 400), detail = leaf('panel', 195), pivot = leaf('panel', 195);
        const inner = await split([list, detail], [400, 195]);
        const outer = await split(groupFirst ? [inner, pivot] : [pivot, inner], groupFirst ? [600, 195] : [195, 600]);
        drag(inner.splitterPanel.spiltterBars[0], 60);
        assert.equal(detail[axis], 135);
        await resize(outer, 800);
        assert.equal(detail[axis], 135, 'A normal layout pass must retain the explicit inner drag');
        for (const delta of [-80, 50, -35, 65]) {
            const before = [list[axis], detail[axis]], available = inner[axis] - 5;
            const expectedTotal = available + (groupFirst ? delta : -delta);
            drag(outer.splitterPanel.spiltterBars[0], delta);
            assert.equal(list[axis], Math.floor(before[0] * expectedTotal / available));
            assert.equal(list[axis] + detail[axis], expectedTotal);
            const sizes = [list[axis], detail[axis], pivot[axis]];
            await resize(outer, 800);
            assert.deepEqual([list[axis], detail[axis], pivot[axis]], sizes, 'Layout must not restore old preferred sizes');
        }
        const detailSize = detail[axis], pivotSize = pivot[axis];
        await resize(outer, 950);
        assert.equal(detail[axis], detailSize, 'Host resizing still preserves tool sizes');
        assert.equal(pivot[axis], pivotSize, 'The outer tool retains its size too');
    });
}

for (const vertical of [false, true]) {
    test(`${vertical ? 'vertical' : 'horizontal'} pointer gesture avoids rounding drift and the next gesture uses new proportions`, async t => {
        const { axis, leaf, split, resize, drag } = fixture(t, vertical);
        const list = leaf('fill', 400), detail = leaf('panel', 195);
        const inner = await split([list, detail], [400, 195]);
        const outer = await split([inner, leaf('panel', 195)], [600, 195]);
        const bar = outer.splitterPanel.spiltterBars[0];
        drag(inner.splitterPanel.spiltterBars[0], 40);
        bar._startDragging({ clientX: 0, clientY: 0 });
        for (let i = 0; i < 100; i++) {
            drag(bar, -1);
            const expectedTotal = inner[axis] - 5;
            assert.equal(list[axis], Math.floor(440 * expectedTotal / 595));
            await resize(outer, 800);
        }
        for (let i = 0; i < 100; i++) drag(bar, 1);
        bar._stopDragging();
        assert.deepEqual([list[axis], detail[axis]], [440, 155], 'Returning the pointer restores the starting sizes');
        drag(inner.splitterPanel.spiltterBars[0], 30);
        bar._startDragging({ clientX: 0, clientY: 0 });
        for (let i = 0; i < 40; i++) drag(bar, -1);
        bar._stopDragging();
        assert.equal(list[axis], Math.floor(470 * 555 / 595), 'A new drag uses the newly adjusted ratio');
    });

    test(`${vertical ? 'vertical' : 'horizontal'} drag propagates proportions through multiple nested splitters`, async t => {
        const { axis, leaf, split, resize, drag } = fixture(t, vertical);
        const list = leaf('fill', 300), detail = leaf('panel', 195);
        const inner = await split([list, detail], [300, 195]);
        const middle = await split([inner, leaf('panel', 95)], [500, 95]);
        const outer = await split([middle, leaf('panel', 195)], [600, 195]);
        drag(inner.splitterPanel.spiltterBars[0], 40);
        drag(outer.splitterPanel.spiltterBars[0], -100);
        const innerAvailable = Math.floor(500 * 495 / 595) - 5;
        assert.equal(list[axis], Math.floor(340 * innerAvailable / 495));
        assert.equal(list[axis] + detail[axis], innerAvailable);
        const size = detail[axis];
        await resize(outer, 800);
        assert.equal(detail[axis], size, 'A later layout pass keeps the new preferred size');
    });

    test(`${vertical ? 'vertical' : 'horizontal'} flat splitter drag only resizes adjacent panes and remembers a smaller tool`, async t => {
        const { axis, leaf, split, resize, drag } = fixture(t, vertical);
        const list = leaf('fill', 400), detail = leaf('panel', 195), pivot = leaf('panel', 195);
        const flat = await split([list, detail, pivot], [400, 195, 195]);
        drag(flat.splitterPanel.spiltterBars[0], 40);
        assert.deepEqual([list[axis], detail[axis], pivot[axis]], [440, 155, 195]);
        await resize(flat, 800);
        assert.deepEqual([list[axis], detail[axis], pivot[axis]], [440, 155, 195]);
        drag(flat.splitterPanel.spiltterBars[1], 30);
        await resize(flat, 800);
        assert.deepEqual([list[axis], detail[axis], pivot[axis]], [440, 185, 165]);
    });
}
