import { IDS, CLASSES } from '../types.js';
import { createOverlay, createToggleButton, createEditContainer, injectShakeStyle } from './ui-factory.js';
import { adjustTextareaHeight, sanitizeServerText } from './utils.js';
import { createPostIt, appendFollowupToNote } from './postits.js';

let active = false;
let lastHovered = null;
let selectedElement = null;
let selectedTargetElement = null;

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
    
    const editContainer = document.getElementById(IDS.EDIT_CONTAINER);
    if (editContainer) editContainer.style.display = 'none';
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
    if (isInternalUI(e.target)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;

    selectedElement = el;
    selectedTargetElement = el;
    window.__ci_postit_state.currentParent = null; // New selection, clear parent
    
    showOverlayFor(el);
    openEditUI(e.clientX, e.clientY);
}

function isInternalUI(el) {
    const internalIds = Object.values(IDS);
    return internalIds.some(id => el.id === id || el.closest(`#${id}`)) || 
           el.closest(`.${CLASSES.POSTIT}`);
}

function showOverlayFor(el) {
    const overlay = document.getElementById(IDS.OVERLAY);
    const rect = el.getBoundingClientRect();
    
    Object.assign(overlay.style, {
        display: 'block',
        opacity: '1',
        left: `${rect.left + window.scrollX}px`,
        top: `${rect.top + window.scrollY}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        transform: 'scale(1.02)'
    });
}

function hideOverlay() {
    const overlay = document.getElementById(IDS.OVERLAY);
    if (overlay) overlay.style.display = 'none';
}

function openEditUI(x, y) {
    const container = document.getElementById(IDS.EDIT_CONTAINER);
    const input = document.getElementById(IDS.EDIT_INPUT);
    
    container.style.display = 'flex';
    container.style.left = `${x + 10}px`;
    container.style.top = `${y + 10}px`;
    
    input.value = '';
    input.focus();
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

        // Visual feedback: Thinking state
        submit.disabled = true;
        input.disabled = true;
        const spinner = form.querySelector('.ci-spinner');
        if (spinner) spinner.style.display = 'block';

        const prompt = constructPrompt(target, userInput);

        chrome.runtime.sendMessage({ action: 'ask', prompt }, response => {
            if (spinner) spinner.style.display = 'none';
            input.disabled = false;
            submit.disabled = false;

            if (response && response.ok) {
                const text = sanitizeServerText(response.text);
                if (parentId) {
                    appendFollowupToNote(parentId, text, userInput);
                } else {
                    const newId = createPostIt(text, target, { title: userInput });
                    window.__ci_postit_state.currentParent = newId;
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