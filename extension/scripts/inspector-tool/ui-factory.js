import { IDS, STYLES } from '../types.js';

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

export function createToggleButton(onClick) {
    const btn = document.createElement('button');
    btn.id = IDS.TOGGLE;
    btn.textContent = 'Toggle Cookie Inspector';
    Object.assign(btn.style, {
        position: 'fixed',
        right: '14px',
        top: '14px',
        zIndex: STYLES.Z_INDEX,
        padding: '10px 14px',
        minWidth: '180px',
        borderRadius: '12px',
        background: '#fff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        fontWeight: '600'
    });
    btn.addEventListener('click', onClick, true);
    document.documentElement.appendChild(btn);
}

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
        minWidth: 'auto',
        boxSizing: 'border-box'
    });

    container.innerHTML = `
        <form id="${IDS.EDIT_FORM}" style="display:flex; align-items:center; gap:8px; flex-wrap:nowrap;">
            <textarea id="${IDS.EDIT_INPUT}" placeholder="What can I help you with?" style="flex:1 1 auto; min-width:200px; max-width:520px; padding:8px; border-radius:6px; border:1px solid #ccc; box-sizing:border-box;"></textarea>
            <button type="submit" id="ci-edit-submit" style="margin-left:6px; padding:6px 10px; border-radius:6px; background:#3498db; color:#fff; display:flex; align-items:center; white-space:nowrap;" disabled>
                <span class="ci-edit-label">Send</span>
                <div class="ci-spinner" style="display:none; margin-left:8px"></div>
            </button>
        </form>
    `;
    document.documentElement.appendChild(container);
}

export function injectShakeStyle() {
    if (document.getElementById('ci-shake-style')) return;
    const s = document.createElement('style');
    s.id = 'ci-shake-style';
    s.textContent = `.ci-shake{animation: ci-shake 360ms;} @keyframes ci-shake{0%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}100%{transform:translateX(0)}}`;
    document.head.appendChild(s);
}