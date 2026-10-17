import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DockLayoutEngine } from '../lib/js/DockLayoutEngine.js';
import { DockNode } from '../lib/js/DockNode.js';
import { SplitterPanel } from '../lib/js/SplitterPanel.js';

function child(type, size, vertical) {
    const container = { containerType: type, width: vertical ? 900 : size, height: vertical ? size : 700,
        resize(width, height) { this.width = width; this.height = height; } };
    container.containerElement = { parentNode: null, style: {}, classList: { remove() {} },
        get clientWidth() { return container.width; }, get clientHeight() { return container.height; } };
    return container;
}

function layout(vertical, types = ['panel', 'fill', 'panel']) {
    const children = types.map((type, index) => child(type, [200, 550, 240][index], vertical));
    const panel = Object.create(SplitterPanel.prototype);
    Object.assign(panel, { childContainers: children, stackedVertical: vertical,
        preferredChildSizes: new WeakMap(children.map(container => [container, vertical ? container.height : container.width])),
        preserveNonElasticSizes: true, panelElement: { style: {} },
        _buildSplitterDOMAndAddElements() {
            this.spiltterBars = this.childContainers.slice(1).map(() => ({ barElement: {
                parentNode: null, style: {}, clientWidth: 5, clientHeight: 5 } }));
        } });
    panel._buildSplitterDOMAndAddElements();
    const root = new DockNode({ minimumAllowedChildNodes: 2,
        performLayout(containers, force) { panel.performLayout(containers, force); }, setActiveChild() {} });
    children.forEach(container => root.addChild(new DockNode(container)));
    const manager = { invalidate() { panel.resize(vertical ? 900 : 1000, vertical ? 1000 : 700); }, notifyOnUnDock() {} };
    return { panel, children, root, engine: new DockLayoutEngine(manager) };
}

for (const vertical of [false, true]) for (const action of ['close', 'undock']) {
    test(`${action} preserves the other tool panel ${vertical ? 'height' : 'width'} and gives freed space to the document area`, () => {
        const { children, root, engine } = layout(vertical);
        engine[action](root.children[0]);
        assert.equal(vertical ? children[2].height : children[2].width, 240);
        assert.equal(vertical ? children[1].height : children[1].width, 755);
    });
}

test('closing a panel honors tool sizes changed by the user since the last ratio assignment', () => {
    const { children, root, engine } = layout(false);
    children[2].resize(300, 700);
    children[1].resize(490, 700);
    engine.close(root.children[0]);
    assert.equal(children[2].width, 300);
    assert.equal(children[1].width, 695);
});

test('a splitter with only tool panels retains proportional resizing on removal', () => {
    const { children, root, engine } = layout(false, ['panel', 'panel', 'panel']);
    engine.close(root.children[0]);
    assert.equal(children[1].width + children[2].width, 995);
    assert.ok(Math.abs(children[1].width / children[2].width - 550 / 240) < 0.02);
});

test('adding a new panel still resets the previous size policy for docking ratios', () => {
    const { panel, children } = layout(false);
    panel.performLayout([...children, child('panel', 100, false)], false);
    assert.equal(panel.preserveNonElasticSizes, false);
});
