import { loadInspectorTool } from "./inspector-tool/inspector.js"; 
import { initProfile } from "./profile/profile.js";
import { startScanner } from "./scraper/scraper.js";
import { showError } from "./common/messages.js";

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

if (document.readyState === 'complete') {
    chrome.storage && chrome.storage.local && chrome.storage.local.get(['welcomeSeen'], (res) => {
        try {
            if (!res || !res.welcomeSeen) showWelcomeOverlay();
        } catch (_) { /* ignore */ }
    });
} else {
    window.addEventListener('load', () => {
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

async function startApp() {
    let results;

    if (document.readyState === 'complete') {
        results = await startScanner();
    } else {
        results = await new Promise(resolve => {
            window.addEventListener('load', async () => {
                const data = await startScanner();
                resolve(data);
            });
        });
    }

    if (results && results.length > 0) {
        await initProfile(results);
    } else {
        showError("We couldn't find any cookie related buttons on this site");
    }
}

startApp()
