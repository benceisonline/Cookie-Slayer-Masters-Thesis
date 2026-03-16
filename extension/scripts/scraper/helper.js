export const isHidden = (node) => {
        const style = window.getComputedStyle(node);
        return style.display === 'none' || 
                style.visibility === 'hidden' || 
                style.opacity === '0';
    };

/**
 * Determines if the scan results are missing when a decision is still needed.
 * @param {Set|Array} results - The collection of found elements.
 * @param {boolean} hasMadeDecision - State flag for user action.
 * @returns {boolean}
 */
export const isScanEmpty = (results, hasMadeDecision) => {
    // Check for both Set (.size) and Array (.length)
    const count = results?.size ?? results?.length ?? 0;
    const isMissingData = count === 0;

    if (!hasMadeDecision && isMissingData) {
        // Keep the warning if helpful for debugging, 
        // but the logic is now type-safe.
        console.warn("Scanner: No action buttons detected in the current view.");
        return true;
    }

    return false;
};