import { sanitizeServerText } from '../common/utils.js';
import { WEBSITE_CATEGORIES, VAL, DECISIONS, DEFAULT } from '../common/types.js';

export function categoriseWebsite() {
  return new Promise((resolve) => {
    const prompt = document.title;
    chrome.runtime.sendMessage({ action: 'categorize', prompt }, response => {
      if (response && response.ok) {
        resolve(sanitizeServerText(response.text).toUpperCase());
      } else {
        resolve(""); 
      }
    });
  });
}

export function getAppliedPreferences(category) {
  const isValid = Object.values(WEBSITE_CATEGORIES).includes(category);
  if (!isValid) {
    console.warn(`AI returned bad response: ${category}`);
    return getDefaultPreferences();
  }
  const savedPreferences = getSavedPreferences();
  return savedPreferences.length !== 0 ? savedPreferences : getDefaultPreferences();
}

export function getSavedPreferences() {
  return []; // TODO: Implement chrome.storage.local fetch
}

export function getDefaultPreferences() {
  return [
    {context: DEFAULT.DEFAULT, decision: DECISIONS.CUSTOMIZE}, 
    // {context: DEFAULT.DEFAULT, decision: DECISIONS.NECESSARY}, 
    // {context: DEFAULT.DEFAULT, decision: DECISIONS.ACCEPT}, 
    // {context: DEFAULT.DEFAULT, decision: DECISIONS.REJECT}
  ];
}

export function calculateShape(currentPreferences) {
  const MIN_VALUE = VAL.MIN_VALUE;
  const stats = { 
    ACCEPT: MIN_VALUE, 
    REJECT: MIN_VALUE, 
    NECESSARY: MIN_VALUE, 
    CUSTOMIZE: MIN_VALUE 
  };

  if (!currentPreferences || currentPreferences.length === 0) {
    return stats;
  }

  const isDefaultContext = currentPreferences.some(p => p.context === DEFAULT.DEFAULT);

  if (isDefaultContext) {
    currentPreferences.forEach(p => {
      const action = p.decision;
      if (stats.hasOwnProperty(action)) {
        stats[action] = 1.0;
      }
    });
    return stats;
  }

  const counts = { ACCEPT: 0, REJECT: 0, NECESSARY: 0, CUSTOMIZE: 0 };
  currentPreferences.forEach(p => {
    if (counts.hasOwnProperty(p.decision)) counts[p.decision] += 1;
  });

  const total = currentPreferences.length;
  
  return {
    ACCEPT: Math.max(MIN_VALUE, counts.ACCEPT / total),
    REJECT: Math.max(MIN_VALUE, counts.REJECT / total),
    NECESSARY: Math.max(MIN_VALUE, counts.NECESSARY / total),
    CUSTOMIZE: Math.max(MIN_VALUE, counts.CUSTOMIZE / total)
  };
}