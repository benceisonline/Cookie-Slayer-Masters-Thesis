// Ensure the state exists globally so it persists across imports
if (!window.__ci_postit_state) {
    window.__ci_postit_state = { count: 0, notes: {}, currentParent: null };
}

// Scroll handling: hide connector lines when user scrolls a small distance
    if (!window.__ci_postit_scroll_state) {
    window.__ci_postit_scroll_state = { lastY: (window.scrollY || window.pageYOffset || 0), acc: 0, timer: null, hidden: false, rafPending: false };

    const SCROLL_HIDE_THRESHOLD = 30; // pixels
    const SCROLL_RESET_MS = 500; // accumulation window

    function hideAllConnectors() {
        try {
            const notes = window.__ci_postit_state && window.__ci_postit_state.notes;
            if (!notes) return;
            Object.keys(notes).forEach(k => {
                const e = notes[k];
                try {
                    if (e && e.line) {
                        // ensure visible and transition exists
                        try { e.line.style.display = 'block'; } catch(_) {}
                        try { e.line.style.transition = e.line.style.transition || 'opacity 220ms ease'; } catch(_) {}
                        // force reflow so the transition runs reliably
                        try { void e.line.offsetWidth; } catch(_) {}
                        // fade out
                        try { e.line.style.opacity = '0'; } catch(_) {}
                        // after fade complete, hide from layout
                        setTimeout(() => { try { e.line.style.display = 'none'; } catch(_) {} }, 220);
                    }
                } catch(_) {}
            });
            // mark as in-scrolling state so created lines respect hidden state
            window.__ci_postit_scroll_state.scrolling = true;
        } catch (_) {}
    }

    function showAllConnectors() {
        try {
            const notes = window.__ci_postit_state && window.__ci_postit_state.notes;
            if (!notes) return;
            Object.keys(notes).forEach(k => {
                const e = notes[k];
                try {
                    if (e && e.line) {
                        try { e.line.style.display = 'block'; } catch(_) {}
                    }
                } catch(_) {}
            });
            // Force reflow then fade opacity in
            requestAnimationFrame(() => {
                try {
                    Object.keys(notes).forEach(k => {
                        const e = notes[k];
                        try { if (e && e.line) { e.line.style.transition = e.line.style.transition || 'opacity 220ms ease'; e.line.style.opacity = '1'; } } catch(_) {}
                    });
                } catch(_) {}
            });
            window.__ci_postit_scroll_state.scrolling = false;
        } catch (_) {}
    }

    function onPageScroll() {
        try {
            const cur = (window.scrollY || window.pageYOffset || 0);
            const delta = Math.abs(cur - window.__ci_postit_scroll_state.lastY);
            window.__ci_postit_scroll_state.lastY = cur;
            window.__ci_postit_scroll_state.acc += delta;

            // If this is the start of a scroll, hide connectors immediately
            try {
                if (!window.__ci_postit_scroll_state.scrolling) {
                    hideAllConnectors();
                }
            } catch(_) {}

            // While scrolling, schedule connector position updates via RAF
            try {
                if (!window.__ci_postit_scroll_state.rafPending) {
                    window.__ci_postit_scroll_state.rafPending = true;
                    requestAnimationFrame(() => {
                        try {
                            window.__ci_postit_scroll_state.rafPending = false;
                            const notes = window.__ci_postit_state && window.__ci_postit_state.notes;
                            if (!notes) return;
                            Object.keys(notes).forEach(k => {
                                try { updateConnector(k); } catch(_) {}
                            });
                        } catch(_) { window.__ci_postit_scroll_state.rafPending = false; }
                    });
                }
            } catch(_) {}

            // reset accumulation after a short idle — when idle, perform a
            // final update and reveal connectors in their correct positions
            if (window.__ci_postit_scroll_state.timer) clearTimeout(window.__ci_postit_scroll_state.timer);
            window.__ci_postit_scroll_state.timer = setTimeout(() => {
                window.__ci_postit_scroll_state.acc = 0;
                window.__ci_postit_scroll_state.timer = null;
                try {
                    // Final layout sync then reveal
                    requestAnimationFrame(() => {
                        try {
                            const notes = window.__ci_postit_state && window.__ci_postit_state.notes;
                            if (!notes) {
                                window.__ci_postit_scroll_state.scrolling = false;
                                return;
                            }
                            Object.keys(notes).forEach(k => { try { updateConnector(k); } catch(_) {} });
                            showAllConnectors();
                        } catch(_) { window.__ci_postit_scroll_state.scrolling = false; }
                    });
                } catch(_) { window.__ci_postit_scroll_state.scrolling = false; }
            }, SCROLL_RESET_MS);
        } catch (_) {}
    }

    try {
        window.addEventListener && window.addEventListener('scroll', onPageScroll, { passive: true });
    } catch (_) {}

    // Also listen for wheel/touch/key interactions which may scroll
    // nested panels (cookie popups) so connectors fade out during the
    // interaction and reappear after recalculation.
    try {
        const onInteractionForScroll = (ev) => {
            try {
                if (!window.__ci_postit_scroll_state.scrolling) hideAllConnectors();

                if (!window.__ci_postit_scroll_state.rafPending) {
                    window.__ci_postit_scroll_state.rafPending = true;
                    requestAnimationFrame(() => {
                        try {
                            window.__ci_postit_scroll_state.rafPending = false;
                            const notes = window.__ci_postit_state && window.__ci_postit_state.notes;
                            if (!notes) return;
                            Object.keys(notes).forEach(k => { try { updateConnector(k); } catch(_) {} });
                        } catch(_) { window.__ci_postit_scroll_state.rafPending = false; }
                    });
                }

                if (window.__ci_postit_scroll_state.timer) clearTimeout(window.__ci_postit_scroll_state.timer);
                window.__ci_postit_scroll_state.timer = setTimeout(() => {
                    try { const notes = window.__ci_postit_state && window.__ci_postit_state.notes; if (notes) Object.keys(notes).forEach(k => { try { updateConnector(k); } catch(_) {} }); showAllConnectors(); } catch(_) {}
                    try { window.__ci_postit_scroll_state.timer = null; } catch(_) {}
                }, SCROLL_RESET_MS);
            } catch(_) {}
        };

        document.addEventListener && document.addEventListener('wheel', onInteractionForScroll, { passive: true, capture: true });
        document.addEventListener && document.addEventListener('touchmove', onInteractionForScroll, { passive: true, capture: true });
        document.addEventListener && document.addEventListener('keydown', (ev) => {
            try {
                const keys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End',' '];
                if (keys.indexOf(ev.key) !== -1) onInteractionForScroll(ev);
            } catch(_) {}
        }, { passive: true, capture: true });
    } catch (_) {}

// Also update connectors on resize/orientation changes so lines remain aligned
try {
    window.addEventListener && window.addEventListener('resize', () => {
        try {
            if (window.__ci_postit_state && window.__ci_postit_state.notes) {
                Object.keys(window.__ci_postit_state.notes).forEach(k => { try { updateConnector(k); } catch(_) {} });
            }
        } catch (_) {}
    }, { passive: true });
    window.addEventListener && window.addEventListener('orientationchange', () => {
        try { if (window.__ci_postit_state && window.__ci_postit_state.notes) Object.keys(window.__ci_postit_state.notes).forEach(k => { try { updateConnector(k); } catch(_) {} }); } catch(_) {}
    }, { passive: true });
} catch (_) {}

// Watch for DOM mutations that may affect layout (e.g., cookie popups,
// embedded panels). Throttle updates with RAF so connectors stay in sync
// without overwhelming the main thread.
try {
    if (!window.__ci_postit_mutation_observer) {
        const mo = new MutationObserver((mutations) => {
            try {
                if (!window.__ci_postit_scroll_state.rafPending) {
                    window.__ci_postit_scroll_state.rafPending = true;
                    requestAnimationFrame(() => {
                        try {
                            window.__ci_postit_scroll_state.rafPending = false;
                            const notes = window.__ci_postit_state && window.__ci_postit_state.notes;
                            if (!notes) return;
                            Object.keys(notes).forEach(k => { try { updateConnector(k); } catch(_) {} });
                        } catch(_) { window.__ci_postit_scroll_state.rafPending = false; }
                    });
                }
            } catch(_) {}
        });
        try { mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style','class','hidden'] }); } catch(_) {}
        window.__ci_postit_mutation_observer = mo;
    }
} catch (_) {}
}

/**
 * Creates a new Post-It note and connects it to a target element.
 */
export function createPostIt(text, targetEl, options = {}) {
    const state = window.__ci_postit_state;
    const id = 'ci-postit-' + (state.count++);
    
    const note = document.createElement('div');
    note.className = 'ci-postit';
    note.id = id;
    note.setAttribute('data-ci-id', id);

    const header = document.createElement('div');
    header.className = 'ci-postit-header';
    header.style.cursor = 'move';

    const close = document.createElement('button');
    close.className = 'ci-postit-close';
    close.textContent = '×';
    // Undo / Redo buttons
    const undoBtn = document.createElement('button');
    undoBtn.className = 'ci-postit-undo';
    undoBtn.textContent = '◀';
    undoBtn.title = 'Undo followup';
    const redoBtn = document.createElement('button');
    redoBtn.className = 'ci-postit-redo';
    redoBtn.textContent = '▶';
    redoBtn.title = 'Redo followup';
    
    const body = document.createElement('div');
    body.className = 'ci-postit-body';
    body.innerHTML = text; // Using innerHTML to allow <b> tags from sanitizer

    // We'll group title + undo/redo on the left, close on the right
    note.appendChild(header);
    note.appendChild(body);
    document.body.appendChild(note);

    // Apply colors and initial styles
    const pal = randomPastel();
    Object.assign(note.style, {
        background: pal.bg,
        border: `1px solid ${pal.border}`,
        color: pal.fg,
        position: 'fixed',
        maxWidth: '320px',
        zIndex: '2147483647',
        opacity: '0',
        transition: 'opacity 220ms ease'
    });

    // Set Title (use a span so we can style it) and group with undo/redo
    const rawTitle = (options.title || '').toString().trim();
    const titleSpan = document.createElement('span');
    titleSpan.className = 'ci-postit-title';
    titleSpan.textContent = rawTitle || `Note ${state.count}`;

    const leftWrap = document.createElement('div');
    leftWrap.style.display = 'flex';
    leftWrap.style.alignItems = 'center';
    leftWrap.style.gap = '6px';
    leftWrap.appendChild(titleSpan);
    leftWrap.appendChild(undoBtn);
    leftWrap.appendChild(redoBtn);
    header.appendChild(leftWrap);
    header.appendChild(close);

    // Create SVG Connector
    const svg = ensureConnectorSVG();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', 'rgba(60,60,60,0.7)');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '4 4');
    line.setAttribute('id', id + '-line');
    svg.appendChild(line);
    // Ensure connector line is visible by default and respects scroll-hidden state
    try {
        line.style.opacity = '1';
        line.style.transition = line.style.transition || 'opacity 220ms ease';
        if (window.__ci_postit_scroll_state && window.__ci_postit_scroll_state.scrolling) {
            // already in scrolling state - keep hidden until scroll settles
            line.style.opacity = '0';
            setTimeout(() => { try { line.style.display = 'none'; } catch(_) {} }, 220);
        }
    } catch (_) {}

    // Save to state (capture original background so we can restore it)
    const origBackground = (targetEl && targetEl.style) ? targetEl.style.background : '';
    // initialize history so followups replace the body but remain navigable
    state.notes[id] = { note, line, targetEl, parentId: options.parentId || null, origBackground,
        bodyEl: body, history: [body.innerHTML], historyIndex: 0, followupCount: 0,
        undoBtn, redoBtn };

    // Attach a ResizeObserver to the target and the note so connector lines
    // update when element sizes change (helpful for overlays and popup panels).
    try {
        const roCb = () => { try { updateConnector(id); } catch(_) {} };
        const RO = window.ResizeObserver;
        if (RO) {
            const ro = new RO((entries) => { try { roCb(); } catch(_) {} });
            try { if (targetEl && targetEl.nodeType === 1) ro.observe(targetEl); } catch(_) {}
            try { ro.observe(note); } catch(_) {}
            state.notes[id].resizeObserver = ro;
        }
    } catch (_) {}

    // Wire up undo/redo button behavior
    try {
        const entryRef = state.notes[id];
        undoBtn.onclick = (ev) => { ev.stopPropagation(); try { undoFollowup(id); } catch(_) {} };
        redoBtn.onclick = (ev) => { ev.stopPropagation(); try { redoFollowup(id); } catch(_) {} };
        updateUndoRedoButtons(entryRef);
    } catch (_) {}

    // Apply highlight to the target element using the same pastel background
    if (targetEl && targetEl.style) {
        try {
            targetEl.setAttribute('data-ci-postit-id', id);
            // apply with a smooth transition
            targetEl.style.transition = (targetEl.style.transition || '') + ' background-color 220ms ease';
            targetEl.style.background = pal.bg;
        } catch (_) {}
    }

    // Positioning Logic
    requestAnimationFrame(() => {
        positionNote(note, targetEl);
        note.style.opacity = '1';
        updateConnector(id);
        // notify inspector that a new post-it was placed so overlays can sync
        try { document.dispatchEvent(new CustomEvent('ci-postit-updated', { detail: { id } })); } catch (_) {}
        // signal creation so inspector can reliably re-position overlay/edit UI
        try { document.dispatchEvent(new CustomEvent('ci-postit-created', { detail: { id } })); } catch (_) {}
    });

    // Event: Close (fade out then remove)
    close.onclick = (e) => {
        e.stopPropagation();
        const entry = state.notes[id];
        // notify inspector that this post-it is being removed so it can hide overlays
        try { document.dispatchEvent(new CustomEvent('ci-postit-removed', { detail: { id } })); } catch (_) {}
        // restore highlighted element background if present and no other post-it highlights it
        if (entry && entry.targetEl) {
            try {
                const target = entry.targetEl;
                // check if any other note still references this same element
                const others = Object.keys(window.__ci_postit_state.notes || {}).filter(k => k !== id);
                let otherReferences = false;
                for (const k of others) {
                    const other = window.__ci_postit_state.notes[k];
                    if (other && other.targetEl === target) { otherReferences = true; break; }
                }
                if (!otherReferences) {
                    target.style.background = entry.origBackground || '';
                    try { target.removeAttribute && target.removeAttribute('data-ci-postit-id'); } catch(_) {}
                } else {
                    // if data attr still points to this id, clear it to allow newer notes to take precedence
                    try {
                        if (target.getAttribute && target.getAttribute('data-ci-postit-id') === id) target.removeAttribute('data-ci-postit-id');
                    } catch(_) {}
                }
            } catch (_) {}
        }
        // fade out
        note.style.opacity = '0';
        try { line.remove(); } catch(_) {}
        setTimeout(() => {
            try { note.remove(); } catch(_) {}
            try { const entry = state.notes[id]; if (entry && entry.resizeObserver) entry.resizeObserver.disconnect(); } catch(_) {}
            delete state.notes[id];
            if (window.__ci_postit_state && window.__ci_postit_state.currentParent === id) {
                window.__ci_postit_state.currentParent = null;
            }
        }, 220);
    };

    // Make the whole note draggable at all times (excluding the close button)
    note.style.cursor = 'move';
    note.addEventListener('pointerdown', (e) => {
        if (e.button && e.button !== 0) return; // only left-click
        // Ignore pointerdown on interactive controls so their native events still fire
        if (e.target && e.target.closest && (e.target.closest('.ci-postit-close') || e.target.closest('.ci-postit-undo') || e.target.closest('.ci-postit-redo') || e.target.closest('button, a, input, textarea, select'))) return;
        e.preventDefault();

        const rect = note.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const offsetX = startX - rect.left;
        const offsetY = startY - rect.top;
        let started = false;

        function startDrag(ev) {
            started = true;
            note.classList.add('ci-postit-dragging');
            try { document.dispatchEvent(new CustomEvent('ci-postit-dragstart', { detail: { id } })); } catch (_) {}
        }

        function onMove(ev) {
            ev.preventDefault();
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            const distSq = dx*dx + dy*dy;
            if (!started && distSq > 36) { // 6px threshold
                startDrag(ev);
            }
            if (started) {
                // compute desired position then clamp to viewport so notes cannot be dragged off-screen
                const margin = 8;
                const desiredLeft = ev.clientX - offsetX;
                const desiredTop = ev.clientY - offsetY;
                const nRect = note.getBoundingClientRect();
                const clampedLeft = Math.min(Math.max(margin, desiredLeft), Math.max(margin, window.innerWidth - nRect.width - margin));
                const clampedTop = Math.min(Math.max(margin, desiredTop), Math.max(margin, window.innerHeight - nRect.height - margin));
                note.style.left = `${clampedLeft}px`;
                note.style.top = `${clampedTop}px`;
                updateConnector(id);
            }
        }

        function onUp(ev) {
            ev.preventDefault();
            try { if (note.releasePointerCapture) note.releasePointerCapture(ev.pointerId); } catch (_e) {}
            if (started) {
                note.classList.remove('ci-postit-dragging');
                try { document.dispatchEvent(new CustomEvent('ci-postit-dragend', { detail: { id } })); } catch (_) {}
            }
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        }

        try { if (note.setPointerCapture) note.setPointerCapture(e.pointerId); } catch (_e) {}
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp, { passive: false });
    }, { passive: false });

    return id;
}

