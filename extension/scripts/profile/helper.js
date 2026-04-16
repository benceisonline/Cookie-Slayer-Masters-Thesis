import { sanitizeServerText } from '../common/utils.js';
import { WEBSITE_CATEGORIES, VAL, DECISIONS, DEFAULT, DB_TYPE } from '../common/types.js';
import { interactWithDB } from '../supabase/api.js';

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
  return new Promise(async (resolve) => {
    const isValid = Object.values(WEBSITE_CATEGORIES).includes(category);
    
    if (!isValid) {
      console.warn(`AI returned bad response: ${category}`);
    }

    resolve(await getGroupedPreferences());
  });
}

async function getGroupedPreferences() {
  const data = await chrome.storage.local.get("userId");
  const userId = data.userId;

  if (!userId) return {};

  const [response, defaultPrefs] = await Promise.all([
    interactWithDB(DB_TYPE.GET_SAVED_DECISIONS, { userId }),
    getDefaultPreferences()
  ]);

  if (!response?.success) return {};

  const grouped = response.data.reduce((acc, item) => {
    const category = (item.category ?? "").toUpperCase();
    const decision = (item.action_type ?? "").toUpperCase();

    if (!acc[category]) {
      acc[category] = []; 
    }

    acc[category].push({ category, decision });
    return acc;
  }, {
    [DEFAULT.DEFAULT.toUpperCase()]: [...defaultPrefs]
  });

  return grouped;
}

async function getDefaultPreferences() {
  const data = await chrome.storage.local.get("privacyLevel");

  switch ((data?.privacyLevel ?? "").toUpperCase()) {
    case "LOW":
      return [
        {category: DEFAULT.DEFAULT, decision: DECISIONS.ACCEPT}
      ];
    case "MEDIUM":
      return [
        {category: DEFAULT.DEFAULT, decision: DECISIONS.CUSTOMIZE}, 
        {category: DEFAULT.DEFAULT, decision: DECISIONS.NECESSARY},
      ];
    case "HIGH":
      return [
        {category: DEFAULT.DEFAULT, decision: DECISIONS.REJECT},
      ];
    default:
      return [
        {category: DEFAULT.DEFAULT, decision: DECISIONS.ACCEPT},
        {category: DEFAULT.DEFAULT, decision: DECISIONS.CUSTOMIZE}, 
        {category: DEFAULT.DEFAULT, decision: DECISIONS.NECESSARY},
        {category: DEFAULT.DEFAULT, decision: DECISIONS.REJECT},
      ];
  }
}

export function getAllCategoryShapes(groupedPreferences) {
  const shapesByCategory = {};

  for (const [category, preferences] of Object.entries(groupedPreferences)) {
    shapesByCategory[category] = calculateShape(preferences);
  }

  return shapesByCategory;
}

function calculateShape(preferences) {
  const MIN_VALUE = VAL.MIN_VALUE;
  const stats = { 
    ACCEPT: MIN_VALUE, 
    REJECT: MIN_VALUE, 
    NECESSARY: MIN_VALUE, 
    CUSTOMIZE: MIN_VALUE 
  };

  if (!preferences || preferences.length === 0) return stats;

  const isDefaultCategory = preferences.some(p => p.category === DEFAULT.DEFAULT);

  if (isDefaultCategory) {
    preferences.forEach(p => {
      const action = p.decision;
      if (stats.hasOwnProperty(action)) {
        stats[action] = 1.0;
      }
    });
    return stats;
  }

  const counts = { ACCEPT: 0, REJECT: 0, NECESSARY: 0, CUSTOMIZE: 0 };
  preferences.forEach(p => {
    if (counts.hasOwnProperty(p.decision)) counts[p.decision] += 1;
  });

  const total = preferences.length;
  
  return {
    ACCEPT: Math.max(MIN_VALUE, counts.ACCEPT / total),
    REJECT: Math.max(MIN_VALUE, counts.REJECT / total),
    NECESSARY: Math.max(MIN_VALUE, counts.NECESSARY / total),
    CUSTOMIZE: Math.max(MIN_VALUE, counts.CUSTOMIZE / total)
  };
}

export async function saveDecision(userId, category, decision) {
  const payload = {
    userId: userId,
    category: category.toUpperCase(),
    decision: (decision ?? "").toUpperCase()
  };

  const response = await interactWithDB(DB_TYPE.SAVE_DECISION, payload);
  
  if (response?.success) {
    console.log("Decision saved successfully!");
  } else {
    console.error("Save failed:", response?.error);
  }
}

export async function addEventToResults(results, category) {
  const data = await chrome.storage.local.get("userId");
  const userId = data.userId;

  if (!userId) return;

  results.forEach((result) => {
    const { element, category: resultCategory } = result;

    if (!element) return;

    element.addEventListener('click', async () => {
      const decisionValue = resultCategory;

      try {
        console.log(`Saving decision: ${decisionValue} for category: ${category}`);
        await saveDecision(userId, category, decisionValue);
      } catch (err) {
        console.error("Cookie Slayer Save Error:", err);
      }
    });
  });
}