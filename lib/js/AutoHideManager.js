import { PanelType } from './enums/PanelType.js';
/** Edge tabs and a single overlay. Content stays in its original content container. */
export class AutoHideManager {
    manager;
    tabs = new Map();
    rails = new Map();
    openPanel;
    restoringPanel;
    stripSize = 26;
    resizeHandle;
    resizeDrag;
    constructor(manager) {
        this.manager = manager;
        for (const side of ['left', 'right', 'top', 'bottom']) {
            const rail = document.createElement('div');
            rail.className = 'dock-auto-hide-rail dock-auto-hide-' + side;
            rail.style.display = 'none';
            manager.element.appendChild(rail);
            this.rails.set(side, rail);
        }
        // Content is hosted separately from the panel, so keep the handle above both.
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'dock-auto-hide-resize-handle';
        this.resizeHandle.style.display = 'none';
        this.resizeHandle.onpointerdown = this.onResizeStart;
        this.resizeHandle.onpointermove = this.onResizeMove;
        this.resizeHandle.onpointerup = this.onResizeEnd;
        this.resizeHandle.onpointercancel = this.onResizeEnd;
        this.resizeHandle.onlostpointercapture = this.onResizeEnd;
        manager.element.appendChild(this.resizeHandle);
    }
    get entries() { return this.manager.context.model.autoHidePanels; }
    getSide(panel) {
        if (panel.isDialog || panel.panelType === PanelType.document)
            return undefined;
        const existing = this.entries.find(entry => entry.panel === panel);
        if (existing)
            return existing.side;
        let node = this.manager.getNodeByElement(panel.elementContent);
        let document = this.manager.context.model.documentManagerNode;
        const documentPath = new Set();
        for (let ancestor = document; ancestor; ancestor = ancestor.parent)
            documentPath.add(ancestor);
        for (; node?.parent; node = node.parent) {
            const parent = node.parent;
            if (parent === document)
                return undefined;
            if (!documentPath.has(parent))
                continue;
            const documentBranch = parent.children.find(child => documentPath.has(child));
            const before = parent.children.indexOf(node) < parent.children.indexOf(documentBranch);
            if (parent.container.containerType === 'horizontal')
                return before ? 'left' : 'right';
            if (parent.container.containerType === 'vertical')
                return before ? 'top' : 'bottom';
        }
        return undefined;
    }
    isAutoHidden(panel) { return this.entries.some(entry => entry.panel === panel); }
    isOpen(panel) { return this.openPanel === panel; }
    anchor(node) {
        const elements = [];
        let document = false;
        const visit = (child) => {
            if (child === this.manager.context.model.documentManagerNode)
                document = true;
            const id = child.container.elementContent?.id;
            if (id)
                elements.push(id);
            child.children.forEach(visit);
        };
        visit(node);
        return { elements, ...(document ? { document } : {}) };
    }
    captureLocations(node) {
        const locations = [];
        for (; node.parent; node = node.parent) {
            const parent = node.parent;
            const type = parent.container.containerType;
            if (type !== 'fill' && type !== 'horizontal' && type !== 'vertical')
                continue;
            locations.push({ type, index: parent.children.indexOf(node),
                siblings: parent.children.map(child => this.anchor(child)),
                sizes: parent.children.map(child => type === 'vertical' ? child.container.height : child.container.width) });
        }
        return locations;
    }
    panelKey(panel) {
        return panel.elementContent.id ? 'element:' + panel.elementContent.id : 'panel:' + panel.name;
    }
    captureState(node) {
        return { width: node.container.width, height: node.container.height, locations: this.captureLocations(node) };
    }
    /** Keep the layout before any panels are hidden, including peers still docked at that time. */
    rememberLayout() {
        const layout = {};
        const visit = (node) => {
            const panel = node.container;
            if (panel.elementContent)
                layout[this.panelKey(panel)] = this.captureState(node);
            node.children.forEach(visit);
        };
        visit(this.manager.context.model.rootNode);
        for (const entry of this.entries)
            layout[this.panelKey(entry.panel)] = { width: entry.width, height: entry.height, locations: entry.restoreLocations ?? [] };
        this.manager.context.model.autoHideLayout = layout;
    }
    /** Explicit docking starts a new remembered position for the moved panel. */
    onDock(node) {
        const panel = node.container;
        const layout = this.manager.context.model.autoHideLayout;
        if (layout && panel.elementContent && panel !== this.restoringPanel)
            layout[this.panelKey(panel)] = this.captureState(node);
    }
    /** Locate the surviving branch, including empty document managers and composite siblings. */
    resolveAnchor(anchor) {
        const nodes = anchor.elements.map(id => this.manager.getNodeByElementId(id)).filter(Boolean);
        if (anchor.document)
            nodes.push(this.manager.context.model.documentManagerNode);
        if (!nodes.length)
            return undefined;
        let common = nodes[0];
        for (const node of nodes.slice(1)) {
            const ancestors = new Set();
            for (let current = node; current; current = current.parent)
                ancestors.add(current);
            while (common && !ancestors.has(common))
                common = common.parent;
        }
        return common;
    }
    restoreLocation(entry) {
        for (const location of entry.restoreLocations ?? []) {
            // Try the closest surviving sibling first, then fall back through the old ancestors.
            const candidates = location.siblings.map((anchor, index) => ({ anchor, index }))
                .filter(candidate => candidate.index !== location.index)
                .sort((a, b) => Math.abs(a.index - location.index) - Math.abs(b.index - location.index));
            for (const candidate of candidates) {
                const reference = this.resolveAnchor(candidate.anchor);
                if (!reference)
                    continue;
                const before = location.index < candidate.index;
                const method = location.type === 'fill' ? 'dockFill' : location.type === 'horizontal'
                    ? before ? 'dockLeft' : 'dockRight' : before ? 'dockUp' : 'dockDown';
                const size = location.type === 'vertical' ? entry.height : entry.width;
                const extent = location.type === 'vertical' ? reference.container.height : reference.container.width;
                const ratio = Math.min(0.95, Math.max(0.05, size / Math.max(1, extent - 5)));
                const restored = this.manager[method](reference, entry.panel, ratio);
                if (restored?.parent) {
                    // Restore outer splitter sizes first, then nested splitters and tab order.
                    for (const saved of [...entry.restoreLocations].reverse()) {
                        const branch = this.resolveAnchor(saved.siblings[saved.index]);
                        if (branch?.parent)
                            this.restoreSiblingLayout(branch, saved);
                    }
                }
                return true;
            }
        }
        return false;
    }
    restoreSiblingLayout(restored, location) {
        const parent = restored.parent;
        const oldBranches = location.siblings.map((anchor, index) => index === location.index
            ? restored : this.resolveAnchor(anchor));
        // Find the current direct children corresponding to the original branches.
        const branches = oldBranches.map(node => {
            while (node?.parent && node.parent !== parent)
                node = node.parent;
            return node?.parent === parent ? node : undefined;
        });
        if (location.type === 'fill' && parent.container.containerType === 'fill') {
            const reordered = parent.children.filter(node => node !== restored);
            const next = branches.slice(location.index + 1).find(node => node && reordered.includes(node));
            const previous = branches.slice(0, location.index).reverse().find(node => node && reordered.includes(node));
            const index = next ? reordered.indexOf(next) : previous ? reordered.indexOf(previous) + 1
                : Math.min(location.index, reordered.length);
            reordered.splice(index, 0, restored);
            const indexes = reordered.map(node => parent.children.indexOf(node));
            parent.children = reordered;
            parent.container.tabHost.performTabsLayout(indexes);
        }
        else if (parent.container.containerType === location.type) {
            // Apply saved sizes only when the original sibling group can still be reconstructed.
            if (branches.some(node => !node) || new Set(branches).size !== branches.length || branches.length !== parent.children.length)
                return;
            const sizes = parent.children.map(child => location.sizes[branches.indexOf(child)]);
            if (sizes.every(size => Number.isFinite(size) && size >= 0))
                parent.container.setSizes(sizes);
        }
    }
    setAutoHide(panel, enabled, side) {
        if (this.isAutoHidden(panel) === enabled)
            return;
        if (!enabled) {
            const entry = this.entries.find(entry => entry.panel === panel);
            this.restoringPanel = panel;
            try {
                this.remove(panel);
                if (this.restoreLocation(entry)) {
                    this.manager.activePanel = panel;
                    this.notify(panel);
                    return;
                }
                const tabGroup = entry.tabGroupElement && this.manager.getNodeByElementId(entry.tabGroupElement);
                if (tabGroup) {
                    this.manager.dockFill(tabGroup, panel);
                    this.manager.activePanel = panel;
                    this.notify(panel);
                    return;
                }
                const root = this.manager.context.model.rootNode;
                const extent = entry.side === 'left' || entry.side === 'right' ? root.container.width : root.container.height;
                const size = entry.side === 'left' || entry.side === 'right' ? entry.width : entry.height;
                const ratio = Math.min(0.9, Math.max(0.1, size / Math.max(1, extent - 5)));
                const dock = { left: 'dockLeft', right: 'dockRight', top: 'dockUp', bottom: 'dockDown' }[entry.side];
                this.manager[dock](root, panel, ratio);
                this.manager.activePanel = panel;
                this.notify(panel);
                return;
            }
            finally {
                this.restoringPanel = undefined;
            }
        }
        const inferredSide = this.getSide(panel);
        if (!this.manager.config.enableAutoHide || !inferredSide || !panel._canUndock || !this.manager._undockEnabled)
            return;
        side ??= inferredSide;
        if (!this.rails.has(side))
            throw new Error('Invalid auto-hide side: ' + side);
        const node = this.manager.getNodeByElement(panel.elementContent);
        if (!this.entries.length || !this.manager.context.model.autoHideLayout)
            this.rememberLayout();
        const layout = this.manager.context.model.autoHideLayout;
        const key = this.panelKey(panel);
        const saved = layout[key] ?? (layout[key] = this.captureState(node));
        const tabSibling = node.parent?.container.containerType === 'fill'
            ? node.parent.children.find(child => child !== node)?.container : undefined;
        const entry = { panel, side, width: saved.width, height: saved.height,
            tabGroupElement: tabSibling?.elementContent?.id,
            restoreLocations: side === inferredSide ? saved.locations : [] };
        this.manager.layoutEngine.undock(node);
        this.entries.push(entry);
        this.attach(entry);
        this.manager.invalidate();
        this.notify(panel);
    }
    notify(panel) {
        this.manager.layoutEventListeners.forEach(listener => listener.onAutoHideChanged?.(this.manager, panel));
    }
    attach(entry) {
        const { panel, side } = entry;
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'dock-auto-hide-tab';
        tab.setAttribute('aria-expanded', 'false');
        tab.textContent = panel.title;
        tab.onclick = () => this.openPanel === panel ? this.hide() : this.show(panel);
        this.rails.get(side).appendChild(tab);
        this.tabs.set(panel, tab);
        panel.onTitleChanged = () => { tab.textContent = panel.title; };
        panel.elementPanel.style.position = 'absolute';
        panel.elementPanel.style.display = 'none';
        panel.elementPanel.classList.add('dock-auto-hide-overlay');
        this.manager.element.appendChild(panel.elementPanel);
        panel.undockInitiator.enabled = false;
        panel.setVisible(false);
        panel.updateAutoHideButton();
    }
    show(panel) {
        if (!this.isAutoHidden(panel))
            return;
        this.hide();
        this.openPanel = panel;
        panel.elementPanel.style.display = 'block';
        panel.elementPanel.style.zIndex = '9000';
        panel.elementContentContainer.style.zIndex = '9000';
        this.tabs.get(panel).setAttribute('aria-expanded', 'true');
        this.layoutOverlay();
        panel.undockInitiator.enabled = panel._canUndock && this.manager._undockEnabled;
        this.manager.activePanel = panel;
        panel.elementPanel.focus();
        document.addEventListener('pointerdown', this.onOutside, true);
        document.addEventListener('focusin', this.onOutside, true);
        document.addEventListener('keydown', this.onKeyDown, true);
    }
    onOutside = (event) => {
        const panel = this.openPanel;
        if (!panel || this.resizeDrag)
            return;
        const path = event.composedPath();
        if (path.includes(this.resizeHandle))
            return;
        if (path.includes(panel.elementPanel) || path.includes(panel.elementContentContainer) || path.includes(this.tabs.get(panel)))
            return;
        this.hide();
    };
    onKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            const tab = this.tabs.get(this.openPanel);
            this.hide();
            tab?.focus();
        }
    };
    hide() {
        this.stopResize();
        this.resizeHandle.style.display = 'none';
        const panel = this.openPanel;
        this.openPanel = undefined;
        document.removeEventListener('pointerdown', this.onOutside, true);
        document.removeEventListener('focusin', this.onOutside, true);
        document.removeEventListener('keydown', this.onKeyDown, true);
        if (!panel)
            return;
        panel.elementPanel.style.display = 'none';
        panel.undockInitiator.enabled = false;
        panel.setVisible(false);
        this.tabs.get(panel)?.setAttribute('aria-expanded', 'false');
        if (this.manager.activePanel === panel)
            this.manager.activePanel = null;
    }
    remove(panel) {
        const entry = this.entries.find(entry => entry.panel === panel);
        if (!entry)
            return undefined;
        if (this.openPanel === panel)
            this.hide();
        this.tabs.get(panel)?.remove();
        this.tabs.delete(panel);
        this.entries.splice(this.entries.findIndex(entry => entry.panel === panel), 1);
        if (!this.entries.length)
            this.manager.context.model.autoHideLayout = undefined;
        delete panel.onTitleChanged;
        panel.elementPanel.remove();
        panel.elementPanel.classList.remove('dock-auto-hide-overlay');
        panel.elementPanel.style.position = '';
        panel.elementPanel.style.left = '';
        panel.elementPanel.style.top = '';
        panel.elementPanel.style.zIndex = '';
        panel.elementContentContainer.style.zIndex = '';
        panel.setVisible(false);
        panel.updateAutoHideButton();
        this.manager.invalidate();
        return entry;
    }
    /** Discard old edge UI before restoring a model. */
    reset() {
        for (const panel of [...this.tabs.keys()])
            this.remove(panel);
    }
    restore() {
        for (const entry of this.entries)
            this.attach(entry);
        if (!this.manager.config.enableAutoHide)
            for (const entry of [...this.entries])
                this.setAutoHide(entry.panel, false);
        this.manager.invalidate();
    }
    async resize(width, height) {
        const inset = (side) => this.entries.some(entry => entry.side === side) ? this.stripSize : 0;
        const left = inset('left'), right = inset('right'), top = inset('top'), bottom = inset('bottom');
        for (const [side, rail] of this.rails) {
            rail.style.display = inset(side) ? 'flex' : 'none';
            if (side === 'left' || side === 'right') {
                rail.style.top = top + 'px';
                rail.style.bottom = bottom + 'px';
            }
            else {
                rail.style.left = left + 'px';
                rail.style.right = right + 'px';
            }
        }
        const root = this.manager.context.model.rootNode.container;
        root.containerElement.style.position = 'relative';
        root.containerElement.style.left = left + 'px';
        root.containerElement.style.top = top + 'px';
        await Promise.all([
            root.resize(Math.max(0, width - left - right), Math.max(0, height - top - bottom)),
            this.layoutOverlay()
        ]);
    }
    async layoutOverlay() {
        const entry = this.entries.find(entry => entry.panel === this.openPanel);
        if (!entry)
            return;
        const root = this.manager.context.model.rootNode.container;
        const left = parseFloat(root.containerElement.style.left) || 0;
        const top = parseFloat(root.containerElement.style.top) || 0;
        const vertical = entry.side === 'left' || entry.side === 'right';
        const width = Math.max(0, Math.min(root.width, vertical ? entry.width : root.width));
        const height = Math.max(0, Math.min(root.height, vertical ? root.height : entry.height));
        entry.panel.elementPanel.style.left = (entry.side === 'right' ? left + root.width - width : left) + 'px';
        entry.panel.elementPanel.style.top = (entry.side === 'bottom' ? top + root.height - height : top) + 'px';
        const resized = entry.panel.resize(width, height);
        const x = parseFloat(entry.panel.elementPanel.style.left);
        const y = parseFloat(entry.panel.elementPanel.style.top);
        const grip = Math.min(6, vertical ? width : height);
        Object.assign(this.resizeHandle.style, {
            display: 'block',
            cursor: vertical ? 'ew-resize' : 'ns-resize',
            left: (x + (entry.side === 'left' ? width - grip : 0)) + 'px',
            top: (y + (entry.side === 'top' ? height - grip : 0)) + 'px',
            width: (vertical ? grip : width) + 'px',
            height: (vertical ? height : grip) + 'px'
        });
        await resized;
    }
    onResizeStart = (event) => {
        if (event.button !== 0 || this.resizeDrag)
            return;
        const entry = this.entries.find(entry => entry.panel === this.openPanel);
        if (!entry)
            return;
        event.preventDefault();
        event.stopPropagation();
        const horizontal = entry.side === 'left' || entry.side === 'right';
        this.resizeDrag = { pointerId: event.pointerId, entry,
            start: horizontal ? event.clientX : event.clientY,
            size: horizontal ? entry.panel.width : entry.panel.height };
        this.resizeHandle.setPointerCapture(event.pointerId);
    };
    onResizeMove = (event) => {
        const drag = this.resizeDrag;
        if (!drag || event.pointerId !== drag.pointerId)
            return;
        event.preventDefault();
        const { entry } = drag;
        const horizontal = entry.side === 'left' || entry.side === 'right';
        const direction = entry.side === 'right' || entry.side === 'bottom' ? -1 : 1;
        const delta = (horizontal ? event.clientX : event.clientY) - drag.start;
        const root = this.manager.context.model.rootNode.container;
        const extent = Math.max(0, horizontal ? root.width : root.height);
        const size = Math.min(extent, Math.max(50, drag.size + direction * delta));
        if (horizontal)
            entry.width = size;
        else
            entry.height = size;
        this.layoutOverlay();
    };
    onResizeEnd = (event) => {
        if (event.pointerId === this.resizeDrag?.pointerId)
            this.stopResize();
    };
    stopResize() {
        const drag = this.resizeDrag;
        this.resizeDrag = undefined;
        if (drag && this.resizeHandle.hasPointerCapture(drag.pointerId))
            this.resizeHandle.releasePointerCapture(drag.pointerId);
    }
}
//# sourceMappingURL=AutoHideManager.js.map