/**
 * Appends a conversation thread to an existing note.
 */
export function appendFollowupToNote(parentId, text, userPrompt) {
    const entry = window.__ci_postit_state.notes[parentId];
    if (!entry || !entry.note) return;
    // create a compact follow-up representation and push into history
    entry.followupCount = (entry.followupCount || 0) + 1;
    const followupHtml = `<div style="font-weight:600; font-size:12px;">Follow-up ${entry.followupCount}: ${userPrompt}</div><div class="ci-postit-followup-body" style="margin-top:4px;">${text}</div>`;
    // truncate any forward history when pushing a new followup
    if (entry.historyIndex < entry.history.length - 1) {
        entry.history = entry.history.slice(0, entry.historyIndex + 1);
    }
    entry.history.push(followupHtml);
    entry.historyIndex = entry.history.length - 1;
    // replace the body with the latest followup using a fade; overlay updates after fade
    try { setBodyHtmlWithFade(entry, entry.history[entry.historyIndex], parentId); } catch(_) {}
    updateUndoRedoButtons(entry);
}

function updateUndoRedoButtons(entry) {
    try {
        if (!entry) return;
        const canUndo = (entry.historyIndex > 0);
        const canRedo = (entry.historyIndex < entry.history.length - 1);
        if (entry.undoBtn) entry.undoBtn.disabled = !canUndo;
        if (entry.redoBtn) entry.redoBtn.disabled = !canRedo;
    } catch (_) {}
}

