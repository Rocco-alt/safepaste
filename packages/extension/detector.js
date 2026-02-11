// detector.js — Extension detection wrapper
// Uses SafePasteCore (from detect-core.js) for shared detection logic.
// Adds: Chrome settings, threshold computation, risk-level color mapping, async analyze.

(function () {
  "use strict";

  var core = window.SafePasteCore;

  // --- Risk level: map canonical labels to extension UI colors ---

  var RISK_COLOR_MAP = { high: "red", medium: "yellow", low: "green" };

  function spRiskLevel(score) {
    var level = core.riskLevel(score);
    return RISK_COLOR_MAP[level] || "green";
  }

  // --- Settings (extension-specific, uses chrome.storage) ---

  function spDefaultSettings() {
    return {
      enabled: true,
      strictMode: false,

      // "yellow" => warn on Yellow or Red (default)
      // "red"    => warn only on Red
      // "off"    => never warn (still normal paste behavior)
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

  function spGetSettings() {
    var defaults = spDefaultSettings();
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(defaults, function (data) {
          var out = spDefaultSettings();

          out.enabled = typeof data.enabled === "boolean" ? data.enabled : out.enabled;
          out.strictMode = typeof data.strictMode === "boolean" ? data.strictMode : out.strictMode;

          var mode = data.warnThresholdMode;
          out.warnThresholdMode = mode === "yellow" || mode === "red" || mode === "off" ? mode : out.warnThresholdMode;

          var sites = data && typeof data.sites === "object" && data.sites ? data.sites : {};
          out.sites = {};
          var defaultSites = spDefaultSettings().sites;
          var key;
          for (key in defaultSites) {
            out.sites[key] = defaultSites[key];
          }
          for (key in sites) {
            out.sites[key] = sites[key];
          }

          resolve(out);
        });
      } catch (err) {
        resolve(defaults);
      }
    });
  }

  function spComputeThreshold(settings) {
    var strict = !!(settings && settings.strictMode);
    var mode = settings && settings.warnThresholdMode;

    if (mode === "off") return 101;
    if (mode === "red") return strict ? 55 : 60;
    return strict ? 25 : 35;
  }

  // --- Main analysis (async, wraps shared core functions) ---

  function spAnalyze(pastedText) {
    return spGetSettings().then(function (settings) {
      var text = typeof pastedText === "string" ? pastedText : "";
      var patterns = Array.isArray(window.SAFEPASTE_PATTERNS) ? window.SAFEPASTE_PATTERNS : [];

      var normalized = core.normalizeText(text);
      var matches = core.findMatches(text, patterns);

      var rawScore = core.computeScore(matches);
      var ocrLike = core.looksLikeOCR(text);

      var benign = core.isBenignContext(text);
      var hasExfiltrate = core.hasExfiltrationMatch(matches);
      var score = core.applyDampening(rawScore, benign, hasExfiltrate);

      var level = spRiskLevel(score);
      var threshold = spComputeThreshold(settings);

      return {
        settings: settings,
        normalized: normalized,
        matches: matches,
        score: score,
        level: level,
        ocrLike: ocrLike,
        threshold: threshold,

        meta: {
          rawScore: rawScore,
          benignContext: benign,
          dampened: benign && !hasExfiltrate
        }
      };
    });
  }

  window.SafePasteDetector = {
    spAnalyze: spAnalyze,
    spNormalizeText: core.normalizeText,
    spDefaultSettings: spDefaultSettings
  };
})();
