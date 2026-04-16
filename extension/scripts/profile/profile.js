import { categoriseWebsite, getAppliedPreferences, getAllCategoryShapes, addEventToResults } from './helper.js';
import { buildProfile } from './ui-factory.js';

export async function initProfile(results) {
  try {
    const category = await categoriseWebsite();
    const preferences = await getAppliedPreferences(category);
    const stats = getAllCategoryShapes(preferences);

    addEventToResults(results, category);
    buildProfile(stats, category, results);
  } catch (error) {
    console.error("Initialization failed:", error);
  }
}