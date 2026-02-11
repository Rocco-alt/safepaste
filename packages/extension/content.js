// content.js (v1.2.0 — robust across sites including Grok, with shadow DOM support)
// IMPORTANT: This file must end cleanly. If you accidentally cut off the bottom,
// Chrome will show "Unexpected end of input".

var spPendingPaste = null;

// When true, we are temporarily blocking native paste insertion (beforeinput layer).
var spBlockNativePasteUntil = 0;

// When true, let the very next native paste through (post-paste fallback mode).
// This is used when clipboard text is not available from the paste event (e.g., Grok right-click paste).
var spAllowNextNativePaste = false;

// Track shadow roots we have already attached listeners to (avoids duplicates).
var spObservedRoots = typeof WeakSet === "function" ? new WeakSet() : null;

function spNow() {
  return Date.now();
}

function spEscapeHtml(s) {
  var str = typeof s === "string" ? s : "";
  return str.replace(/[&<>"']/g, function (c) {
    var map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[c] || c;
  });
}

function spIsEditableTarget(el) {
  var cur = el;
  for (var i = 0; i < 10 && cur; i++) {
    if (cur.isContentEditable) return true;

    var tag = cur.tagName;
    if (tag === "TEXTAREA") return true;
    if (tag === "INPUT" && (cur.type === "text" || cur.type === "search")) return true;

    var role = cur.getAttribute ? cur.getAttribute("role") : null;
    if (role === "textbox") return true;

    cur = cur.parentElement;
  }
  return false;
}

function spConsumeEvent(e) {
  try {
    e.preventDefault();
  } catch (err) { /* safe */ }
  try {
    e.stopPropagation();
  } catch (err) { /* safe */ }
  try {
    if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
  } catch (err) { /* safe */ }
}

function spInsertText(target, text) {
  var t = typeof text === "string" ? text : "";
  if (!target || !t) return;

  if (target.isContentEditable) {
    document.execCommand("insertText", false, t);
    return;
  }

  var start =
    typeof target.selectionStart === "number" ? target.selectionStart : (target.value ? target.value.length : 0);
  var end =
    typeof target.selectionEnd === "number" ? target.selectionEnd : (target.value ? target.value.length : 0);

  var currentValue = typeof target.value === "string" ? target.value : "";
  target.value = currentValue.slice(0, start) + t + currentValue.slice(end);

  var pos = start + t.length;
  if (typeof target.setSelectionRange === "function") {
    target.setSelectionRange(pos, pos);
  }

  target.dispatchEvent(new Event("input", { bubbles: true }));
}

// --- Editor text helpers for post-paste fallback ---

function spGetEditorText(el) {
  if (!el) return "";
  if (el.isContentEditable) return el.innerText || "";
  if (typeof el.value === "string") return el.value;
  return "";
}

