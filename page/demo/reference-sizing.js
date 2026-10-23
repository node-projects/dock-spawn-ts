import { DockManager } from '../../lib/js/DockManager.js';
import { PanelContainer } from '../../lib/js/PanelContainer.js';
import { PanelType } from '../../lib/js/enums/PanelType.js';

const area = document.getElementById('dock-area');
const status = document.getElementById('layout-status');
const stackButton = document.getElementById('stack');
const resetButton = document.getElementById('reset');
const outerButton = document.getElementById('outer');
const strategy = document.getElementById('strategy');
const controls = [stackButton, resetButton, outerButton, strategy];
const manager = new DockManager(document.getElementById('dock-manager'), {
    dockingSizeStrategy: 'equal-distribution',
    enableBrowserWindows: false,
    escClosesDialog: false
});
manager.initialize();
const resize = () => manager.resize(area.clientWidth, area.clientHeight);
await resize();

const pivot = new PanelContainer(document.getElementById('pivot'), manager, 'Pivot', PanelType.panel, true);
const list = new PanelContainer(document.getElementById('list'), manager, 'List', PanelType.document, true);
const detail = new PanelContainer(document.getElementById('detail'), manager, 'Detail', PanelType.panel, true);
const documentNode = manager.context.model.documentManagerNode;
manager.dockFill(documentNode, list);
manager.dockLeft(documentNode, pivot, 0.46);
manager.dockDown(documentNode, detail, 0.5);
await resize();
const initialState = manager.saveState();
status.textContent = 'Ready · Outer edge: equal heights · Detail indicator: split its space';

strategy.addEventListener('change', () => {
    manager.config.dockingSizeStrategy = strategy.value;
    document.getElementById('strategy-label').textContent = strategy.selectedOptions[0].textContent;
    document.getElementById('config-code').textContent = `dockingSizeStrategy: '${strategy.value}'`;
    status.textContent = 'Strategy changed · Reset layout to compare the same move';
});

const setBusy = busy => controls.forEach(control => { control.disabled = busy; });

// Resolve live containers again after restoring a serialized layout.
const panel = id => document.getElementById(id)._dockSpawnPanelContainer;
stackButton.addEventListener('click', async () => {
    setBusy(true);
    try {
        const listHeight = panel('list').height;
        const dialog = manager.floatDialog(panel('pivot'), 60, 100);
        // Use the floating-dialog docking path, exactly as a drag-and-drop does.
        manager.dockDialogDown(manager.getNodeByElement(document.getElementById('detail')), dialog);
        await resize();
        status.textContent = `Panels stacked · List: ${Math.round(listHeight)} → ${Math.round(panel('list').height)} px`;
    } catch (error) {
        status.textContent = 'Unable to stack panels. Reset the layout and try again.';
        console.error(error);
    } finally {
        setBusy(false);
    }
});

outerButton.addEventListener('click', async () => {
    setBusy(true);
    try {
        const dialog = manager.floatDialog(panel('pivot'), 60, 100);
        // The final flag selects the outer guide path, rather than a panel's guide.
        manager.dockDialogDown(manager.context.model.rootNode, dialog, true);
        await resize();
        const root = manager.context.model.rootNode;
        const sizes = root.children.map(child => Math.round(child.container.height));
        status.textContent = `Outer bottom · Direct pane heights: ${sizes.join(' / ')} px`;
    } catch (error) {
        status.textContent = 'Unable to dock at the outer edge. Reset the layout and try again.';
        console.error(error);
    } finally {
        setBusy(false);
    }
});

resetButton.addEventListener('click', async () => {
    setBusy(true);
    try {
        await manager.loadState(initialState);
        await resize();
        status.textContent = 'Layout reset · Try the outer bottom edge or Detail’s own indicator';
    } catch (error) {
        status.textContent = 'Unable to reset the layout. Reload the demo to start again.';
        console.error(error);
    } finally {
        setBusy(false);
    }
});
new ResizeObserver(resize).observe(area);
