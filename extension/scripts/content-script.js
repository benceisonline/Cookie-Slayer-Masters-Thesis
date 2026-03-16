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

// Global variables
let results = [];
let hasMadeDecision = false;

if (document.readyState === 'complete') {
    results = startScanner();
} else {
    window.addEventListener('load', () => {
        results = startScanner();
    });
}

loadInspectorTool();
