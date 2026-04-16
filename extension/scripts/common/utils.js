import { interactWithDB } from '../supabase/api.js';
import { DB_TYPE } from '../common/types.js';

/**
 * Dynamically adjusts the height of a textarea based on its content.
 * @param {HTMLTextAreaElement} el - The textarea element to resize.
 * @param {number} maxHeight - The maximum height in pixels before scrolling kicks in.
 */
export function adjustTextareaHeight(el, maxHeight = 220) {
    if (!el) return;

    // Reset height to 'auto' first to get the correct scrollHeight
    el.style.height = 'auto';

    // Calculate the new height (scrollHeight is the height of the content)
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    
    el.style.height = `${newHeight}px`;

    // Handle scrollbar visibility
    if (el.scrollHeight > maxHeight) {
        el.style.overflowY = 'auto';
    } else {
        el.style.overflowY = 'hidden';
    }
}

/**
 * Cleans up LLM responses, removing markdown and junk
 */
export function sanitizeServerText(s){
      if (!s) return '';
      s = String(s).trim();
      // try to parse JSON first
      try{
        const obj = JSON.parse(s);
        if (typeof obj === 'string') s = obj;
        else if (obj && typeof obj === 'object'){
          s = obj.response || obj.text || obj.answer || obj.result || obj.data || JSON.stringify(obj);
        }
      }catch(e){
        // attempt to extract a "response" property via regex if JSON.parse failed
        const m = s.match(/\bresponse\b\s*[:\-–—]\s*["']([\s\S]*?)["']/i);
        if (m && m[1]) s = m[1];
      }

      // remove code fences
      s = s.replace(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)\s*```/g, '$1');
      // remove surrounding braces if they remain
      s = s.replace(/^\s*{\s*/,'').replace(/\s*}\s*$/,'');
      // strip leading/trailing quotes/backticks
      s = s.replace(/^\s*['"`]+|['"`]+\s*$/g,'');
      // allow only <b> tags; remove any other HTML tags for safety
      s = s.replace(/<(\/?)(?!b\b)[^>]*>/gi, '');
      return s.trim();
    }

export async function saveLog() {
    const data = await chrome.storage.local.get("userId");
    const userId = data.userId;

    if (!userId) return;

    const payload = {
        userId: userId,
        website: document.URL
    }

    const response = await interactWithDB(DB_TYPE.SAVE_LOG, payload)

    if (response?.success) {
        console.log(`Saving log: ${document.URL}`);
        return response.data; 
    } else {
        console.error("Save failed:", response?.error);
    }
}