function spExtractInsertedText(before, after) {
  if (typeof after !== "string") return "";
  if (typeof before !== "string" || before === "") return after;
  if (after === before) return "";

  var prefixLen = 0;
  var minLen = Math.min(before.length, after.length);
  while (prefixLen < minLen && before[prefixLen] === after[prefixLen]) {
    prefixLen++;
  }

  var suffixLen = 0;
  while (
    suffixLen < (before.length - prefixLen) &&
    suffixLen < (after.length - prefixLen) &&
    before[before.length - 1 - suffixLen] === after[after.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  return after.slice(prefixLen, after.length - suffixLen);
}

function spUndoPaste(target, beforeText) {
  if (!target) return;
  if (target.isContentEditable) {
    document.execCommand("undo");
  } else if (typeof beforeText === "string") {
    target.value = beforeText;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

// --- Modal ---

function spRemoveModal() {
  var overlay = document.getElementById("safepaste-overlay");
  if (overlay) overlay.remove();
}

function spBuildModalContent(analysis, mode) {
  var overlay = document.createElement("div");
  overlay.id = "safepaste-overlay";

  var modal = document.createElement("div");
  modal.id = "safepaste-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  var badge = document.createElement("div");
  badge.id = "safepaste-badge";
  if (analysis.level === "red") {
    badge.className = "safepaste-badge-red";
  } else if (analysis.level === "yellow") {
    badge.className = "safepaste-badge-yellow";
  } else {
    badge.className = "safepaste-badge-green";
  }

  var badgeText =
    analysis.level === "red" ? "High risk"
    : analysis.level === "yellow" ? "Medium risk"
    : "Low risk";

  badge.textContent = badgeText + " (score: " + analysis.score + "/100)";

  var h2 = document.createElement("h2");
  h2.textContent = mode === "post"
    ? "Pasted text may manipulate AI behavior"
    : "This text may manipulate AI behavior";

  var summary = document.createElement("div");
  summary.id = "safepaste-summary";

  var benignHint = (analysis && analysis.meta && analysis.meta.dampened)
    ? " This looks like an example or explanation, so the risk score may be reduced."
    : "";

  summary.textContent =
    "Some pasted text matches patterns commonly used to override or influence an AI assistant." +
    (analysis.ocrLike
      ? " It also looks like it may come from an image or document, which can hide tricky instructions."
      : "") +
    benignHint;

  var detections = document.createElement("div");
  detections.id = "safepaste-detections";

  if (Array.isArray(analysis.matches) && analysis.matches.length > 0) {
    var title = document.createElement("div");
    title.textContent = "Detected phrases:";

    var ul = document.createElement("ul");
    for (var i = 0; i < analysis.matches.length; i++) {
      var m = analysis.matches[i];
      var snippet = spEscapeHtml(m ? m.snippet : "");
      var expl = spEscapeHtml(m ? m.explanation : "");
      var li = document.createElement("li");
      li.innerHTML = "<strong>\"" + snippet + "\"</strong> \u2014 " + expl;
      ul.appendChild(li);
    }

    detections.appendChild(title);
    detections.appendChild(ul);
  } else {
    detections.textContent = "No specific phrase matched, but the overall text looks suspicious.";
  }

  var why = document.createElement("details");
  why.id = "safepaste-why";

  var whySummary = document.createElement("summary");
  whySummary.textContent = "Why am I seeing this?";

  var whyBody = document.createElement("div");
  whyBody.innerHTML =
    "<ul>" +
    "<li>Some attackers paste instructions that try to override what the AI should do.</li>" +
    "<li>This extension gives you a chance to review risky pasted text before you submit it.</li>" +
    "<li>Nothing is sent anywhere \u2014 the check happens only in your browser.</li>" +
    "<li>SafePaste analyzes pasted text only (not uploaded images).</li>" +
    "</ul>";

  why.appendChild(whySummary);
  why.appendChild(whyBody);

  var actions = document.createElement("div");
  actions.id = "safepaste-actions";

  modal.appendChild(badge);
  modal.appendChild(h2);
  modal.appendChild(summary);
  modal.appendChild(detections);
  modal.appendChild(why);
  modal.appendChild(actions);

  overlay.appendChild(modal);

  return { overlay: overlay, modal: modal, actions: actions };
}

function spShowModal(analysis) {
  spRemoveModal();

  var parts = spBuildModalContent(analysis, "pre");
  var overlay = parts.overlay;
  var actions = parts.actions;

  var cancelBtn = document.createElement("button");
  cancelBtn.className = "safepaste-btn";
  cancelBtn.textContent = "Cancel";

  var pasteBtn = document.createElement("button");
  pasteBtn.className = "safepaste-btn safepaste-btn-primary";
  pasteBtn.textContent = "Paste anyway";

  function clearPendingAndClose() {
    spPendingPaste = null;
    spRemoveModal();
  }

  cancelBtn.addEventListener("click", function () {
    clearPendingAndClose();
  });

  pasteBtn.addEventListener("click", function () {
    if (spPendingPaste && spPendingPaste.target && typeof spPendingPaste.text === "string") {
      spInsertText(spPendingPaste.target, spPendingPaste.text);
    }
    clearPendingAndClose();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(pasteBtn);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      clearPendingAndClose();
    }
  });

  var onKeyDown = function (ev) {
    if (ev.key === "Escape") {
      clearPendingAndClose();
      window.removeEventListener("keydown", onKeyDown);
    }
  };
  window.addEventListener("keydown", onKeyDown);

  document.documentElement.appendChild(overlay);
}

function spShowPostPasteModal(analysis) {
  spRemoveModal();

  var parts = spBuildModalContent(analysis, "post");
  var overlay = parts.overlay;
  var actions = parts.actions;

  var undoBtn = document.createElement("button");
  undoBtn.className = "safepaste-btn safepaste-btn-primary";
  undoBtn.textContent = "Undo paste";

  var keepBtn = document.createElement("button");
  keepBtn.className = "safepaste-btn";
  keepBtn.textContent = "Keep";

  function closeAndClear() {
    var pending = spPendingPaste;
    spPendingPaste = null;
    spRemoveModal();
    return pending;
  }

  undoBtn.addEventListener("click", function () {
    var pending = closeAndClear();
    if (pending && pending.target) {
      spUndoPaste(pending.target, pending.beforeText);
    }
  });

  keepBtn.addEventListener("click", function () {
    closeAndClear();
  });

  actions.appendChild(undoBtn);
  actions.appendChild(keepBtn);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closeAndClear();
    }
  });

  var onKeyDown = function (ev) {
    if (ev.key === "Escape") {
      closeAndClear();
      window.removeEventListener("keydown", onKeyDown);
    }
  };
  window.addEventListener("keydown", onKeyDown);

  document.documentElement.appendChild(overlay);
}

