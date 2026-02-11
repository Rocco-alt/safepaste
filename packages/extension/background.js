// background.js — Service worker for icon badge management (FULL FILE)
// No data collection. No network requests. Only manages the extension badge.

var SP_ACTIVE_TABS = {};
var SP_CLEAR_TIMERS = {};

// Content script tells us when SafePaste is active on a tab.
chrome.runtime.onMessage.addListener(function (message, sender) {
  if (!message || message.type !== "safepaste-active") return;
  if (!sender || !sender.tab) return;

  var tabId = sender.tab.id;
  var enabled = !!message.enabled;

  // Cancel any pending badge clear for this tab
  if (SP_CLEAR_TIMERS[tabId]) {
    clearTimeout(SP_CLEAR_TIMERS[tabId]);
    delete SP_CLEAR_TIMERS[tabId];
  }

  SP_ACTIVE_TABS[tabId] = { host: message.host || "", enabled: enabled };

  if (enabled) {
    chrome.action.setBadgeText({ tabId: tabId, text: "ON" });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#22c55e" });
  } else {
    chrome.action.setBadgeText({ tabId: tabId, text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#9ca3af" });
  }
});

// When a page starts loading, don't clear badge immediately.
// Instead, wait a few seconds — the content script will re-register if this is still an AI site.
// This prevents SPA navigations (ChatGPT, etc.) from flickering the badge off.
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (changeInfo.status === "loading") {
    // Mark tab as needing re-registration
    delete SP_ACTIVE_TABS[tabId];

    // Cancel any existing timer
    if (SP_CLEAR_TIMERS[tabId]) {
      clearTimeout(SP_CLEAR_TIMERS[tabId]);
    }

    // Clear badge after a delay if content script doesn't re-register
    SP_CLEAR_TIMERS[tabId] = setTimeout(function () {
      if (!SP_ACTIVE_TABS[tabId]) {
        chrome.action.setBadgeText({ tabId: tabId, text: "" });
      }
      delete SP_CLEAR_TIMERS[tabId];
    }, 5000);
  }
});

// Clean up when tab is closed.
chrome.tabs.onRemoved.addListener(function (tabId) {
  delete SP_ACTIVE_TABS[tabId];
  if (SP_CLEAR_TIMERS[tabId]) {
    clearTimeout(SP_CLEAR_TIMERS[tabId]);
    delete SP_CLEAR_TIMERS[tabId];
  }
});
