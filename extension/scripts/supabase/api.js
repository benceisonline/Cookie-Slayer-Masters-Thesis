
export async function interactWithDB(dbType, data) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: dbType,
      payload: data
    }, (response) => {
      resolve(response);
    });
  });
}