export function undoFollowup(parentId) {
    const entry = window.__ci_postit_state.notes[parentId];
    if (!entry) return;
    if (entry.historyIndex <= 0) return;
    entry.historyIndex = Math.max(0, entry.historyIndex - 1);
    try { setBodyHtmlWithFade(entry, entry.history[entry.historyIndex], parentId); } catch(_) {}
    updateUndoRedoButtons(entry);
}

export function redoFollowup(parentId) {
    const entry = window.__ci_postit_state.notes[parentId];
    if (!entry) return;
    if (entry.historyIndex >= entry.history.length - 1) return;
    entry.historyIndex = Math.min(entry.history.length - 1, entry.historyIndex + 1);
    try { setBodyHtmlWithFade(entry, entry.history[entry.historyIndex], parentId); } catch(_) {}
    updateUndoRedoButtons(entry);
}

function setBodyHtmlWithFade(entry, html, id) {
    if (!entry || !entry.bodyEl) return;
    const el = entry.bodyEl;
    try {
        el.classList.add('ci-body-fade');
        // Wait for fade-out to complete (match CSS 160ms) then swap content and fade in
        setTimeout(() => {
            try { el.innerHTML = html; } catch(_) {}
            // trigger fade-in by removing the fade class
            requestAnimationFrame(() => { try { el.classList.remove('ci-body-fade'); } catch(_) {} });
            // After content swaps and fade-in triggered, update connector and notify inspector
            try { if (id) updateConnector(id); } catch(_) {}
            try { if (id) document.dispatchEvent(new CustomEvent('ci-postit-updated', { detail: { id } })); } catch(_) {}
            // Clear any lingering text selection and temporary highlights (e.g., when dropping prompts)
            try {
                const sel = window.getSelection && window.getSelection();
                if (sel && sel.removeAllRanges) sel.removeAllRanges();
            } catch(_) {}
            try {
                document.querySelectorAll && document.querySelectorAll('.ci-temp-highlight').forEach(el => el.classList.remove('ci-temp-highlight'));
            } catch(_) {}
            try {
                // also clear selection in the edit input if present
                const input = document.getElementById && document.getElementById('prompt-input-field');
                if (input) { try { input.selectionStart = input.selectionEnd; } catch(_) {} }
            } catch(_) {}
        }, 160);
    } catch (_) {}
}


