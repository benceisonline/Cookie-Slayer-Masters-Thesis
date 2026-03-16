import { DOM_TYPES, PATTERNS, SCAN_CONFIG } from "../types.js";
import { isHidden } from "./helper.js";

let results = new Set();

/**
 * Scans for all visible foreground DIVs (z-index > 0).
 * Once a layer is found, it harvests all buttons inside that specific tree.
 * Retries every 1s for up to 10 seconds.
 */
function runForegroundScanner(attempt = 1) {
    const maxAttempts = SCAN_CONFIG.MAX_ATTEMPTS;

    /**
     * Phase 2: Deep harvest of buttons inside a confirmed high-index branch.
     * We ignore z-index here because the parent container already passed the gate.
     */
    const harvestButtons = (node) => {
        if (!node || node.nodeType !== 1 || isHidden(node)) return;

        if (node.tagName === DOM_TYPES.BUTTON || node.tagName === DOM_TYPES.LINK) {
            const text = (node.innerText || "").trim();
            const testId = node.getAttribute('data-testid') || node.getAttribute('data-test-id') || "";
            const combinedSource = `${text} ${testId}`;

            for (const [key, regex] of Object.entries(PATTERNS)) {
                if (regex.test(combinedSource)) {
                    results.add(JSON.stringify({
                        category: key.toUpperCase(),
                        text: text.replace(/\s+/g, " ").trim().substring(0, 40),
                        element: node
                    }));
                    break; 
                }
            }
        }

        // Search Shadow DOM and standard children
        if (node.shadowRoot) Array.from(node.shadowRoot.children).forEach(harvestButtons);
        Array.from(node.children).forEach(harvestButtons);
    };

    /**
     * Phase 1: Search the DOM for DIVs that act as a z-index gate.
     */
    const findForegroundContainers = (node) => {
        if (!node || node.nodeType !== 1 || isHidden(node)) return;

        if (node.tagName === DOM_TYPES.DIV) {
            const style = window.getComputedStyle(node);
            const zIndex = parseInt(style.zIndex, 10);

            // GATE: If z-index is set and positive, start harvesting this tree.
            if (!isNaN(zIndex) && zIndex > SCAN_CONFIG.Z_INDEX_THRESHOLD) {
                harvestButtons(node);
            }
        }

        if (node.shadowRoot) Array.from(node.shadowRoot.children).forEach(findForegroundContainers);
        Array.from(node.children).forEach(findForegroundContainers);
    };

    // Execute the scan starting from the body
    findForegroundContainers(document.body);

    const finalData = Array.from(results).map(item => JSON.parse(item));

    if (finalData.length > 0) {
        console.log(`%c [SUCCESS] Attempt ${attempt}: Found ${finalData.length} unique buttons.`, 'color: #00ff00; font-weight: bold;');
        console.table(finalData);
    } else if (attempt < maxAttempts) {
        console.log(`[RETRY] Attempt ${attempt}: No foreground containers found. Searching again in 1s...`);
        setTimeout(() => runForegroundScanner(attempt + 1), SCAN_CONFIG.RETRY_DELAY);
    } else {
        console.warn(`[FAILED] Reached max attempts (${maxAttempts}). No visible high-index DIVs detected.`);
    }
}

export function startScanner() {
    setTimeout(() => runForegroundScanner(), SCAN_CONFIG.INITIAL_DELAY);
    return results;
}