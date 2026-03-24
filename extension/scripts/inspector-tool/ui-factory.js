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