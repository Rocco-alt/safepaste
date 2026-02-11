// popup.js (FULL FILE)

var SP_SUPPORTED_HOSTS = {
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "claude.ai": "Claude",
  "gemini.google.com": "Gemini",
  "copilot.microsoft.com": "Copilot",
  "chat.groq.com": "Groq Chat",
  "console.groq.com": "Groq Console",
  "grok.com": "Grok"
};

function spDefaultSettings() {
  return {
    enabled: true,
    strictMode: false,
    warnThresholdMode: "yellow",
    sites: {
      "chatgpt.com": true,
      "chat.openai.com": true,
      "claude.ai": true,
      "gemini.google.com": true,
      "copilot.microsoft.com": true,
      "chat.groq.com": true,
      "console.groq.com": true,
      "grok.com": true
    }
  };
}

function spGetHost(url) {
  try {
    return new URL(url).host;
  } catch (err) {
    return "";
  }
}

function spInit() {
  var defaults = spDefaultSettings();

  chrome.storage.local.get(defaults, function (settings) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = (tabs && tabs[0]) || {};
      var url = tab.url || "";
      var host = spGetHost(url);
      var siteName = SP_SUPPORTED_HOSTS[host] || "";
      var isSupported = !!siteName;

      var statusEl = document.getElementById("status");
      var siteToggleRow = document.getElementById("siteToggleRow");
      var siteToggle = document.getElementById("siteToggle");
      var siteToggleLabel = document.getElementById("siteToggleLabel");
      var globalToggle = document.getElementById("globalToggle");

      globalToggle.checked = !!settings.enabled;

      function updateStatus() {
        if (!isSupported) {
          statusEl.className = "status status-nosite";
          statusEl.innerHTML = '<span class="dot dot-gray"></span> Not an AI chat site';
          return;
        }
        var siteOn = settings.sites && settings.sites[host] !== false;
        var active = settings.enabled && siteOn;
        if (active) {
          statusEl.className = "status status-active";
          statusEl.innerHTML = '<span class="dot dot-green"></span> Active on ' + siteName;
        } else {
          statusEl.className = "status status-inactive";
          statusEl.innerHTML = '<span class="dot dot-red"></span> Disabled on ' + siteName;
        }
      }

      if (isSupported) {
        var siteEnabled = settings.sites && settings.sites[host] !== false;
        siteToggleRow.style.display = "flex";
        siteToggle.checked = siteEnabled;
        siteToggleLabel.textContent = "Enable on " + siteName;

        siteToggle.addEventListener("change", function () {
          var sites = settings.sites || {};
          sites[host] = !!siteToggle.checked;
          settings.sites = sites;
          chrome.storage.local.set({ sites: sites }, function () {
            updateStatus();
          });
        });
      } else {
        siteToggleRow.style.display = "none";
      }

      globalToggle.addEventListener("change", function () {
        settings.enabled = !!globalToggle.checked;
        chrome.storage.local.set({ enabled: settings.enabled }, function () {
          updateStatus();
        });
      });

      updateStatus();
    });
  });

  document.getElementById("settingsLink").addEventListener("click", function (e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

spInit();
