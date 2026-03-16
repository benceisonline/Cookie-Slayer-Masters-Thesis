import { IDS, CLASSES } from '../types.js';
import { createOverlay, createToggleButton, createEditContainer, injectShakeStyle } from './ui-factory.js';
import { adjustTextareaHeight, sanitizeServerText } from './utils.js';
import { createPostIt, appendFollowupToNote } from './postits.js';

let active = false;
let lastHovered = null;
let selectedElement = null;
let selectedTargetElement = null;
let editWasOpen = false;

export function loadInspectorTool() {
    if (window.__inspectish_loaded) {
        console.log("Cookie Inspector already active.");
    } else {
        window.__inspectish_loaded = true;
        init();
    }
}

function init() {
    injectShakeStyle();
    createOverlay();
    createToggleButton(() => toggleActive());
    createEditContainer();
    
    if (!window.__ci_postit_state) {
        window.__ci_postit_state = { count: 0, notes: {}, currentParent: null };
    }

    setupFormLogic();
    // Listen for post-it drag events so the overlay can hide/show appropriately
    document.addEventListener('ci-postit-dragstart', handlePostitDragStart);
    document.addEventListener('ci-postit-dragend', handlePostitDragEnd);
    document.addEventListener('ci-postit-updated', handlePostitUpdated);
    document.addEventListener('ci-postit-removed', handlePostitRemoved);
}

function handlePostitUpdated(e) {
    const id = e && e.detail && e.detail.id;
    if (!id) return;
    const note = document.getElementById(id);
    if (!note) return;
    // If the inspector currently targets this post-it, update overlay after layout
    if (selectedTargetElement === note || (selectedTargetElement && selectedTargetElement.getAttribute && selectedTargetElement.getAttribute('data-ci-id') === id)) {
        // allow DOM to settle then reposition overlay
        setTimeout(() => showOverlayFor(note), 10);
    }
}

function handlePostitRemoved(e) {
    const id = e && e.detail && e.detail.id;
    if (!id) return;
    const note = document.getElementById(id);
    if (!note) return;
    if (selectedTargetElement === note || (selectedTargetElement && selectedTargetElement.getAttribute && selectedTargetElement.getAttribute('data-ci-id') === id)) {
        // hide overlay and close edit UI
        hideOverlay();
        try { closeEditUI(); } catch (_) {}
        selectedTargetElement = null;
        selectedElement = null;
        if (window.__ci_postit_state) window.__ci_postit_state.currentParent = null;
    }
}

function handlePostitDragStart(e) {
    const id = e && e.detail && e.detail.id;
    if (!id) return;
    const note = document.getElementById(id);
    if (!note) return;
    // remember whether the edit UI was open and hide it while dragging
    const editContainer = document.getElementById(IDS.EDIT_CONTAINER);
    editWasOpen = !!(editContainer && editContainer.style.display !== 'none');
    closeEditUI();
    hideOverlay();
}

function handlePostitDragEnd(e) {
    const id = e && e.detail && e.detail.id;
    if (!id) return;
    const note = document.getElementById(id);
    if (!note) return;
    if (active && editWasOpen) {
        // allow layout to settle then restore the edit UI positioned for this note
        setTimeout(() => {
            showOverlayFor(note);
            openEditUI(null, null, note);
        }, 10);
    }
    editWasOpen = false;
}

function toggleActive() {
    active ? disable() : enable();
}

function enable() {
    if (active) return;
    active = true;
    const btn = document.getElementById(IDS.TOGGLE);
    if (btn) btn.setAttribute('data-active', 'true');

    document.addEventListener('mousemove', onMouseMove, { passive: true, capture: true });
    document.addEventListener('click', onClickCapture, true);
}

function disable() {
    if (!active) return;
    active = false;
    const btn = document.getElementById(IDS.TOGGLE);
    if (btn) btn.removeAttribute('data-active');

    document.removeEventListener('mousemove', onMouseMove, { capture: true });
    document.removeEventListener('click', onClickCapture, true);
    
    hideOverlay();
    if (lastHovered) {
        lastHovered.classList.remove(CLASSES.HOVER);
        lastHovered = null;
    }
    
    closeEditUI();
}

function onMouseMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el === lastHovered) return;
    
    if (lastHovered) lastHovered.classList.remove(CLASSES.HOVER);
    
    // Don't highlight our own UI elements
    if (el && active && !isInternalUI(el)) {
        el.classList.add(CLASSES.HOVER);
        lastHovered = el;
    }
}

