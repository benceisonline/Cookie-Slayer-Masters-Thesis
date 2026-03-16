(async () => {
  const src = chrome.runtime.getURL('scripts/content-script.js');
  await import(src);
})();