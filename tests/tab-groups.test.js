import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TabHost } from '../lib/js/TabHost.js';
import { DockManager } from '../lib/js/DockManager.js';
import { UndockInitiator } from '../lib/js/UndockInitiator.js';
import { DockGraphSerializer } from '../lib/js/DockGraphSerializer.js';
import { DockConfig } from '../lib/js/DockConfig.js';

function fixture() {
    const host = Object.assign(Object.create(TabHost.prototype), { pages: [], dockManager: { config: { enableTabGroups: true } } });
    host.pages = ['a', 'b', 'c'].map(id => ({
        panel: { id, _canUndock: true, tabPage: { host } },
        handle: { elementBase: { classList: { toggle() {}, remove() {} } } }
    }));
    host.activeTab = host.pages[0];
    return host;
}

test('tab multiselection retains visual order and can toggle and replace the selection', () => {
    const host = fixture();
    const [a, b, c] = host.pages;
    host.selectForDrag(c, true);
    assert.deepEqual(host.getDragPanels(c), [a.panel, c.panel]);
    host.selectForDrag(b, true);
    assert.deepEqual(host.getDragPanels(b), [a.panel, b.panel, c.panel]);
    host.selectForDrag(c, true);
    assert.deepEqual(host.getDragPanels(b), [a.panel, b.panel]);
    host.selectForDrag(c, false);
    assert.deepEqual(host.getDragPanels(c), [c.panel]);
});

test('pressing a selected tab keeps the group intact for dragging', () => {
    const host = fixture();
    const [a, b] = host.pages;
    host.selectForDrag(b, true);
    host.selectForDrag(a, false);
    assert.deepEqual(host.getDragPanels(a), [a.panel, b.panel]);
});

test('invalid or locked groups are rejected before mutating the layout', () => {
    const manager = Object.assign(Object.create(DockManager.prototype), {
        _undockEnabled: true,
        _config: { enableTabGroups: true },
        layoutEngine: { undock() { assert.fail('Must validate the whole group first'); } }
    });
    const host = fixture();
    const [a, b] = host.pages.map(page => page.panel);
    assert.equal(manager.requestUndockGroup([]), null);
    assert.equal(manager.requestUndockGroup([a, a]), null);
    b._canUndock = false;
    assert.equal(manager.requestUndockGroup([a, b]), null);
    b._canUndock = true;
    b.tabPage = { host: fixture() };
    assert.equal(manager.requestUndockGroup([a, b]), null);
    manager._undockEnabled = false;
    assert.equal(manager.requestUndockGroup([a]), null);
});

test('undock gesture filter rejects ineligible targets before preventing default or binding events', () => {
    const initiator = new UndockInitiator({}, () => assert.fail('Unexpected undock'));
    initiator.canStart = () => false;
    initiator.onMouseDown({ preventDefault() { assert.fail('Rejected gestures leave default behavior intact'); } });
    assert.equal(initiator.mouseMoveHandler, undefined);
});

test('grouping is opt-in and disabling it ignores previous tab multiselection', () => {
    const previousDocument = globalThis.document;
    globalThis.document = { body: {} };
    try { assert.equal(new DockConfig().enableTabGroups, false); }
    finally { globalThis.document = previousDocument; }
    const host = fixture();
    const [a, b] = host.pages;
    host.selectForDrag(b, true);
    host.dockManager.config.enableTabGroups = false;
    assert.deepEqual(host.getDragPanels(a), [a.panel]);
    host.selectForDrag(b, true);
    host.dockManager.config.enableTabGroups = true;
    assert.deepEqual(host.getDragPanels(a), [a.panel]);
});

test('non-persistent floating groups save every member with usable dimensions as separate windows', () => {
    const panels = ['a', 'b', 'c'].map(element => ({ containerType: 'panel', saveState: state => Object.assign(state, {element, width:0, height:0}) }));
    const dialog = {
        panels, tabHost: {}, dockManager: { config: {persistTabGroups:false} },
        getPosition: () => ({x:50,y:60}), elementDialog: {clientWidth:350,clientHeight:240}, isHidden:true, disableResize:true
    };
    const saved = new DockGraphSerializer()._buildDialogsInfo([dialog]);
    assert.deepEqual(saved.map(info => info.state.element), ['a','b','c']);
    assert.deepEqual(saved.map(info => info.position), [{x:50,y:60},{x:74,y:84},{x:98,y:108}]);
    assert.ok(saved.every(info => !info.panels && info.state.width===350 && info.state.height===240 && info.isHidden && info.disableResize));
});

test('floating target hit testing respects topmost window, flags and panel locks', () => {
    const manager = Object.assign(Object.create(DockManager.prototype), {_config:{enableTabGroups:true},_undockEnabled:true});
    const window = z => ({panels:[{_canUndock:true}],elementDialog:{style:{zIndex:String(z)},getBoundingClientRect:()=>({left:0,top:0,right:200,bottom:100})}});
    const source=window(4), first=window(1), second=window(2);
    manager.context={model:{dialogs:[first,source,second]}};
    assert.equal(manager.findFloatingGroupTarget(source,50,50),second);
    second.isHidden=true;
    assert.equal(manager.findFloatingGroupTarget(source,50,50),first);
    first.panels[0]._canUndock=false;
    assert.equal(manager.findFloatingGroupTarget(source,50,50),undefined);
    first.panels[0]._canUndock=true;
    manager.config.enableTabGroups=false;
    assert.equal(manager.findFloatingGroupTarget(source,50,50),undefined);
});
