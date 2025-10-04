// Background service worker to relay messages between popup and content scripts

// Listen for messages from content script and relay to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message, 'from:', sender);

  // If it's a log message from content script, we need to store it
  // because popup might not be open
  if (message.type === 'LOG') {
    // Store the log
    storeLog(message.logType, message.message, message.meta || {});
  }

  // Try to send to all extension views (popups)
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup not open, that's okay
    console.log('[Background] No popup open to receive message');
  });

  return false;
});

// Store logs in chrome.storage
async function storeLog(type, message, meta) {
  const LOG_KEY = 'pasteTyperLogs';

  try {
    const result = await chrome.storage.local.get(LOG_KEY);
    let logs = result[LOG_KEY] || [];

    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      meta
    };

    logs.unshift(logEntry);

    // Keep only last 100 logs
    if (logs.length > 100) {
      logs = logs.slice(0, 100);
    }

    await chrome.storage.local.set({ [LOG_KEY]: logs });
    console.log('[Background] Log stored:', logEntry);
  } catch (error) {
    console.error('[Background] Error storing log:', error);
  }
}

console.log('[Background] Service worker initialized');
