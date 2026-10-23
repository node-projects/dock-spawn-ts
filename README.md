# dock-spawn-ts
A TypeScript Version of dock-spawn (see https://github.com/coderespawn/dock-spawn)

Homepage at https://node-projects.github.io/dock-spawn-ts/

[![NPM version](http://img.shields.io/npm/v/dock-spawn-ts.svg)](https://www.npmjs.com/package/dock-spawn-ts)
[![Downloads](https://img.shields.io/npm/dm/dock-spawn-ts.svg)](https://www.npmjs.com/package/dock-spawn-ts)

# info
Dock Spawn TS is a Typescript Docking Framework to create a Visual Studio like IDE in HTML

![Logo](https://raw.githubusercontent.com/node-projects/dock-spawn-ts/master/ide.png)

# es5 version

The optional legacy ES5 build is generated locally in `lib/es5` by
`build-es5.bat` on Windows, after compiling TypeScript. It is separate from the
standard npm release build. Its usage example is `page/demo/demo_simple_es5.html`.

# differences to original dockspawn
 - typescript
 - bugfixes / preformance optimations
 - save/restore fixed and saveing/restoring of dialogs
 - touch support (works on ipad/iphone and android devices)
 - performance fixes (unnessecary removeing and adding to dom reduced, not needed elements are hidden, not removed from dom)
 - multiple dockspawn's in one page
 - removed font-awesome dependency
 - settings (dockManger.config)
 - ContextMenu to close all docks (Document Docks only)
 - wip webcomponent support

# testing
 - download the project
 - install node packages ("npm ci")
 - build JavaScript and browser bundles ("npm run build")
 - run ("npm start")
 - browse to: http://127.0.0.1:8080/page/demo/ide/demo.html

See [CONTRIBUTING.md](CONTRIBUTING.md) for build, pull request and release instructions.

# how to use:

Resize operations return a `Promise<void>` that resolves after descendant containers
and deferred animation-frame layout work finish. Sizes are assigned immediately;
await the result before measuring content or performing work that depends on the
completed layout:

```javascript
await dockManager.resize(width, height);
// Content positions and tab widths are now updated.
```

The web component's `resize()` and `dockManager.invalidate()` can also be awaited.

Panel fullscreen (maximize) is opt-in and fills only the DockSpawn container:

```javascript
const dockManager = new DockManager(element, { enableFullscreen: true }); // default: false
dockManager.setFullscreenEnabled(false); // update existing controls and future panels
dockManager.setFullscreenEnabled(true);
panel.hideFullscreenButton(true); // disable for this panel; false enables it again
panel.setFullscreen(true); // requires global opt-in and a visible fullscreen button
panel.setFullscreen(false); // restore; also available through the restore button or Escape
```

The square button appears in panel title bars and tab handles, including document
tabs and floating groups. Maximizing preserves the dock layout and the content DOM.
The restore button stays visible above the content. Container resizing also resizes
the maximized content. Escape restores the panel before the usual close behavior.
Only one panel per manager can be maximized at a time. Disabling the feature restores
it. Per-panel button visibility is saved with the layout; the temporary fullscreen
state is not. The browser Fullscreen API is not used.

For the web component, add `dock-spawn-enable-fullscreen` to `<dock-spawn-ts>`
and optionally `dock-spawn-hide-fullscreen-button` to individual child elements.
After initialization, the same runtime methods are available through `dockManager`.
Open `tests/fullscreen.html` after building for the interactive regression checks.

Tab strips keep readable tab widths and scroll horizontally when they overflow.
Use the dropdown at the end of each strip to select any tab, including hidden tabs.
The selected tab scrolls into view. Click the row button beside the dropdown to
switch that strip between a single row and multiple rows, like Visual Studio.
Multi-row strips use at most half the pane height and scroll vertically beyond that.
These controls work for document tabs, bottom tool tabs and floating tab groups.

```javascript
const dockManager = new DockManager(element, { tabStripMode: 'wrap' }); // default: 'scroll'
await dockManager.setTabStripMode('scroll'); // update all strips and the default
await panel.tabPage.host.setTabStripMode('wrap'); // update one strip
```

The mode is a display preference for the current session; saved layouts do not
store it. After building, open `tests/tab-overflow.html` for a demo and browser checks.
The IDE demo at `page/demo/ide/demo.html` opens 15 editable documents to exercise
overflow and row switching, including when upgrading an older saved demo layout.

Auto-hide is disabled by default. Enable it when creating the manager:

```javascript
const dockManager = new DockManager(element, { enableAutoHide: true });
```

Use `dockManager.setAutoHideEnabled(true)` or `false` to change it at runtime.
Disabling auto-hide re-pins collapsed panels and hides the pin controls. Loading
a saved layout while it is disabled also re-pins its collapsed panels.

When enabled, tool panels have a pin button in their title bar. Click it to collapse the panel
to a tab on its dock edge (left, right, top, or bottom). Click the edge tab to open
the panel over the layout; clicking or focusing outside it, or pressing Escape,
collapses it again. Click the pin button in the overlay to dock it again. Pinning
restores the previous nested dock position, tab order and pane sizes where the
surrounding panels still exist, including when a whole group is unpinned and
then pinned back in a different order. This shared layout history is saved with
the layout. If a neighboring panel was closed, it uses the
nearest surviving branch of the old layout, falling back to the saved edge.
Drag the overlay edge facing the document area to resize it: left/right panels
change width, and top/bottom panels change height. The overlay size is remembered
when reopened and saved with the layout.
Drag the overlay's title bar to turn it into a floating dialog at its last docked
size and dock it elsewhere. Panel content stays in the DOM throughout these transitions.
Document tabs and floating dialogs do not have an auto-hide button.

The same behavior is available through `panel.setAutoHide(true)` and
`panel.setAutoHide(false)`. Pass an optional edge, such as
`panel.setAutoHide(true, 'right')`, to override the inferred dock edge.
`panel.isAutoHidden` reports whether the panel is collapsed to an edge tab.
`dockManager.autoHideManager.show(panel)` opens its overlay.
`saveState()` / `loadState()` preserve collapsed panels, their edges and sizes.
Use the `onAutoHideChanged(dockManager, panel)` layout listener to save state after
pinning or unpinning. Locking the dock state also disables the pin controls.

Run `npm test` for the regression suite. For browser lifecycle checks, run
`npm start`, open `http://127.0.0.1:8080/tests/auto-hide.html`, and click **Run tests**.

Tab group moving is opt-in:

```javascript
const dockManager = new DockManager(element, {
    enableTabGroups: true,   // default: false
    persistTabGroups: true  // default: true
});
```

Move a whole tab group by dragging the empty strip space after its tabs up or down.
To move a subset, Ctrl-click (Cmd-click on macOS) its tabs, then drag one of the
marked tabs up or down. The tabs float in one resizable window. Drag the floating
group's title bar onto a docking arrow to dock them together, or drag an individual
tab out to separate it. Tab order and the active tab are retained, including when
saving and restoring floating groups. Dock locking and each panel's `canUndock`
setting also apply to group moves.

Drop a floating window over another floating window to combine their tabs. The
target is outlined while dragging. Groups can also be merged this way. Modal
windows, windows with docking disabled and locked panels are excluded.
`setTabGroupsEnabled(false)` disables the feature at runtime and separates floating
groups into individual windows. Re-enable it with `setTabGroupsEnabled(true)`.
Setting `config.persistTabGroups = false` keeps groups during the current session,
but saves and restores their members as separate floating windows. Loading grouped
layouts with grouping disabled also restores separate windows without losing tabs.
Existing docked tab layouts are retained in both cases.

For a focused demo with document and tool groups, open
`http://127.0.0.1:8080/tests/tab-groups.html` after building and starting the server.
It includes save/restore controls and a **Run regression tests** button.

When docking beside an existing pane with a ratio, the new pane takes that fraction
of the reference pane's space after allowing for the new splitter bar. Other panes
keep their pixel sizes. Closing or undocking a pane gives its freed space to the
elastic document area while preserving the remaining tool panels.

To keep unrelated panes at their current sizes when dropping a floating panel
beside a pane in an existing splitter with the same orientation, opt in with:

```js
dockManager.config.dockingSizeStrategy = 'split-reference';
```

This divides the target pane's space equally between the target and the new pane,
allowing for the new splitter bar. The docking preview reflects this allocation.
The default, `'proportional'`, retains the existing size distribution based on
the panels' previous sizes. Explicit ratios passed to `dockLeft`, `dockRight`,
`dockUp` or `dockDown` continue to take precedence. Tab docking is unchanged.

For equal shares when dropping on the **outer DockManager indicators**, use:

```js
dockManager.config.dockingSizeStrategy = 'equal-distribution';
```

An outer drop balances the affected root splitter's direct children after allowing
for splitter bars: three panes receive thirds, four receive quarters. An existing
root splitter with the same orientation is reused; opposite-orientation nested
groups remain intact and each count as one child. Equality is applied on docking,
not continuously when the host resizes. Panel-relative indicators use
`split-reference` behavior in this mode. Previews match the resulting allocation.
The default remains `proportional`, and explicit programmatic ratios still apply.
To trigger outer docking programmatically for a floating dialog, pass `true` as
the third argument to `dockDialogLeft`, `dockDialogRight`, `dockDialogUp` or
`dockDialogDown`, with `dockManager.context.model.rootNode` as the target.

Try the cream-and-green **Fieldwork Workspace** demo at
`http://127.0.0.1:8080/page/demo/demo_reference_sizing.html` after building and
starting the server. It starts in `equal-distribution` mode. Use **Dock at bottom**
for equal thirds, or reset and use **Split Detail** to preserve List's height.
The sizing selector lets you compare all three strategies. **Reset layout**
restores the starting arrangement without changing the selected strategy.
The demo's docking host has an explicit width and height so replacing the root
layout during docking cannot collapse it. Browser regression checks for moving
document tabs into splits and resetting floating panels are available at
`http://127.0.0.1:8080/tests/repeated-docking.html`.

For a modern dark playground, open **Orbit Layout Studio** at
`http://127.0.0.1:8080/page/demo/demo_layout_studio.html`. Compare all three
strategies using outer-bottom, outer-right and panel-relative presets, each
starting from the same layout. Live dimensions follow manual docking and resizing;
you can also float Navigator and restore the layout with **Reset layout**.

```html
   dockspawn div container needs position absolute or relative 

<div id="dock_div" style="height: calc(100% - 45px);">
    <div id="my_dock_manager" class="my-dock-manager" style="position: relative;"></div>
    <div id="solution_window" data-panel-caption="Solution Explorer" data-panel-icon="test.png" class="solution-window" hidden></div>
    <div id="properties_window" data-panel-caption="Properties" class="properties-window" hidden></div>
    <div id="state_window" data-panel-caption="state" class="state-window" hidden></div>
    <div id="editor1_window" data-panel-caption="Steering.h" class="editor1-window editor-host" hidden></div>
    <div id="editor2_window" data-panel-caption="Steering.cpp" class="editor2-window editor-host" hidden></div>
    <div id="infovis" data-panel-caption="Dock Tree Visualizer" class="editor2-window editor-host" hidden></div>
    <div id="output_window" data-panel-caption="Output" class="output-window editor-host" hidden></div>
    <div id="outline_window" data-panel-caption="Outline" class="outline-window" hidden></div>
    <div id="toolbox_window" data-panel-caption="Toolbox" class="toolbox-window" hidden></div>
</div>

```

```javascript
    import { DockManager } from "../DockManager.js";
    import { PanelContainer } from "../PanelContainer.js";

    // Convert a div to a dock manager.  Panels can then be docked on to it
    let divDockManager = document.getElementById('dock_div');
    let dockManager = new DockManager(document.getElementById('my_dock_manager'));
    dockManager.initialize();

    // Let the dock manager element fill in the entire screen
    window.onresize = function () {
        dockManager.resize(
            window.innerWidth - (divDockManager.clientLeft + divDockManager.offsetLeft),
            window.innerHeight - (divDockManager.clientTop + divDockManager.offsetTop)
        );
    };
    window.onresize(null);

    // Convert existing elements on the page into "Panels". 
    // They can then be docked on to the dock manager 
    // Panels get a titlebar and a close button, and can also be 
    // converted to a floatingdialog box which can be dragged / resized 
    let solution = new PanelContainer(document.getElementById("#solution_window"), dockManager);
    let output = new PanelContainer(document.getElementById("#output_window"), dockManager);
    let properties = new PanelContainer(document.getElementById("#properties_window"), dockManager);
    let toolbox = new PanelContainer(document.getElementById("#toolbox_window"), dockManager);
    let outline = new PanelContainer(document.getElementById("#outline_window"), dockManager);
    let state = new PanelContainer(document.getElementById("#state_window"), dockManager);
    let editor1 = new PanelContainer(document.getElementById("#editor1_window"), dockManager);
    let editor2 = new PanelContainer(document.getElementById("#editor2_window"), dockManager);
    let infovis = new PanelContainer(document.getElementById("infovis"), dockManager);

    // Dock the panels on the dock manager
    let documentNode = dockManager.context.model.documentManagerNode;
    let solutionNode = dockManager.dockLeft(documentNode, solution, 0.20);
    let outlineNode = dockManager.dockFill(solutionNode, outline);
    let propertiesNode = dockManager.dockDown(outlineNode, properties, 0.6);
    let outputNode = dockManager.dockDown(documentNode, output, 0.4);
    let stateNode = dockManager.dockRight(outputNode, state, 0.40);
    let toolboxNode = dockManager.dockRight(documentNode, toolbox, 0.20);
    let editor1Node = dockManager.dockFill(documentNode, editor1);
    let editor2Node = dockManager.dockFill(documentNode, editor2);
    dockManager.floatDialog(infovis, 50, 50);

    // You could listen to callbacks of DockManager like this, there are more event's then close available see ILayoutEventListener
      dockManager.addLayoutListener({
         onClosePanel: (dockManager, panel) => {
            console.log('onClosePanel: ', dockManager, panel);
            localStorage.setItem(storeKey, dockManager.saveState());
        }
    });
```

# other html docking frameworks in comparison

| Url                                            | Licence         | Touch support | Dialogs | Keep Content in DOM | Autocolapsing Panels | Dialogs in new Browserwindows | Dock Back from extra Browserwindow |
|------------------------------------------------|-----------------|---------------|---------|---------------------|----------------------|-------------------------------|------------------------------------|
| dock-spawn-ts                                  | MIT             | Yes           | Yes     | Yes                 | Yes                  | Yes                           | No                                 |
| https://github.com/golden-layout/golden-layout | MIT             | No            | No      |                     |                      | Yes                           |                                    |
| https://github.com/WebCabin/wcDocker           | MIT             | Yes           | Yes     |                     |                      | No                            |                                    |
| https://jspanel.de                             | MIT             | Yes           | Yes     |                     |                      | No                            |                                    |
| http://www.htmldockfloat.com                   | Commerical/free | No            | Yes     |                     |                      | No                            |                                    |
| http://phosphorjs.github.io/                   | BSD 3           | ?             | ?       |                     |                      | No                            |                                    |
| https://github.com/tupilabs/vue-lumino         | Apache2         | ?             | No      |                     |                      | No                            |                                    |
| https://github.com/mathuo/dockview             | MIT             | ?             | No      |                     |                      | No                            |                                    |
   
https://github.com/nomcopter/react-mosaic
