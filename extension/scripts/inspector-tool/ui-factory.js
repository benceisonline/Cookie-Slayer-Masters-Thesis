import { IDS, STYLES } from '../common/types.js';
import { setAction } from './inspector.js';

// Create the main inspector overlay element.
// Returns a fixed-position div used to draw a highlighted rectangle
// around the selected page element. The overlay is appended to the
// document and returned for further manipulation.
export function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = IDS.OVERLAY;
    Object.assign(overlay.style, {
        position: 'fixed',
        zIndex: STYLES.Z_INDEX,
        pointerEvents: 'none',
        border: `2px solid ${STYLES.PRIMARY_BLUE}`,
        background: STYLES.BG_BLUE,
        boxSizing: 'border-box',
        display: 'none',
        opacity: '0',
        transform: 'scale(1)',
        transition: 'opacity 180ms ease, transform 160ms ease',
        borderRadius: '10px'
    });
    document.documentElement.appendChild(overlay);
    return overlay;
}

// Create a small toggle button attached to the page. Calls `onClick`
// when pressed to enable/disable the inspector.
export function createToggleButton(onClick) {
    const btn = document.createElement('button');
    btn.id = IDS.TOGGLE;
    btn.textContent = '🍪';
    btn.title = 'CookieSlayer';
    Object.assign(btn.style, {
        position: 'fixed',
        right: '18px',
        top: '18px',
        zIndex: STYLES.Z_INDEX,
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        border: '1px solid rgba(0,0,0,0.1)',
        background: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        cursor: 'grab',
        fontSize: '36px',
        lineHeight: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0',
        userSelect: 'none'
    });

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;
    let targetX = 0;
    let targetY = 0;
    let frameId = null;

    btn.style.touchAction = 'none';

    const applyPosition = () => {
        btn.style.left = `${Math.max(4, Math.min(window.innerWidth - btn.offsetWidth - 4, targetX))}px`;
        btn.style.top = `${Math.max(4, Math.min(window.innerHeight - btn.offsetHeight - 4, targetY))}px`;
        btn.style.right = 'auto';
        frameId = null;
    };

    const schedulePosition = () => {
        if (frameId !== null) return;
        frameId = requestAnimationFrame(applyPosition);
    };

    btn.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        btn.setPointerCapture(event.pointerId);
        btn.style.cursor = 'grabbing';
        offsetX = event.clientX - btn.getBoundingClientRect().left;
        offsetY = event.clientY - btn.getBoundingClientRect().top;
    });

    btn.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        targetX = event.clientX - offsetX;
        targetY = event.clientY - offsetY;
        schedulePosition();
    });

    btn.addEventListener('pointerup', (event) => {
        if (!dragging) return;
        dragging = false;
        btn.style.cursor = 'grab';
        btn.releasePointerCapture(event.pointerId);
    });

    btn.addEventListener('pointercancel', () => {
        dragging = false;
        btn.style.cursor = 'grab';
    });
    const setActive = (active) => {
        if (active) {
            btn.style.background = '#b8ef9e';
            btn.style.color = '#fff';
            btn.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
            btn.dataset.active = 'true';
        } else {
            btn.style.background = '#fff';
            btn.style.color = '#000';
            btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.12)';
            btn.dataset.active = 'false';
        }
    };

    setActive(false);

    const infoButton = document.createElement('button');
    infoButton.id = IDS.INFO_ICON;
    infoButton.textContent = 'i';
    Object.assign(infoButton.style, {
        position: 'fixed',
        right: '9px',
        top: '14px',
        zIndex: STYLES.Z_INDEX,
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: '1px solid rgba(0,0,0,0.15)',
        background: '#fff',
        color: '#333',
        fontSize: '11px',
        fontWeight: '700',
        lineHeight: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
        padding: '0',
        userSelect: 'none'
    });

    infoButton.title = 'Open welcome page';
    infoButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        window.postMessage({ action: 'show-welcome-overlay' }, '*');
    });

    btn.addEventListener('click', (event) => {
        if (dragging) return;
        const newActive = btn.dataset.active !== 'true';
        setActive(newActive);
        onClick(event, newActive);
    }, true);

    document.documentElement.appendChild(btn);
    document.documentElement.appendChild(infoButton);
}

