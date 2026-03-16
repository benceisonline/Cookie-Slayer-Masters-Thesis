import { loadInspectorTool } from "./inspector-tool/inspector.js"; 
import { startScanner } from "./scraper/scraper.js"

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
