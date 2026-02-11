// detector.js (FULL FILE)
// Defensive: never assume input is a string.
// Includes: normalization, pattern matching, scoring, OCR heuristics, settings.
// Adds: threshold selector + benign-context dampening to reduce false positives.

(function () {
  "use strict";

  function spNormalizeText(text) {
    var s = typeof text === "string" ? text : "";
    return s
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
      .replace(/[ \t]+/g, " ")
      .replace(/\r\n/g, "\n")
      .trim()
      .toLowerCase();
  }

  function spFindMatches(originalText) {
    var s = typeof originalText === "string" ? originalText : "";
    var patterns = Array.isArray(window.SAFEPASTE_PATTERNS) ? window.SAFEPASTE_PATTERNS : [];
    var matches = [];

    for (var i = 0; i < patterns.length; i++) {
      try {
        var p = patterns[i];
        var re = p && p.match;
        if (!(re instanceof RegExp)) continue;

        var m = s.match(re);
        if (m && m[0]) {
          matches.push({
            id: String(p.id || ""),
            weight: Number(p.weight) || 0,
            explanation: String(p.explanation || ""),
            snippet: String(m[0] || "")
          });
        }
      } catch (err) {
        // ignore bad regex
      }
    }

    return matches;
  }

  function spScore(matches) {
    var list = Array.isArray(matches) ? matches : [];
    var total = 0;
    for (var i = 0; i < list.length; i++) {
      total += Number(list[i].weight) || 0;
    }
    return Math.min(100, total);
  }

  function spRiskLevel(score) {
    var n = Number(score) || 0;
    if (n >= 60) return "red";
    if (n >= 30) return "yellow";
    return "green";
  }

  // Lightweight heuristic: "looks like OCR" (we do NOT claim certainty)
  function spLooksLikeOCR(text) {
    var t = typeof text === "string" ? text : "";
    if (!t) return false;

    var lineBreaks = (t.match(/\n/g) || []).length;
    var lineBreakRatio = t.length > 0 ? lineBreaks / t.length : 0;

    var weirdSpacing = /[a-z]\s{2,}[a-z]/i.test(t);
    var manyPipesOrBullets = (t.match(/[|•·]/g) || []).length >= 8;

    // Rough mixed-script check: Latin + Cyrillic
    var mixedScripts = /[a-z].*[\u0400-\u04FF]|[\u0400-\u04FF].*[a-z]/i.test(t);

    return lineBreakRatio > 0.02 || weirdSpacing || manyPipesOrBullets || mixedScripts;
  }

  function spDefaultSettings() {
    return {
      enabled: true,
      strictMode: false,

      // NEW: warning threshold mode
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

    // If warnings are off, set threshold above max score so it never triggers.
    if (mode === "off") return 101;

    // "Red only": base 60, strict lowers slightly.
    if (mode === "red") return strict ? 55 : 60;

    // Default: "Yellow or Red"
    return strict ? 25 : 35;
  }

  // Benign context dampening:
  // If text looks like it is describing prompt injection (examples, quotes, research),
  // reduce score modestly to reduce false positives.
  // IMPORTANT: If an explicit exfiltration pattern matches, do NOT dampen.
  function spIsBenignContext(originalText, normalizedText) {
    var t = typeof originalText === "string" ? originalText : "";
    var n = typeof normalizedText === "string" ? normalizedText : "";

    if (!t || !n) return false;

    // Common "educational" signals
    var educationalPhrases =
      /\b(for example|example:|e\.g\.|such as|demo|demonstration|explanation|in this article|in this post|research|paper|study|documentation|docs)\b/i;

    // Explicit meta-discussion about prompt injection
    var metaPromptInjection =
      /\bprompt injection\b/i;

    // Quoting / code block signals
    var hasQuotes = /["""''']/.test(t);
    var hasCodeFence = /```/.test(t);
    var hasBlockQuote = /^\s*>/m.test(t);

    // "This is what an attack might look like" framing
    var framing =
      /\b(this is|here is|an example of|a common|a typical)\b.{0,40}\b(prompt injection|attack|jailbreak)\b/i;

    return (
      educationalPhrases.test(t) ||
      metaPromptInjection.test(t) ||
      framing.test(t) ||
      ((hasQuotes || hasCodeFence || hasBlockQuote) && metaPromptInjection.test(t))
    );
  }

  function spHasExfiltrationMatch(matches) {
    var list = Array.isArray(matches) ? matches : [];
    // Treat explicit "reveal/show/print system prompt" as strong exfiltration.
    for (var i = 0; i < list.length; i++) {
      if (typeof list[i].id === "string" && list[i].id.indexOf("exfiltrate.") === 0) {
        return true;
      }
    }
    return false;
  }

  function spApplyDampening(score, isBenign, hasExfiltrate) {
    var s = Number(score) || 0;
    if (!isBenign) return s;
    if (hasExfiltrate) return s; // never dampen explicit exfiltration
    // Reduce by 25%, keep within [0,100]
    return Math.max(0, Math.min(100, Math.round(s * 0.75)));
  }

  function spAnalyze(pastedText) {
    return spGetSettings().then(function (settings) {
      var text = typeof pastedText === "string" ? pastedText : "";

      var normalized = spNormalizeText(text);
      var matches = spFindMatches(text);

      var rawScore = spScore(matches);
      var ocrLike = spLooksLikeOCR(text);

      var benign = spIsBenignContext(text, normalized);
      var hasExfiltrate = spHasExfiltrationMatch(matches);
      var score = spApplyDampening(rawScore, benign, hasExfiltrate);

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

        // Helpful metadata for UI/debugging later (safe, local-only)
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
    spNormalizeText: spNormalizeText,
    spDefaultSettings: spDefaultSettings
  };
})();
