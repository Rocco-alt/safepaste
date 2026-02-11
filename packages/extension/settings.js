// settings.js (FULL FILE)

function defaultSettings() {
  return {
    enabled: true,
    strictMode: false,
    warnThresholdMode: "yellow", // "yellow" | "red" | "off"
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

function safeMode(v) {
  return v === "yellow" || v === "red" || v === "off" ? v : "yellow";
}

function loadSettings() {
  var defaults = defaultSettings();
  return new Promise(function (resolve) {
    try {
      chrome.storage.local.get(defaults, function (data) {
        document.getElementById("enabled").checked = !!data.enabled;
        document.getElementById("strictMode").checked = !!data.strictMode;

        var modeSelect = document.getElementById("warnThresholdMode");
        modeSelect.value = safeMode(data.warnThresholdMode);

        var toggles = document.querySelectorAll(".siteToggle");
        for (var i = 0; i < toggles.length; i++) {
          var cb = toggles[i];
          var host = cb.dataset.host;
          cb.checked = data.sites && data.sites[host] !== false;
        }
        resolve();
      });
    } catch (err) {
      resolve();
    }
  });
}

function saveSettings() {
  var enabled = !!document.getElementById("enabled").checked;
  var strictMode = !!document.getElementById("strictMode").checked;

  var modeSelect = document.getElementById("warnThresholdMode");
  var warnThresholdMode = safeMode(modeSelect && modeSelect.value);

  var sites = {};
  var toggles = document.querySelectorAll(".siteToggle");
  for (var i = 0; i < toggles.length; i++) {
    var cb = toggles[i];
    var host = cb.dataset.host;
    if (host) {
      sites[host] = !!cb.checked;
    }
  }

  return new Promise(function (resolve) {
    try {
      chrome.storage.local.set(
        { enabled: enabled, strictMode: strictMode, warnThresholdMode: warnThresholdMode, sites: sites },
        function () { resolve(); }
      );
    } catch (err) {
      resolve();
    }
  });
}

document.addEventListener("change", function (e) {
  if (
    e.target &&
    e.target.matches &&
    e.target.matches("#enabled, #strictMode, #warnThresholdMode, .siteToggle")
  ) {
    saveSettings();
  }
});

loadSettings();
