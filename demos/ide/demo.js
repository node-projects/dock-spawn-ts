import { DockManager } from "../../lib/js/DockManager.js";
import { PanelContainer } from "../../lib/js/PanelContainer.js";
import { PanelType } from "../../lib/js/enums/PanelContainerType.js";

let dockManager,
    storeKey = 'lastState';

function refresh() {
    localStorage.setItem(storeKey, '');
    location.reload();
}
//@ts-ignore
window.refresh = refresh;

window.onload = () => {
    // Convert a div to the dock manager. Panels can then be docked on to it

    let divDockContainer = document.getElementById('dock_div');
    let divDockManager = document.getElementById('my_dock_manager');
    dockManager = new DockManager(divDockManager);
    //@ts-ignore
    window.dockManager = dockManager;
    dockManager.initialize();

    let lastState = localStorage.getItem(storeKey);
    if (lastState) {
        dockManager.loadState(lastState);
    }

    // Let the dock manager element fill in the entire screen
    window.onresize = () => {
        dockManager.resize(
            divDockContainer.clientWidth,
            divDockContainer.clientHeight
        );
    };
    window.onresize(null);

    dockManager.addLayoutListener({
        onDock: (dockManager, dockNode) => {
            console.log('onDock: ', dockManager, dockNode);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onUndock: (dockManager, dockNode) => {
            console.log('onUndock: ', dockManager, dockNode);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onCreateDialog: (dockManager, dialog) => {
            console.log('onCreateDialog: ', dockManager, dialog);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onChangeDialogPosition: (dockManager, dialog, x, y) => {
            console.log('onCreateDialog: ', dockManager, dialog, x, y);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onResumeLayout: (dockManager, panel) => {
            console.log('onResumeLayout: ', dockManager);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onClosePanel: (dockManager, panel) => {
            console.log('onClosePanel: ', dockManager, panel);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onHideDialog: (dockManager, dialog) => {
            console.log('onHideDialog: ', dockManager, dialog);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onShowDialog: (dockManager, dialog) => {
            console.log('onShowDialog: ', dockManager, dialog);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onTabsReorder: (dockManager, dialog) => {
            console.log('onTabsReorder: ', dockManager, dialog);
            localStorage.setItem(storeKey, dockManager.saveState());
        },
        onActivePanelChange: (dockManger, panel) => {
            console.log('onActivePanelChange: ', dockManager, panel);
            if (panel && panel.panelType == PanelType.document && panel.elementContent.editor) {
                // CodeMirror needs refresh wehn loaded into invisible div
                panel.elementContent.editor.refresh()
            }
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
        let editor1 = new PanelContainer(document.getElementById("editor1_window"), dockManager, null, PanelType.document);
        let editor2 = new PanelContainer(document.getElementById("editor2_window"), dockManager, null, PanelType.document);
        editor2.hideCloseButton(true);
        let infovis = new PanelContainer(document.getElementById("infovis"), dockManager); // invisible Dialog has no size, so size it manually
        infovis.width = 600;
        infovis.height = 400;

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
        dockManager.floatDialog(infovis, 50, 50);
    }

    var source_steering_h = "#pragma once\n#include \"entity\x2FGameEntity.h\"\n\n\nnamespace syntheticarc {\n\n\tclass SteeringBehaviours {\n\tpublic:\n\t\tSteeringBehaviours();\n\n\t\tvoid Update(float elapsedTime);\n\t\trespawn::math::Vector3 GetSteeringForce(const GameEntity\& host, const GameEntity\& target);\n\t\tvoid SetInitialDirection(const respawn::math::Vector3\& direction);\n\n\t\tbool IsSeekEnabled() const;\n\t\tvoid SetSeekEnabled(bool flag);\n\n\t\tbool IsBounceEnabled() const;\n\t\tvoid SetBounceEnabled(bool flag);\n\n\t\tvoid OnPhysicsContact(const respawn::physics::PhysicsContactPoint\& contactPoint);\n\n\tprivate:\n\t\trespawn::math::Vector3 Seek(const GameEntity\& host, const GameEntity\& target);\n\n\n\tprivate:\n\t\tbool seek;\n\t\tbool bounce;\n\n\t\trespawn::math::Vector3 direction;\t\t\t\x2F\x2F Used for bounce steering behavior\n\t\tfloat timeSinceLastBound;\n\n\t};\n}";
    var source_steering_cpp = "\n#include \"GamePrecompiled.h\"\n#include \"SteeringBehaviours.h\"\n#include \x3Cluabind\x2Fluabind.hpp\x3E\n\nusing namespace respawn::renderer;\nusing namespace respawn::math;\nusing namespace respawn::physics;\nusing namespace syntheticarc;\nusing namespace stl;\n\n\nsyntheticarc::SteeringBehaviours::SteeringBehaviours()\n: seek(true), bounce(false), timeSinceLastBound(0)\n{\n}\n\nrespawn::math::Vector3 syntheticarc::SteeringBehaviours::GetSteeringForce(const GameEntity\& host, \n\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t  const GameEntity\& target)\n{\n\t\x2F\x2F Get the steering force\n\tVector3 steeringForce = Vector3(0, 0, 0);\n\tif (seek) {\n\t\tsteeringForce = steeringForce + Seek(host, target);\n\t}\n\tif (bounce) {\n\t\tsteeringForce = direction * host.GetMaxSpeed();\n\t}\n\treturn steeringForce;\n}\n\nrespawn::math::Vector3 syntheticarc::SteeringBehaviours::Seek( const GameEntity\& host, const GameEntity\& target )\n{\n\tVector3 desired = target.GetPosition() - host.GetPosition();\n\n\t\x2F\x2F If desired velocity\'s speed component is greater than maxSpeed then truncate it\n\tconst float maxSpeed = target.GetMaxSpeed();\n\tconst float distance = length(desired);\n\tif (distance \x3C 0.000001f) {\n\t\treturn Vector3(0, 0, 0);\n\t}\n\tdesired = desired * (maxSpeed \x2F distance);\n\n\treturn desired - host.GetVelocity();\n}\n\nbool syntheticarc::SteeringBehaviours::IsSeekEnabled() const\n{\n\treturn seek;\n}\n\nvoid syntheticarc::SteeringBehaviours::SetSeekEnabled( bool flag )\n{\n\tthis-\x3Eseek = flag;\n}\n\nvoid syntheticarc::SteeringBehaviours::Update( float elapsedTime )\n{\n\ttimeSinceLastBound += elapsedTime;\n}\n\nvoid syntheticarc::SteeringBehaviours::OnPhysicsContact( const respawn::physics::PhysicsContactPoint\& contactPoint )\n{\n\tif (bounce \&\& timeSinceLastBound \x3E 2.0f \x2F 60) {\n\t\t\x2F\x2F Reflect the current direction based on the contact point\'s normal\n\t\tconst Vector3\& V = direction;\n\t\tconst Vector3\& N = contactPoint.normal;\n\n\t\tdirection = -2 * dot(V, N) * N + V;\n\t\ttimeSinceLastBound = 0;\n\t}\n}\n\nbool syntheticarc::SteeringBehaviours::IsBounceEnabled() const\n{\n\treturn bounce;\n}\n\nvoid syntheticarc::SteeringBehaviours::SetBounceEnabled( bool flag )\n{\n\tthis-\x3Ebounce = flag;\n}\n\nvoid syntheticarc::SteeringBehaviours::SetInitialDirection( const respawn::math::Vector3\& direction )\n{\n\tthis-\x3Edirection = direction;\n}\n";

    ///////////////////// JS Tree Views ////////////////////////////
    $(function () {
        $("#solution_window").jstree({ "plugins": ["themes", "html_data", "ui"], "core": { "initially_open": ["solution_window_1"] } })
        $("#toolbox_window").jstree({ "plugins": ["themes", "html_data", "ui", "crrm", "hotkeys"], "core": {} })
    });

    ///////////////////// Code Mirror Editor ////////////////////////////
    // Editor 1
    var editor1_window_div = document.getElementById("editor1_window");
    var editor1 = CodeMirror(editor1_window_div, {
        lineNumbers: true,
        matchBrackets: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        mode: "text/x-csrc",
        value: source_steering_h,
        onCursorActivity: function () {
            editor1.setLineClass(editorLine1, null, null);
            editorLine1 = editor1.setLineClass(editor1.getCursor().line, null, "activeline");
        }
    });
    editor1_window_div.editor = editor1;

    // Editor 2
    var editor2_window_div = document.getElementById("editor2_window");
    var editor2 = CodeMirror(editor2_window_div, {
        lineNumbers: true,
        matchBrackets: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        mode: "text/x-csrc",
        value: source_steering_cpp,
        onCursorActivity: function () {
            editor2.setLineClass(editorLine2, null, null);
            editorLine2 = editor2.setLineClass(editor2.getCursor().line, null, "activeline");
        }
    });
    editor2_window_div.editor = editor2;

    // Output Window
    var editorOutput = CodeMirror(document.getElementById("output_window"), {
        value: "[info] program exited with code 0"
    });

    ////////////////////////////////////////////////////////////////

    InitDebugTreeVis(window.dockManager);
};