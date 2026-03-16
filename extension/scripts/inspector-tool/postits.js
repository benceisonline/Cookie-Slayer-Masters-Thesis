// Ensure the state exists globally so it persists across imports
if (!window.__ci_postit_state) {
    window.__ci_postit_state = { count: 0, notes: {}, currentParent: null };
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
    
    const body = document.createElement('div');
    body.className = 'ci-postit-body';
    body.innerHTML = text; // Using innerHTML to allow <b> tags from sanitizer

    header.appendChild(close);
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

    // Set Title (use a span so we can style it)
    const rawTitle = (options.title || '').toString().trim();
    const titleSpan = document.createElement('span');
    titleSpan.className = 'ci-postit-title';
    titleSpan.textContent = rawTitle || `Note ${state.count}`;
    header.prepend(titleSpan);

    // Create SVG Connector
    const svg = ensureConnectorSVG();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', 'rgba(60,60,60,0.7)');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '4 4');
    line.setAttribute('id', id + '-line');
    svg.appendChild(line);

    // Save to state (capture original background so we can restore it)
    const origBackground = (targetEl && targetEl.style) ? targetEl.style.background : '';
    state.notes[id] = { note, line, targetEl, parentId: options.parentId || null, origBackground };

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
        if (e.target.closest && e.target.closest('.ci-postit-close')) return; // ignore clicks on close
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
                note.style.left = `${ev.clientX - offsetX}px`;
                note.style.top = `${ev.clientY - offsetY}px`;
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

    entry.followupCount = (entry.followupCount || 0) + 1;
    
    const container = document.createElement('div');
    container.className = 'ci-postit-followup';
    Object.assign(container.style, {
        marginTop: '8px',
        paddingTop: '6px',
        borderTop: '1px dashed rgba(0,0,0,0.1)'
    });

    container.innerHTML = `
        <div style="font-weight:600; font-size:12px;">Follow-up ${entry.followupCount}: ${userPrompt}</div>
        <div class="ci-postit-followup-body" style="margin-top:4px;">${text}</div>
    `;

    entry.note.appendChild(container);
    updateConnector(parentId);
    // notify others (inspector) that the post-it size/content changed
    try { document.dispatchEvent(new CustomEvent('ci-postit-updated', { detail: { id: parentId } })); } catch (_) {}
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
    const tRect = targetEl.getBoundingClientRect();
    // Place the note above the target element when possible
    const nRect = note.getBoundingClientRect();
    const left = tRect.left + window.scrollX;
    let top = tRect.top + window.scrollY - nRect.height - 12;
    if (top < 8) top = tRect.bottom + window.scrollY + 12; // fallback below if not enough space
    note.style.left = `${Math.max(8, left)}px`;
    note.style.top = `${top}px`;
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