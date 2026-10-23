import { DockManager } from '../../lib/js/DockManager.js';
import { PanelContainer } from '../../lib/js/PanelContainer.js';
import { PanelType } from '../../lib/js/enums/PanelType.js';

const area = document.getElementById('orbit-area');
const status = document.getElementById('status');
const applyButton = document.getElementById('apply');
const floatButton = document.getElementById('float');
const resetButton = document.getElementById('reset');
const inputs = [...document.querySelectorAll('.controls input, .controls button')];
const panelIds = ['navigator', 'activity', 'inspector'];
const manager = new DockManager(document.getElementById('orbit-dock'), {
    dockingSizeStrategy: 'equal-distribution',
    enableBrowserWindows: false,
    escClosesDialog: false
});
const selected = name => document.querySelector(`input[name="${name}"]:checked`).value;
// A restored layout owns new PanelContainers, so always resolve the current one.
const panel = id => document.getElementById(id)._dockSpawnPanelContainer;
const setBusy = busy => inputs.forEach(input => { input.disabled = busy; });
let measurementQueued = false;
function updateMeasurements() {
    if (measurementQueued) return;
    measurementQueued = true;
    requestAnimationFrame(() => {
        measurementQueued = false;
        for (const id of panelIds) {
            const current = panel(id);
            if (!current) continue;
            const node = current.isDialog ? null : manager.getNodeByElement(current.elementContent);
            // Include the document tab strip so equal pane allocations read equally.
            const pane = node?.parent?.container.containerType === 'fill' ? node.parent.container : current;
            const state = current.isDialog ? ' · floating' : current.tabPage && !current.tabPage.selected ? ' · hidden tab' : '';
            document.getElementById(`size-${id}`).textContent = `${Math.round(pane.width)} × ${Math.round(pane.height)} px${state}`;
        }
    });
}
const resize = async () => {
    await manager.resize(area.clientWidth, area.clientHeight);
    updateMeasurements();
};
setBusy(true);
manager.initialize();
await resize();
const navigator = new PanelContainer(document.getElementById('navigator'), manager, 'Navigator', PanelType.panel, true);
const activity = new PanelContainer(document.getElementById('activity'), manager, 'Activity', PanelType.document, true);
const inspector = new PanelContainer(document.getElementById('inspector'), manager, 'Inspector', PanelType.panel, true);
const documentNode = manager.context.model.documentManagerNode;
manager.dockFill(documentNode, activity);
manager.dockLeft(documentNode, navigator, .42);
manager.dockDown(documentNode, inspector, .48);
await resize();
const initialState = manager.saveState();
for (const id of panelIds) document.getElementById(id).resizeHandler = updateMeasurements;
manager.addLayoutListener({ onDock: updateMeasurements, onUndock: updateMeasurements, onTabChange: updateMeasurements });
status.textContent = 'Ready to explore. Choose a move, or drag a title bar.';
setBusy(false);

async function restore() {
    await manager.loadState(initialState);
    manager.config.dockingSizeStrategy = selected('strategy');
    await resize();
}
async function runAction(action) {
    setBusy(true);
    try {
        await action();
        updateMeasurements();
    } catch (error) {
        status.textContent = 'That move could not finish. Reset the layout and try again.';
        console.error(error);
    } finally {
        setBusy(false);
    }
}
for (const radio of document.querySelectorAll('input[name="strategy"]')) {
    radio.addEventListener('change', () => {
        manager.config.dockingSizeStrategy = selected('strategy');
        document.getElementById('config-code').textContent = `dockingSizeStrategy: '${selected('strategy')}'`;
        status.textContent = 'Strategy selected. Apply a move to compare it from the starting layout.';
    });
}
applyButton.addEventListener('click', () => runAction(async () => {
    await restore();
    const activityHeight = panel('activity').height;
    const dialog = manager.floatDialog(panel('navigator'), 80, 120);
    const move = selected('move');
    if (move === 'panel-bottom') {
        manager.dockDialogDown(manager.getNodeByElement(panel('inspector').elementContent), dialog);
    } else if (move === 'outer-right') {
        manager.dockDialogRight(manager.context.model.rootNode, dialog, true);
    } else {
        manager.dockDialogDown(manager.context.model.rootNode, dialog, true);
    }
    // Observe the actual docking result without a corrective resize call.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (move === 'panel-bottom') {
        status.textContent = `Below Inspector · Activity height: ${Math.round(activityHeight)} → ${Math.round(panel('activity').height)} px`;
    } else {
        const axis = move === 'outer-right' ? 'width' : 'height';
        const sizes = manager.context.model.rootNode.children.map(child => Math.round(child.container[axis]));
        status.textContent = `${move === 'outer-right' ? 'Outer right' : 'Outer bottom'} · Direct pane ${axis === 'width' ? 'widths' : 'heights'}: ${sizes.join(' / ')} px`;
    }
}));
floatButton.addEventListener('click', () => runAction(async () => {
    const rect = area.getBoundingClientRect();
    manager.floatDialog(panel('navigator'), rect.left + 24, rect.top + 35);
    await new Promise(resolve => requestAnimationFrame(resolve));
    status.textContent = 'Navigator is floating. Drag it to a docking guide, or reset the layout.';
}));
resetButton.addEventListener('click', () => runAction(async () => {
    await restore();
    status.textContent = 'Layout reset. Your strategy and move selections are kept.';
}));
new ResizeObserver(() => { void resize(); }).observe(area);
