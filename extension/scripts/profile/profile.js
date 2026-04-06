import { categoriseWebsite, getAppliedPreferences, calculateShape } from './helper.js';
import { buildProfile } from './ui-factory.js';

export async function initProfile(results) {
  try {
    const category = await categoriseWebsite();
    const preferences = getAppliedPreferences(category);
    const stats = calculateShape(preferences);

    buildProfile(stats, category, results);
  } catch (error) {
    console.error("Initialization failed:", error);
  }
}