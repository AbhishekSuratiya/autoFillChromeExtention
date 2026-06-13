// JobFill – Background Service Worker (MV3)
// Handles fallback script injection when content script isn't ready.

chrome.runtime.onInstalled.addListener(() => {
  console.log('[JobFill] Extension installed/updated.');
  // Enable the side panel on action click
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});

// Relay fill requests from the popup to the active tab's content script.
// If the content script fails (not injected yet), inject it first.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== 'RELAY_FILL') {
    return false;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) {
      sendResponse({ success: false, error: 'No active tab found.' });
      return;
    }

    const tabId = tab.id;

    // Try sending directly first.
    try {
      chrome.tabs.sendMessage(tabId, { action: 'FILL_FORM', profile: message.profile }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not ready – inject it first.
          chrome.scripting.executeScript(
            { target: { tabId }, files: ['content.js'] },
            () => {
              if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
              }
              // Retry after injection.
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, { action: 'FILL_FORM', profile: message.profile }, (res) => {
                  sendResponse(res ?? { success: false, error: 'No response from content script.' });
                });
              }, 300);
            }
          );
        } else {
          sendResponse(response);
        }
      });
    } catch (err) {
      sendResponse({ success: false, error: String(err) });
    }
  });

  return true; // Keep message channel open for async response
});
