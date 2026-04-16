import { supabase } from './client.js';

/**
 * Fetches decisions for a user grouped by category
 * @param {string} userId - The unique ID of the user
 */
export async function getDecisions(userId) {
  const { data, error } = await supabase
    .from('decision')
    .select('*')
    .eq('user_id', userId);

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
    .from('decision')
    .upsert({ 
      user_id: userId, 
      category: category, 
      decision: (decision ?? "").toUpperCase()
    });

  if (error) throw error;
  return data;
}