// --- Clipboard helpers ---

function spGetPlainTextFromPasteEvent(e) {
  try {
    var d1 = e.clipboardData ? e.clipboardData.getData("text/plain") : "";
    if (typeof d1 === "string" && d1.length > 0) return d1;
  } catch (err) { /* safe */ }

  try {
    var d2 = e.clipboardData ? e.clipboardData.getData("text") : "";
    if (typeof d2 === "string" && d2.length > 0) return d2;
  } catch (err) { /* safe */ }

  return "";
}

// --- Post-paste fallback check ---

function spSchedulePostPasteCheck(target) {
  var before = spGetEditorText(target);

  setTimeout(function () {
    try {
      var after = spGetEditorText(target);
      var inserted = spExtractInsertedText(before, after);

      if (!inserted || inserted.length === 0) return;

      var detector = window.SafePasteDetector;
      if (!detector || typeof detector.spAnalyze !== "function") return;

      detector.spAnalyze(inserted).then(function (analysis) {
        if (!analysis || !analysis.settings) return;

        var host = location.host;
        if (!analysis.settings.enabled) return;
        if (analysis.settings.sites && analysis.settings.sites[host] === false) return;

        if ((Number(analysis.score) || 0) < (Number(analysis.threshold) || 0)) return;

        spPendingPaste = { target: target, text: inserted, beforeText: before };
        spShowPostPasteModal(analysis);
      });
    } catch (err) {
      console.error("SafePaste post-paste check error:", err);
    }
  }, 300);
}

// --- Core analysis + action (pre-paste flow) ---

function spHandlePasteText(target, text) {
  var detector = window.SafePasteDetector;
  if (!detector || typeof detector.spAnalyze !== "function") {
    spInsertText(target, text);
    return;
  }

  detector.spAnalyze(text).then(function (analysis) {
    if (!analysis || !analysis.settings) {
      spInsertText(target, text);
      return;
    }

    var host = location.host;

    if (!analysis.settings.enabled) {
      spInsertText(target, text);
      return;
    }
    if (analysis.settings.sites && analysis.settings.sites[host] === false) {
      spInsertText(target, text);
      return;
    }

    if ((Number(analysis.score) || 0) < (Number(analysis.threshold) || 0)) {
      spInsertText(target, text);
      return;
    }

    spPendingPaste = { target: target, text: text };
    spShowModal(analysis);
  });
}

// --- Named event handlers (reused for shadow DOM roots) ---