/**
 * Recalculates the SVG line coordinates between a note and its target.
 */
export function updateConnector(id) {
    const entry = window.__ci_postit_state.notes[id];
    if (!entry || !entry.targetEl) return;

    const { note, line, targetEl } = entry;
    const tRect = targetEl.getBoundingClientRect();
    const nRect = note.getBoundingClientRect();

    // Center points
    const cpN = { x: nRect.left + nRect.width / 2, y: nRect.top + nRect.height / 2 };
    const cpT = { x: tRect.left + tRect.width / 2, y: tRect.top + tRect.height / 2 };

    line.setAttribute('x1', cpT.x);
    line.setAttribute('y1', cpT.y);
    line.setAttribute('x2', cpN.x);
    line.setAttribute('y2', cpN.y);
}

// --- Internal Helpers ---

function positionNote(note, targetEl) {
    // Place the note in a safe area near the middle of the screen,
    // but nudged toward the target element so it's visually related.
    const nRect = note.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Center position for the note (ensure it fits)
    const centerX = Math.min(Math.max(margin, (vw - nRect.width) / 2), vw - nRect.width - margin);
    const centerY = Math.min(Math.max(margin, (vh - nRect.height) / 2), vh - nRect.height - margin);

    if (!targetEl) {
        note.style.left = `${centerX}px`;
        note.style.top = `${centerY}px`;
        return;
    }

    try {
        const tRect = targetEl.getBoundingClientRect();
        const tx = tRect.left + tRect.width / 2;
        const ty = tRect.top + tRect.height / 2;

        // Vector from center to target; we'll move the note toward the target
        const cx = centerX + nRect.width / 2;
        const cy = centerY + nRect.height / 2;
        const dx = tx - cx;
        const dy = ty - cy;
        const dist = Math.hypot(dx, dy) || 1;

        // Limit how far from center we place the note (keeps it in safe area)
        const maxOffset = 220; // pixels
        const move = Math.min(dist, maxOffset);
        const ux = dx / dist;
        const uy = dy / dist;

        let left = centerX + ux * move - 0; // already accounts for centerX
        let top = centerY + uy * move - 0;

        // Clamp so note doesn't overflow viewport
        left = Math.min(Math.max(margin, left), vw - nRect.width - margin);
        top = Math.min(Math.max(margin, top), vh - nRect.height - margin);

        note.style.left = `${left}px`;
        note.style.top = `${top}px`;
    } catch (_) {
        note.style.left = `${centerX}px`;
        note.style.top = `${centerY}px`;
    }
}

function randomPastel() {
    const hue = Math.floor(Math.random() * 360);
    return {
        bg: `hsl(${hue}, 70%, 90%)`,
        border: `hsl(${hue}, 40%, 70%)`,
        fg: `hsl(${hue}, 20%, 20%)`
    };
}

function ensureConnectorSVG() {
    let svg = document.getElementById('ci-connector-svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'ci-connector-svg';
        Object.assign(svg.style, {
            position: 'fixed', left: 0, top: 0, width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: '2147483646'
        });
        document.body.appendChild(svg);
    }
    return svg;
}