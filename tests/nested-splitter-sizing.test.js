import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HorizontalDockContainer } from '../lib/js/HorizontalDockContainer.js';
import { VerticalDockContainer } from '../lib/js/VerticalDockContainer.js';

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
    return { axis, leaf, split, resize, drag };
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
