import { DockManager } from "../DockManager.js";
import { PanelContainer } from "../PanelContainer.js";
import { Dialog } from "../Dialog.js";

let dockManager : DockManager,
    storeKey = 'lastState';

function refresh() {
    localStorage.setItem(storeKey, '');
    location.reload();
}
//@ts-ignore
window.refresh = refresh;

window.onload = () => {
    // Convert a div to the dock manager. Panels can then be docked on to it
    var divDockManager = document.getElementById('my_dock_manager');
    dockManager = new DockManager(divDockManager);
    //@ts-ignore
    window.dockManager = dockManager;
    dockManager.initialize();

    var lastState = localStorage.getItem(storeKey);
    if (lastState) {
        dockManager.loadState(lastState);
    }

    // Let the dock manager element fill in the entire screen
    window.onresize = function () {
        dockManager.resize(
            window.innerWidth - (divDockManager.clientLeft + divDockManager.offsetLeft),
            window.innerHeight - (divDockManager.clientTop + divDockManager.offsetTop)
        );
    };
    window.onresize(null);

    dockManager.addLayoutListener({
        onDock: function (self, dockNode) {
            console.log('onDock: ', self, dockNode);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onUndock: function (self, dockNode) {
            console.log('onUndock: ', self, dockNode);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onCreateDialog: function (self, dialog) {
            console.log('onCreateDialog: ', self, dialog);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onChangeDialogPosition: function (self, dialog, x, y) {
            console.log('onCreateDialog: ', self, dialog, x, y);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onResumeLayout: function (self) {
            console.log('onResumeLayout: ', self);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onClosePanel: function (self, panel) {
            console.log('onClosePanel: ', self, panel);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onHideDialog: function (self, dialog) {
            console.log('onHideDialog: ', self, dialog);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onShowDialog: function (self, dialog) {
            console.log('onShowDialog: ', self, dialog);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onTabsReorder: function (self, dialog) {
            console.log('onTabsReorder: ', self, dialog);
            localStorage.setItem(storeKey, dockManager.saveState());
        }
    });


    if (!lastState) {
        // Convert existing elements on the page into "Panels".
        // They can then be docked on to the dock manager
        // Panels get a titlebar and a close button, and can also be
        // converted to a floating dialog box which can be dragged / resized
        let solution = new PanelContainer(document.getElementById("solution_window"), dockManager);
        let properties = new PanelContainer(document.getElementById("properties_window"), dockManager);
        let toolbox = new PanelContainer(document.getElementById("toolbox_window"), dockManager);
        let outline = new PanelContainer(document.getElementById("outline_window"), dockManager);
        let problems = new PanelContainer(document.getElementById("problems_window"), dockManager);
        let output = new PanelContainer(document.getElementById("output_window"), dockManager);
        let editor1 = new PanelContainer(document.getElementById("editor1_window"), dockManager);
        let editor2 = new PanelContainer(document.getElementById("editor2_window"), dockManager);
        let infovis = new PanelContainer(document.getElementById("infovis"), dockManager);
        //let infovisdlg = new Dialog(infovis, dockManager);

        // Dock the panels on the dock manager
        let documentNode = dockManager.context.model.documentManagerNode;
        let outlineNode = dockManager.dockLeft(documentNode, outline, 0.15);
        dockManager.dockFill(outlineNode, solution);
        dockManager.dockDown(outlineNode, properties, 0.6);
        let outputNode = dockManager.dockDown(documentNode, output, 0.2);
        dockManager.dockRight(outputNode, problems, 0.40);
        dockManager.dockRight(documentNode, toolbox, 0.20);
        dockManager.dockFill(documentNode, editor1);
        dockManager.dockFill(documentNode, editor2);
        //dockManager.dockFill(documentNode, infovis);
        dockManager.floatDialog(infovis, 50, 50);
    }

    document.getElementById('dock_div').style.opacity = '';
};