// Build and append the edit container UI used for composing prompts.
// This creates the suggestions list, pager controls, trash target,
// textarea form, and wires drag/drop, click, and localStorage
// persistence behaviors.
export function createEditContainer() {
    const container = document.createElement('div');
    container.id = IDS.EDIT_CONTAINER;
    Object.assign(container.style, {
        position: 'fixed',
        zIndex: STYLES.Z_INDEX,
        display: 'none',
        background: 'rgba(255,255,255,0.98)',
        padding: '6px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        opacity: '0',
        transform: 'translateY(-4px)',
        transition: 'opacity 200ms ease, transform 160ms ease',
        minWidth: '320px',
        flexDirection: 'column',
        alignItems: 'stretch',
        boxSizing: 'border-box',
        fontFamily: 'var(--ci-font)'
    });

    container.innerHTML = `
        <div class="ci-suggestions" style="display:flex; flex-direction:column; gap:6px; margin-bottom:8px; width:100%;"></div>
        <form id="${IDS.EDIT_FORM}" style="display:flex; align-items:center; gap:8px; flex-wrap:nowrap;">
            <textarea id="${IDS.EDIT_INPUT}" placeholder="What can I help you with?" style="flex:1 1 auto; min-width:200px; width:100%; max-width:none; padding:8px; border-radius:6px; border:1px solid #ccc; box-sizing:border-box;"></textarea>
            <button type="submit" id="ci-edit-submit" style="margin-left:6px; padding:6px 10px; border-radius:6px; background:#3498db; color:#fff; display:flex; align-items:center; white-space:nowrap;" disabled>
                <span class="ci-edit-label">Send</span>
                <div class="ci-spinner" style="display:none; margin-left:8px"></div>
            </button>
        </form>
        <div class="ci-disclaimer" style="margin-top:8px; font-size:12px; color:#6b7280; line-height:1.2; font-family:inherit;">
            I try my best, but responses may be inaccurate.
        </div>
    `;
    document.documentElement.appendChild(container);

    // Wire up the suggestion buttons: make dragstart set plain text, click inserts into textarea
    try {
        const input = container.querySelector(`#${IDS.EDIT_INPUT}`);
        const suggestionsContainer = container.querySelector('.ci-suggestions');

        // Helper to create a suggestion button and append it to the container
        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'ci-suggestions-list ci-slide-visible';
        suggestionsContainer.appendChild(suggestionsList);

        // Return a random animal emoji from a small palette. Used to
        // decorate user-saved prompts when no explicit emoji is present.
        const randomAnimalEmoji = () => {
            const animals = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🦁','🐯','🦄','🐸','🐵','🐧','🐤','🦉','🐴','🐙'];
            return animals[Math.floor(Math.random() * animals.length)];
        };

        // Generate a pastel color trio (bg, border, fg) using a random
        // hue. Used to highlight inserted text and for post-it styling.
        const randomPastel = () => {
            const hue = Math.floor(Math.random() * 360);
            return { bg: `hsl(${hue}, 70%, 90%)`, border: `hsl(${hue}, 40%, 70%)`, fg: `hsl(${hue}, 20%, 20%)` };
        };

        // If a string begins with a non-alphanumeric token (emoji-like),
        // remove that leading token and return the remainder. Used for
        // normalizing pasted text when comparing against stored prompts.
        const stripEmojiPrefix = (s) => {
            if (!s || typeof s !== 'string') return '';
            const parts = s.split(' ');
            if (parts.length > 1 && /[^a-zA-Z0-9]/.test(parts[0])) return parts.slice(1).join(' ');
            return s;
        };

        // Create a single suggestion button node for `prompt` (string or
        // {text,emoji}). Buttons are draggable, clickable, and expose the
        // suggestion text via `data-suggestion` for drop handling.
        const createSuggestionButton = (prompt) => {
            const text = (typeof prompt === 'string') ? prompt : (prompt && prompt.text) || '';
            const emoji = (typeof prompt === 'object' && prompt && prompt.emoji) ? prompt.emoji : '';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ci-suggestion';
            btn.setAttribute('draggable', 'true');
            const dsAttr = `${emoji ? emoji + ' ' : ''}${text}`.trim();
            btn.setAttribute('data-suggestion', dsAttr);
            btn.title = 'Drag this into the input';
            btn.style.width = '100%';
            btn.style.textAlign = 'left';
            btn.style.cursor = 'grab';
            btn.style.display = 'flex';
            btn.style.justifyContent = 'space-between';
            btn.style.alignItems = 'center';
            btn.style.padding = '8px 10px';
            btn.style.borderRadius = '6px';
            btn.style.border = '1px solid #ddd';
            btn.style.background = '#f7f9fc';
            btn.style.fontSize = '13px';
            btn.style.boxSizing = 'border-box';

            const label = document.createElement('span');
            label.className = 'ci-suggestion-label';
            if (emoji) label.textContent = `${emoji} ${text}`; else label.textContent = text;
            const iconWrap = document.createElement('span');
            iconWrap.className = 'ci-drag-icon';
            iconWrap.setAttribute('aria-hidden', 'true');
            iconWrap.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="1.5" fill="#6b7280"/><circle cx="12" cy="5" r="1.5" fill="#6b7280"/><circle cx="19" cy="5" r="1.5" fill="#6b7280"/><circle cx="5" cy="12" r="1.5" fill="#6b7280"/><circle cx="12" cy="12" r="1.5" fill="#6b7280"/><circle cx="19" cy="12" r="1.5" fill="#6b7280"/><circle cx="5" cy="19" r="1.5" fill="#6b7280"/><circle cx="12" cy="19" r="1.5" fill="#6b7280"/><circle cx="19" cy="19" r="1.5" fill="#6b7280"/></svg>';

            btn.appendChild(label);
            btn.appendChild(iconWrap);

            // Dragstart and click handlers
            btn.addEventListener('dragstart', (ev) => {
                const ds = `${emoji ? emoji + ' ' : ''}${text}`.trim();
                try { ev.dataTransfer.setData('text/plain', ds); ev.dataTransfer.effectAllowed = 'copy'; } catch (_) {}

                // Track currently dragged suggestion element so other targets can reference it
                try { window.__ci_current_dragged_suggestion = btn; } catch (_) {}
            });
            btn.addEventListener('dragend', () => { try { if (window.__ci_current_dragged_suggestion === btn) window.__ci_current_dragged_suggestion = null; btn.classList.remove('ci-drag-over-trash'); } catch (_) {} });
            btn.addEventListener('click', () => {
                if (!input) return;
                const ds = `${emoji ? emoji + ' ' : ''}${text}`.trim();
                input.value = ds;
                input.focus();

                // Select the inserted text so it appears highlighted
                try { input.selectionStart = 0; input.selectionEnd = input.value.length; } catch (_) {}

                // Apply pastel selection background
                try { applyTextareaHighlight(input, 0, input.value.length); } catch (_) {}
                input.dispatchEvent(new Event('input', { bubbles: true }));

                setAction('CLICKED');
            });

            suggestionsList.appendChild(btn);
            return btn;
        };

        // Default suggestions (kept for new installs)
        const defaultPrompts = [
            { text: 'What data is being collected from me?', emoji: '💡' },
            { text: 'Who has access to my data?', emoji: '💡' },
            { text: 'What happens if I reject all tracking?', emoji: '💡' }
        ];

        // Load user-saved prompts from localStorage
        const STORAGE_KEY = 'ci_user_prompts_v1';
        let stored = [];
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) || [];
                stored = parsed.map(p => {
                    if (typeof p === 'string') return { text: p, emoji: randomAnimalEmoji() };
                    if (p && typeof p === 'object') return { text: p.text || '', emoji: p.emoji || randomAnimalEmoji() };
                    return { text: String(p), emoji: randomAnimalEmoji() };
                });
            }
        } catch (e) { stored = []; }

        // Combine prompts (defaults first, then stored)
        let allPrompts = defaultPrompts.concat(stored);
        const PAGE_SIZE = 3;
        let startIndex = Math.max(0, allPrompts.length - PAGE_SIZE);

        // Pager controls
        const pager = document.createElement('div');
        pager.style.display = 'flex';
        pager.style.justifyContent = 'space-between';
        pager.style.gap = '6px';
        pager.style.marginBottom = '6px';
        const upBtn = document.createElement('button'); upBtn.type = 'button'; upBtn.textContent = '▲'; upBtn.title = 'Earlier'; upBtn.style.flex = '1'; upBtn.style.padding = '6px';
        const downBtn = document.createElement('button'); downBtn.type = 'button'; downBtn.textContent = '▼'; downBtn.title = 'Newer'; downBtn.style.flex = '1'; downBtn.style.padding = '6px';
        
        // Trash icon on the rightmost side — render as a non-button element so cursor doesn't change
        const trashEl = document.createElement('div');
        trashEl.title = 'Drop prompt here to delete';
        trashEl.style.flex = '0 0 30px';
        trashEl.style.display = 'flex';
        trashEl.style.alignItems = 'center';
        trashEl.style.justifyContent = 'center';
        trashEl.style.padding = '4px';
        trashEl.style.background = 'transparent';
        trashEl.style.border = 'none';
        trashEl.style.cursor = 'default';
        trashEl.style.userSelect = 'none';
        trashEl.setAttribute('aria-hidden', 'true');
        trashEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 7h12" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M19 7l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" stroke="#6b7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        pager.appendChild(upBtn); pager.appendChild(downBtn); pager.appendChild(trashEl);
        container.insertBefore(pager, suggestionsContainer);

        let lastStartIndex = startIndex;
        const renderSuggestions = (direction) => {
            startIndex = Math.max(0, Math.min(startIndex, Math.max(0, allPrompts.length - PAGE_SIZE)));
            const end = Math.min(allPrompts.length, startIndex + PAGE_SIZE);

            // Prepare new content in a temporary fragment
            const frag = document.createDocumentFragment();
                for (let i = startIndex; i < end; i++) {
                const btn = document.createElement('div');

                // Reuse createSuggestionButton but avoid appending to DOM yet
                const tmp = createSuggestionButton(allPrompts[i]);

                // Move tmp from suggestionsList into fragment
                tmp.parentNode.removeChild(tmp);
                frag.appendChild(tmp);
            }

            const doReplace = () => {
                // Clear and append frag
                suggestionsList.innerHTML = '';
                suggestionsList.appendChild(frag);

                // Ensure visible state
                suggestionsList.style.transform = 'translateY(0)';
                suggestionsList.style.opacity = '1';
            };

            // Animate out then replace then animate in
            if (typeof direction === 'undefined') direction = (startIndex > lastStartIndex) ? 'down' : (startIndex < lastStartIndex ? 'up' : null);
            lastStartIndex = startIndex;
            upBtn.disabled = startIndex <= 0;
            downBtn.disabled = startIndex + PAGE_SIZE >= allPrompts.length;

            if (!direction) {
                doReplace();
                return;
            }
            const outY = direction === 'down' ? '-8px' : '8px';
            const inY = '0';

            // Animate out
            suggestionsList.style.transition = 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease';
            suggestionsList.style.transform = `translateY(${outY})`;
            suggestionsList.style.opacity = '0';
            setTimeout(() => {
                doReplace();

                // Force reflow
                void suggestionsList.offsetWidth;
                suggestionsList.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease';
                suggestionsList.style.transform = `translateY(${inY})`;
                suggestionsList.style.opacity = '1';
            }, 220);
        };

        upBtn.addEventListener('click', () => { startIndex = Math.max(0, startIndex - PAGE_SIZE); renderSuggestions('up'); });
        downBtn.addEventListener('click', () => { startIndex = Math.min(Math.max(0, allPrompts.length - PAGE_SIZE), startIndex + PAGE_SIZE); renderSuggestions('down'); });

        // Trash drop handling: allow dropping a suggestion's text to delete it from stored prompts
        try {
            trashEl.addEventListener('dragover', (ev) => {
                ev.preventDefault();
                trashEl.style.background = 'rgba(231,76,60,0.08)';
                try {
                    const d = window.__ci_current_dragged_suggestion;
                    if (d && d.classList) d.classList.add('ci-drag-over-trash');
                } catch (_) {}
            });
            trashEl.addEventListener('dragleave', () => { 
                trashEl.style.background = 'transparent';
                try {
                    const d = window.__ci_current_dragged_suggestion;
                    if (d && d.classList) d.classList.remove('ci-drag-over-trash');
                } catch (_) {}
            });
            trashEl.addEventListener('drop', (ev) => {
                ev.preventDefault(); trashEl.style.background = 'transparent';
                try { const d = window.__ci_current_dragged_suggestion; if (d && d.classList) d.classList.remove('ci-drag-over-trash'); } catch (_) {}
                const dt = ev.dataTransfer && ev.dataTransfer.getData && ev.dataTransfer.getData('text/plain');
                if (!dt) return;
                const text = dt.trim();

                // Strip any emoji prefix before matching against stored entries
                const textOnly = stripEmojiPrefix(text);

                // Only remove from stored (not default prompts)
                const normalized = textOnly.trim().toLowerCase();
                const storedIdx = stored.findIndex(s => (s && s.text || '').trim().toLowerCase() === normalized);
                if (storedIdx === -1) return; // Nothing to remove
                stored.splice(storedIdx, 1);
                try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch (_) {}
                
                // Rebuild allPrompts and clamp startIndex
                allPrompts = defaultPrompts.concat(stored);
                startIndex = Math.max(0, Math.min(startIndex, Math.max(0, allPrompts.length - PAGE_SIZE)));
                renderSuggestions();
            });
        } catch (e) { /* ignore */ }

        // Auto-save on form submit: persist current textarea value as a new prompt and append
        const formEl = container.querySelector(`#${IDS.EDIT_FORM}`);
        if (formEl && input) {
            formEl.addEventListener('submit', () => {
                const val = (input.value || '').trim();
                    if (!val) return;

                    // Normalize value by stripping any leading emoji used in pasted suggestions
                    const providedEmojiCandidate = val.split(' ')[0];
                    const hasEmojiPrefix = providedEmojiCandidate && /[^a-zA-Z0-9]/.test(providedEmojiCandidate);
                    const cleanText = hasEmojiPrefix ? val.split(' ').slice(1).join(' ').trim() : val;

                    // Avoid saving duplicates in localStorage (case-insensitive), including defaults
                    const normalized = cleanText.toLowerCase();
                    const foundInStored = stored.some(s => ((s && s.text) || '').trim().toLowerCase() === normalized);
                    const foundInDefaults = defaultPrompts.some(p => ((p && p.text) || '').trim().toLowerCase() === normalized);
                    if (!foundInStored && !foundInDefaults) {
                        const newEntry = { text: cleanText, emoji: hasEmojiPrefix ? providedEmojiCandidate : randomAnimalEmoji() };
                        stored.push(newEntry);
                        allPrompts.push(newEntry);
                        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored)); } catch (_) {}
                        
                        // mMve to last page so newest prompts are visible
                        startIndex = Math.max(0, allPrompts.length - PAGE_SIZE);
                        renderSuggestions();
                    }
            });
        }

        // Allow pressing Enter (without Shift) in the textarea to submit the form.
        // Shift+Enter will insert a newline as usual.
        if (input && formEl) {
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
                    ev.preventDefault();
                    try { formEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); } catch (_) {}
                }
            });
        }

        // Initial render
        renderSuggestions();

        // Allow dropping suggestion text into the textarea at the caret
        if (input) {
            input.addEventListener('dragover', (ev) => { ev.preventDefault(); });
            input.addEventListener('drop', (ev) => {
                ev.preventDefault();
                const dt = ev.dataTransfer && ev.dataTransfer.getData && ev.dataTransfer.getData('text/plain');
                if (!dt) return;
                try {
                    const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
                    const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : start;
                    const val = input.value || '';
                    input.value = val.slice(0, start) + dt + val.slice(end);
                    const selStart = start;
                    const selEnd = start + dt.length;
                    try { input.selectionStart = selStart; input.selectionEnd = selEnd; } catch (_) {}
                    input.focus();

                    // Trigger input listeners so textarea resize and submit enabling run
                    input.dispatchEvent(new Event('input', { bubbles: true }));

                    // Apply pastel highlight to the inserted range
                    try { applyTextareaHighlight(input, selStart, selEnd); } catch (_) {}

                    // Apply a short fade-in animation to make the dropped text appear smoother
                    input.classList.add('ci-drop-fade');
                    input.addEventListener('animationend', function _rm() { input.classList.remove('ci-drop-fade'); input.removeEventListener('animationend', _rm); });
                    setAction("DRAGGED");
                } catch (e) { /* ignore */ }
            });
        }

        // Highlight helper: set selection and apply pastel selection background via CSS variable
        // Apply a temporary pastel highlight to a textarea selection.
        // Sets `--ci-selection-bg` on the element and clears the
        // selection shortly after to avoid leaving the text selected.
        function applyTextareaHighlight(el, start, end) {
            try {
                const pal = randomPastel();
                el.style.setProperty('--ci-selection-bg', pal.bg);

                // Set selection range
                if (typeof start === 'number' && typeof end === 'number') {
                    el.selectionStart = start;
                    el.selectionEnd = end;
                }

                // Add a temporary class to allow transition/cleanup if needed
                el.classList.add('ci-temp-highlight');
            } catch (_) {}
        }
    } catch (e) { /* silent */ }

    // Relay suggestion drops that occur outside the UI to the inspector
    try {
        // Track last drag position (used for dragend fallback) and show drag target overlay
        document.addEventListener('dragover', (ev) => {
            try { window.__ci_last_drag_pos = { x: ev.clientX, y: ev.clientY }; } catch (_) {}
            try {
                // If dragging a suggestion, highlight the element under the cursor
                const dragged = window.__ci_current_dragged_suggestion;
                if (!dragged) return;
                const x = ev.clientX || 0;
                const y = ev.clientY || 0;
                const el = document.elementFromPoint(x, y);
                if (!el) return;
                // If the pointer is over a post-it child, target the whole post-it
                const postit = (el && el.closest) ? el.closest('.ci-postit') : null;
                const targetEl = postit || el;
                // don't highlight our own UI
                if (targetEl.closest && (targetEl.closest(`#${IDS.EDIT_CONTAINER}`) || targetEl.closest(`#${IDS.OVERLAY}`) || targetEl.closest(`#${IDS.TOGGLE}`))) {
                    hideDragOverlay();
                    return;
                }
                showDragOverlayFor(targetEl);
            } catch (_) {}
        }, true);

        // Some pages may swallow drop events; use dragend as a reliable fallback.
        document.addEventListener('dragend', (ev) => {
            try {
                const dragged = window.__ci_current_dragged_suggestion;
                if (!dragged) return;

                // Determine drop point (prefer last tracked position)
                const pos = window.__ci_last_drag_pos || { x: ev.clientX, y: ev.clientY };
                if (!pos) return;
                const x = pos.x || 0, y = pos.y || 0;
                const el = document.elementFromPoint(x, y);
                if (!el) return;
                // Prefer the whole post-it if dropping on one of its sub-elements
                const postit = (el && el.closest) ? el.closest('.ci-postit') : null;
                const targetEl = postit || el;
                if (targetEl.closest && (targetEl.closest(`#${IDS.EDIT_CONTAINER}`) || targetEl.closest(`#${IDS.OVERLAY}`) || targetEl.closest(`#${IDS.TOGGLE}`))) return;
                const text = dragged.getAttribute('data-suggestion') || dragged.textContent || '';
                if (!text) return;
                const detail = { text, x, y };
                document.dispatchEvent(new CustomEvent('ci-suggestion-dropped', { detail }));
            } catch (e) { /* ignore */ }
            finally { try { window.__ci_current_dragged_suggestion = null; } catch (_) {} }
        }, true);
    } catch (e) { /* ignore */ }

    // Create or update a separate overlay used only for drag-target highlighting
    // Ensure a lightweight drag overlay exists (ci-drag-overlay) and
    // return it. This overlay is used while dragging suggestions to
    // visually communicate the element under the cursor.
    function ensureDragOverlay() {
        const id = 'ci-drag-overlay';
        let o = document.getElementById(id);
        if (o) return o;
        o = document.createElement('div');
        o.id = id;
        Object.assign(o.style, {
            position: 'fixed',
            zIndex: STYLES.Z_INDEX,
            pointerEvents: 'none',
            border: `2px dashed ${STYLES.PRIMARY_BLUE}`,
            background: 'rgba(52,152,219,0.03)',
            boxSizing: 'border-box',
            display: 'none',
            opacity: '0',
            transform: 'scale(1)',
            transition: 'opacity 160ms ease, transform 160ms ease',
            borderRadius: '10px'
        });
        document.documentElement.appendChild(o);
        return o;
    }

    // Position and show the drag overlay for `el`. Provides a dashed
    // rounded rectangle around the element to indicate a valid drop
    // target during dragging.
    function showDragOverlayFor(el) {
        try {
            const overlay = ensureDragOverlay();
            const rect = el.getBoundingClientRect();
            const gap = 4;
            const width = rect.width + gap * 2;
            const height = rect.height + gap * 2;
            let left = rect.left - gap;
            let top = rect.top - gap;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            left = Math.max(6, Math.min(left, vw - width - 6));
            top = Math.max(6, Math.min(top, vh - height - 6));
            overlay.style.left = `${left}px`;
            overlay.style.top = `${top}px`;
            overlay.style.width = `${Math.max(18, width)}px`;
            overlay.style.height = `${Math.max(18, height)}px`;
            overlay.style.display = 'block';
            void overlay.offsetWidth;
            overlay.style.opacity = '1';
            overlay.style.transform = 'scale(1.02)';
            window.__ci_last_drag_overlay_target = el;
        } catch (_) {}
    }

    // Hide the drag overlay with a short fade-out.
    function hideDragOverlay() {
        try {
            const overlay = document.getElementById('ci-drag-overlay');
            if (!overlay) return;
            overlay.style.opacity = '0';
            overlay.style.transform = 'scale(1)';
            setTimeout(() => { if (overlay && overlay.style) overlay.style.display = 'none'; }, 200);
            window.__ci_last_drag_overlay_target = null;
        } catch (_) {}
    }
}

