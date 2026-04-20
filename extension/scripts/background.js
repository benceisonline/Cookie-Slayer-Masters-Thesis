import { DB_TYPE } from "./common/types.js";
import { getDecisions, saveDecision, saveInspector, saveLog, savePrivacyChoice, saveRecommended, saveNote, saveFollowup, saveUser } from "./supabase/operations.js";

// Open welcome page on every reload (for testing)
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('welcome.html')
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || (msg.action !== 'ask' && msg.action !== 'categorize') || !msg.prompt) return;
  const url = `http://130.225.39.167:3000/${msg.action}`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: msg.prompt })
  }).then(async res => {
    const text = await res.text();
    sendResponse({ ok: true, text, status: res.status });
  }).catch(err => {
    sendResponse({ ok: false, error: String(err) });
  });
  return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case DB_TYPE.GET_SAVED_DECISIONS:
      getDecisions(request.payload.userId)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    case DB_TYPE.SAVE_DECISION:
      saveDecision(request.payload.userId, request.payload.category, request.payload.decision)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    case DB_TYPE.SAVE_RECOMMENDED:
      saveRecommended(request.payload.decisionId, request.payload.map)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    case DB_TYPE.SAVE_PRIVACY_CHOICE:
      savePrivacyChoice(request.payload.userId, request.payload.level)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    case DB_TYPE.SAVE_LOG:
      saveLog(request.payload.userId, request.payload.website)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    case DB_TYPE.SAVE_INSPECTOR:
      saveInspector(request.payload.logId, request.payload.element)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    case DB_TYPE.SAVE_NOTE:
      saveNote(request.payload)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    case DB_TYPE.SAVE_FOLLOWUP:
      saveFollowup(request.payload)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    case DB_TYPE.SAVE_FOLLOWUP:
      saveFollowup(request.payload)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    case DB_TYPE.SAVE_USER:
      saveUser(request.payload)
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      break;
    default:
      break;
  }
  return true;
});