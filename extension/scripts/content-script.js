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

// Start scanner once page loads and only show the welcome overlay
// when the user hasn't already completed the welcome flow. This
// prevents the welcome from opening on every page navigation while
// still showing it the first time the extension runs.
if (document.readyState === 'complete') {
    results = startScanner();
    chrome.storage && chrome.storage.local && chrome.storage.local.get(['welcomeSeen'], (res) => {
        try {
            if (!res || !res.welcomeSeen) showWelcomeOverlay();
        } catch (_) { /* ignore */ }
    });
} else {
    window.addEventListener('load', () => {
        results = startScanner();
        chrome.storage && chrome.storage.local && chrome.storage.local.get(['welcomeSeen'], (res) => {
            try {
                if (!res || !res.welcomeSeen) showWelcomeOverlay();
            } catch (_) { /* ignore */ }
        });
    });
}

window.addEventListener('message', (event) => {
    if (!event.data || event.data.action !== 'show-welcome-overlay') return;
    showWelcomeOverlay();
});

loadInspectorTool();
