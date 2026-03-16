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
        zIndex: '2147483647',
        opacity: '0',
        transition: 'opacity 220ms ease'
    });

    // Set Title
    const rawTitle = (options.title || '').toString().trim();
    header.prepend(document.createTextNode(rawTitle || `Note ${state.count}`));

    // Create SVG Connector
    const svg = ensureConnectorSVG();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('stroke', 'rgba(60,60,60,0.7)');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '4 4');
    line.setAttribute('id', id + '-line');
    svg.appendChild(line);

    // Save to state
    state.notes[id] = { note, line, targetEl, parentId: options.parentId || null };

    // Positioning Logic
    requestAnimationFrame(() => {
        positionNote(note, targetEl);
        note.style.opacity = '1';
        updateConnector(id);
    });

    // Event: Close
    close.onclick = (e) => {
        e.stopPropagation();
        note.remove();
        line.remove();
        delete state.notes[id];
    };

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
    note.style.left = `${tRect.right + 20}px`;
    note.style.top = `${tRect.top}px`;
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