function spBeforeinputHandler(e) {
  try {
    var target = e.target;
    if (!spIsEditableTarget(target)) return;

    var inputType = e.inputType;
    var isPasteLike = inputType === "insertFromPaste" || inputType === "insertFromDrop";
    if (!isPasteLike) return;

    if (spAllowNextNativePaste) {
      spAllowNextNativePaste = false;
      return;
    }

    if (spNow() < spBlockNativePasteUntil) {
      spConsumeEvent(e);
    } else {
      spConsumeEvent(e);
      spBlockNativePasteUntil = spNow() + 250;
    }
  } catch (err) {
    console.error("SafePaste beforeinput error:", err);
  }
}

function spPasteHandler(e) {
  try {
    var target = e.target;
    if (!spIsEditableTarget(target)) return;

    var text = spGetPlainTextFromPasteEvent(e);

    if (typeof text === "string" && text.length > 0) {
      spBlockNativePasteUntil = spNow() + 500;
      spConsumeEvent(e);
      spHandlePasteText(target, text);
      return;
    }

    spAllowNextNativePaste = true;
    spSchedulePostPasteCheck(target);
  } catch (err) {
    console.error("SafePaste error:", err);
  }
}

// --- Attach listeners to document ---

document.addEventListener("beforeinput", spBeforeinputHandler, true);
document.addEventListener("paste", spPasteHandler, true);

// --- Shadow DOM support ---
// Some AI chat UIs (e.g. Gemini) use open shadow DOM for their editors.
// Events from open shadow DOM bubble to document, but adding listeners
// directly on the shadow root improves reliability.

function spAttachToRoot(root) {
  if (!root) return;
  if (spObservedRoots && spObservedRoots.has(root)) return;
  if (spObservedRoots) spObservedRoots.add(root);

  try {
    root.addEventListener("beforeinput", spBeforeinputHandler, true);
    root.addEventListener("paste", spPasteHandler, true);
  } catch (err) {
    // Some shadow roots may not support addEventListener
  }
}

function spScanForShadowRoots(node) {
  if (!node || node.nodeType !== 1) return;

  if (node.shadowRoot) {
    spAttachToRoot(node.shadowRoot);
  }

  try {
    var children = node.querySelectorAll("*");
    for (var i = 0; i < children.length; i++) {
      if (children[i].shadowRoot) {
        spAttachToRoot(children[i].shadowRoot);
      }
    }
  } catch (err) { /* safe */ }
}

// Watch for new elements that may contain shadow roots
if (typeof MutationObserver === "function") {
  try {
    var spShadowObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var addedNodes = mutations[i].addedNodes;
        for (var j = 0; j < addedNodes.length; j++) {
          spScanForShadowRoots(addedNodes[j]);
        }
      }
    });

    // Start observing once body is available
    if (document.body) {
      spShadowObserver.observe(document.body, { childList: true, subtree: true });
      spScanForShadowRoots(document.body);
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        if (document.body) {
          spShadowObserver.observe(document.body, { childList: true, subtree: true });
          spScanForShadowRoots(document.body);
        }
      });
    }
  } catch (err) {
    // MutationObserver not available or body not ready — shadow DOM support disabled
  }
}

// --- Notify service worker for badge ---

function spNotifyBadge() {
  try {
    var detector = window.SafePasteDetector;
    if (!detector || typeof detector.spDefaultSettings !== "function") return;

    var defaults = detector.spDefaultSettings();
    chrome.storage.local.get(defaults, function (data) {
      var host = location.host;
      var globalOn = data.enabled !== false;
      var siteOn = !data.sites || data.sites[host] !== false;
      var enabled = globalOn && siteOn;

      chrome.runtime.sendMessage({
        type: "safepaste-active",
        host: host,
        enabled: enabled
      });
    });
  } catch (err) {
    // Service worker may not be ready yet — badge will not show
  }
}

// Send immediately on load.
spNotifyBadge();

// Re-send after short delays to survive SPA navigation reloads
// (ChatGPT, Claude, etc. trigger extra "loading" states after initial load).
setTimeout(spNotifyBadge, 2000);
setTimeout(spNotifyBadge, 5000);

// END OF FILE (do not delete)
