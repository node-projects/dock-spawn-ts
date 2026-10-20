import { DockManager } from '../../lib/js/DockManager.js';
import { PanelContainer } from '../../lib/js/PanelContainer.js';
import { PanelType } from '../../lib/js/enums/PanelType.js';

const area = document.getElementById('dock-area');
const status = document.getElementById('layout-status');
const stackButton = document.getElementById('stack');
const resetButton = document.getElementById('reset');
const manager = new DockManager(document.getElementById('dock-manager'), {
    dockingSizeStrategy: 'split-reference',
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
status.textContent = 'Ready to rearrange · List keeps its height';

// Resolve live containers again after restoring a serialized layout.
const panel = id => document.getElementById(id)._dockSpawnPanelContainer;
stackButton.addEventListener('click', async () => {
    stackButton.disabled = true;
    resetButton.disabled = true;
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
        stackButton.disabled = false;
    } finally {
        resetButton.disabled = false;
    }
});

resetButton.addEventListener('click', async () => {
    resetButton.disabled = true;
    stackButton.disabled = true;
    try {
        await manager.loadState(initialState);
        await resize();
        status.textContent = 'Layout reset · Try dragging Pivot below Detail';
    } catch (error) {
        status.textContent = 'Unable to reset the layout. Reload the demo to start again.';
        console.error(error);
    } finally {
        resetButton.disabled = false;
        stackButton.disabled = false;
    }
});
new ResizeObserver(resize).observe(area);
