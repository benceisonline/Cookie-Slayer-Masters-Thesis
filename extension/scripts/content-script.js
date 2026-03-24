import { loadInspectorTool } from "./inspector-tool/inspector.js"; 
import { startScanner } from "./scraper/scraper.js"

// Inject extension stylesheet into the page so UI elements pick up styles
(async function injectStyles(){
    try {
        const url = chrome.runtime.getURL('styles.css');
        const res = await fetch(url);
        if (res.ok) {
            const css = await res.text();
            const s = document.createElement('style');
            s.id = 'ci-injected-styles';
            s.textContent = css;
            document.head.appendChild(s);
        }
    } catch (e) {
        console.warn('Failed to inject styles for inspect-ish', e);
    }
})();

function showWelcomeOverlay() {
    if (document.getElementById('cs-welcome-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'cs-welcome-overlay';
    overlay.className = 'cs-welcome-overlay';

    overlay.innerHTML = `<iframe src="${chrome.runtime.getURL('welcome.html')}" style="width:100%; height:100%; border:none;"></iframe>`;

    document.body.appendChild(overlay);

    // Listen for messages from the iframe to close the overlay
    window.addEventListener('message', (event) => {
        if (event.data.type === 'close-welcome') {
            overlay.remove();
        }
    });
}

// Global variables
let results = [];
let hasMadeDecision = false;

if (document.readyState === 'complete') {
    results = startScanner();
    showWelcomeOverlay();
} else {
    window.addEventListener('load', () => {
        results = startScanner();
        showWelcomeOverlay();
    });
}

window.addEventListener('message', (event) => {
    if (!event.data || event.data.action !== 'show-welcome-overlay') return;
    showWelcomeOverlay();
});

loadInspectorTool();
