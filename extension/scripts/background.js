// Test in Postman:
// curl -X POST http://130.225.39.167:3000/ask \
//      -H "Content-Type: application/json" \
//      -d '{"prompt": "Explain what a neural network is."}'

// Open welcome page on every reload (for testing)
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('welcome.html')
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.action !== 'ask' || !msg.prompt) return;
  const url = 'http://130.225.39.167:3000/ask';
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
