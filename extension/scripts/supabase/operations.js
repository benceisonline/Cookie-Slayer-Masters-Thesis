import { supabase } from './client.js';

/**
 * Fetches decisions for a user based on category
 * @param {string} userId - The unique ID of the user
 * @param {string} category - The context/category of the site
 */
export async function getDecisions(userId, category) {
  const { data, error } = await supabase
    .from('decisions')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category);

  if (error) throw error;
  return data; 
}

/**
 * Saves or updates a user decision
 * @param {string} userId - The unique ID of the user
 * @param {string} category - The category/context (e.g., 'HEALTH')
 * @param {string} decision - The user's choice (e.g., 'REJECT')
 */
export async function saveDecision(userId, category, decision) {
  const { data, error } = await supabase
    .from('decisions')
    .upsert({ 
      user_id: userId, 
      category: category, 
      decision: (decision ?? "").toUpperCase()
    });

  if (error) throw error;
  return data;
}