function onClickCapture(e) {
    // If the post-it close button was clicked, allow the event to proceed so the close handler runs
    if (e.target && e.target.closest && e.target.closest('.ci-postit-close')) return;

    // If a post-it was clicked, treat it as the selection: open prompt above it
    const postit = e.target.closest && e.target.closest('.ci-postit');
    if (postit) {
        e.preventDefault();
        e.stopImmediatePropagation();

        selectedElement = postit;
        selectedTargetElement = postit;
        const pid = postit.getAttribute('data-ci-id');
        window.__ci_postit_state.currentParent = pid || null;

        showOverlayFor(postit);
        openEditUI(null, null, postit);
        return;
    }

    if (isInternalUI(e.target)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;

    selectedElement = el;
    selectedTargetElement = el;
    window.__ci_postit_state.currentParent = null; // New selection, clear parent
    
    showOverlayFor(el);
    // Open the edit UI in a predetermined spot above the selected element
    openEditUI(null, null, el);
}

function isInternalUI(el) {
    const internalIds = Object.values(IDS);
    return internalIds.some(id => el.id === id || el.closest(`#${id}`));
}

function showOverlayFor(el) {
    const overlay = document.getElementById(IDS.OVERLAY);
    const rect = el.getBoundingClientRect();
    // ensure visible and positioned with fade in
    // Draw rectangle around element with a 5px gap on each side
    const gap = 2;
    const width = rect.width + gap * 2;
    const height = rect.height + gap * 2;
    let left = rect.left - gap;
    let top = rect.top - gap;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // clamp within viewport with small margins
    left = Math.max(6, Math.min(left, vw - width - 6));
    top = Math.max(6, Math.min(top, vh - height - 6));
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    overlay.style.display = 'block';
    // force reflow then set opacity for transition
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
    overlay.style.transform = 'scale(1.02)';
}

function hideOverlay() {
    const overlay = document.getElementById(IDS.OVERLAY);
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.transform = 'scale(1)';
    setTimeout(() => { if (overlay && overlay.style) overlay.style.display = 'none'; }, 220);
}

function openEditUI(x, y, el) {
    const container = document.getElementById(IDS.EDIT_CONTAINER);
    const input = document.getElementById(IDS.EDIT_INPUT);
    // position and fade in
    container.style.display = 'flex';
    // allow layout to compute sizes
    void container.offsetWidth;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    let left, top;
    if (el) {
        const rect = el.getBoundingClientRect();
        // Place the edit UI centered horizontally above the element when possible.
        const cW = container.offsetWidth || 320;
        const cH = container.offsetHeight || 56;
        left = rect.left + (rect.width - cW) / 2;
        // Position above element
        top = rect.top - cH - 8;
        // If not enough room above, overlap the top edge of the element instead
        if (top < margin) top = Math.max(margin, rect.top);
    } else {
        // x,y are client coordinates; position relative to click
        left = (x || 0) + 10;
        top = (y || 0) + 10;
    }

    const maxLeft = scrollX + vw - container.offsetWidth - margin;
    const maxTop = scrollY + vh - container.offsetHeight - margin;

    // Clamp left within viewport bounds (container is fixed so use viewport coords)
    left = Math.min(Math.max(margin, left), vw - container.offsetWidth - margin);
    // Clamp top within viewport bounds
    top = Math.min(Math.max(margin, top), vh - container.offsetHeight - margin);

    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
    // trigger opacity/transform transition (use inline styles so it works regardless of external CSS)
    void container.offsetWidth;
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';

    input.value = '';
    input.focus();
}

function closeEditUI() {
    const container = document.getElementById(IDS.EDIT_CONTAINER);
    if (!container) return;
    // animate out then hide
    container.style.opacity = '0';
    container.style.transform = 'translateY(-4px)';
    setTimeout(() => { if (container) container.style.display = 'none'; }, 220);
}

function setupFormLogic() {
    const form = document.getElementById(IDS.EDIT_FORM);
    const input = document.getElementById(IDS.EDIT_INPUT);
    const submit = document.getElementById('ci-edit-submit');

    input.addEventListener('input', () => {
        adjustTextareaHeight(input);
        submit.disabled = !input.value.trim();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = input.value.trim();
        if (!userInput) return;

        const target = selectedTargetElement || selectedElement;
        const parentId = window.__ci_postit_state.currentParent;

        // Visual feedback: Thinking state — show spinner in place of label
        submit.disabled = true;
        input.disabled = true;
        // change placeholder to indicate work in progress and clear current value so placeholder is visible
        const priorPlaceholder = input.placeholder;
        input.placeholder = 'Working on it...';
        input.value = '';
        try { adjustTextareaHeight(input); } catch (_) {}
        const spinner = form.querySelector('.ci-spinner');
        const label = submit.querySelector('.ci-edit-label');
        if (label) label.style.display = 'none';
        if (spinner) spinner.style.display = 'block';
        // mark button as loading so CSS can adjust background/appearance
        submit.classList.add('ci-loading');

        const prompt = constructPrompt(target, userInput);

        chrome.runtime.sendMessage({ action: 'ask', prompt }, response => {
            if (spinner) spinner.style.display = 'none';
            if (label) label.style.display = '';
            input.disabled = false;
            submit.disabled = false;
            submit.classList.remove('ci-loading');
            // restore placeholder
            input.placeholder = priorPlaceholder || 'What can I help you with?';

            if (response && response.ok) {
                const text = sanitizeServerText(response.text);
                if (parentId) {
                    appendFollowupToNote(parentId, text, userInput);
                } else {
                    const newId = createPostIt(text, target, { title: userInput });
                    window.__ci_postit_state.currentParent = newId;
                    // Ensure overlay and edit UI are placed over the newly created note
                    const note = document.getElementById(newId);
                    if (note) {
                        selectedElement = note;
                        selectedTargetElement = note;
                        // allow the note to be laid out then show overlay and open edit UI above it
                        setTimeout(() => {
                            showOverlayFor(note);
                            openEditUI(null, null, note);
                        }, 10);
                    }
                }
                // Success visual flash
                flashOverlay('rgba(46, 204, 113, 0.95)');
            } else {
                flashOverlay('rgba(231, 76, 60, 0.95)');
                input.classList.add(CLASSES.SHAKE);
                setTimeout(() => input.classList.remove(CLASSES.SHAKE), 400);
            }
        });
    });
}

function constructPrompt(el, query) {
    const text = el.innerText || el.value || 'Selected element';
    return `Context: Website "${document.title}". User is looking at this element: "${text.substring(0, 500)}". Question: ${query}`;
}

function flashOverlay(color) {
    const overlay = document.getElementById(IDS.OVERLAY);
    if (!overlay) return;
    const original = overlay.style.borderColor;
    overlay.style.borderColor = color;
    setTimeout(() => { overlay.style.borderColor = original; }, 1000);
}