// Animations
export function injectUiAnimations() {
    if (document.getElementById('ci-ui-animations')) return;
    const s = document.createElement('style');
    s.id = 'ci-ui-animations';
    s.textContent = `
        /* shake animation (used for input error feedback) */
        .ci-shake{animation: ci-shake 360ms;}
        @keyframes ci-shake{0%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}100%{transform:translateX(0)}}

        /* fade-in when text is dropped into the input */
        .ci-drop-fade{animation: ci-drop-fade 260ms ease forwards}
        @keyframes ci-drop-fade{0%{opacity:0.15}60%{opacity:0.85}100%{opacity:1}}
        /* pager slide animations */
        .ci-suggestions-viewport{position:relative; overflow:hidden}
        .ci-suggestions-list{transition:transform 260ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease}
        .ci-slide-in-up{transform:translateY(-8px); opacity:0}
        .ci-slide-in-down{transform:translateY(8px); opacity:0}
        .ci-slide-visible{transform:translateY(0); opacity:1}
        /* visual cue for suggestion when dragged over trash */
        .ci-drag-over-trash{background:rgba(231,76,60,0.12) !important}
        /* textarea selection highlight using dynamic pastel color */
        textarea::selection{background:var(--ci-selection-bg, rgba(180,200,255,0.6)); color:inherit}
        .ci-temp-highlight{transition:box-shadow 220ms ease}
    `;
    document.head.appendChild(s);
}