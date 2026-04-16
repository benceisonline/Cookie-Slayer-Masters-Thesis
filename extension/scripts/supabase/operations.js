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
      action_type: (decision ?? "").toUpperCase()
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Saves or updates a recommened decision
 * @param {string} decisionId - The unique ID of the decision
 * @param {map} catAndStatMap - Contains stats for the category
 */
export async function saveRecommended(decisionId, catAndStatMap) {
  const { data, error } = await supabase
    .from('recommendation')
    .insert([{
      decision_id: decisionId, 
      used_category: catAndStatMap.used_category,
      necasscary_value: catAndStatMap.necasscary_value,
      reject_value: catAndStatMap.reject_value,
      accept_value: catAndStatMap.accept_value,
      customize_value: catAndStatMap.customize_value,
      manual: catAndStatMap.manual,
    }]);

  if (error) throw error;
  return data;
}

/**
 * Saves or updates the privacy level for the user
 * @param {string} userId - The unique ID of the decision
 * @param {string} level - Privacy level
 */
export async function savePrivacyChoice(userId, level) {
  const { data, error } = await supabase
    .from('privacy_choice')
    .upsert({ 
      user_id: userId, 
      level: level,
    })

  if (error) throw error;
  return data;
}

/**
 * Saves or updates log
 * @param {string} userId - The unique ID of the decision
 * @param {string} website - Name of website
 */
export async function saveLog(userId, website) {
  const { data, error } = await supabase
    .from('log')
    .upsert({ 
      user_id: userId, 
      website_name: website,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Saves or updates the inspector for the user
 * @param {string} logId - The unique ID of the decision
 * @param {json} element - Element of the pressed
 */
export async function saveInspector(logId, element) {
  const { data, error } = await supabase
    .from('inpector')
    .upsert({ 
      log_id: logId, 
      element: element,
    })

  if (error) throw error;
  return data;
}

/**
 * Saves or updates the inspector for the user
 * @param {map} payload - payload
 */
export async function saveNote(payload) {
  const { data, error } = await supabase
    .from('note')
    .upsert({ 
      log_id: payload.logId, 
      parent_id: payload.parentId,
      input: payload.input,
      output: payload.output,
      action: payload.action
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Saves or updates the inspector for the user
 * @param {map} payload - payload
 */
export async function saveFollowup(payload) {
  const { data, error } = await supabase
    .from('followup')
    .upsert({
      note_id: payload.noteId,
      parent_id: payload.parentId,
      input: payload.input,
      output: payload.output,
      action: payload.action
    })

  if (error) throw error;
  return data;
}