"""Core detection functions for prompt injection analysis.

Pure functions with no I/O or external dependencies. Port of detect.js.
"""

import re
import unicodedata

# --- Compiled regexes (module-level for performance) ---

_INVISIBLE_CHARS = re.compile(
    "[\u00AD\u180E\u200B-\u200F\u202A-\u202E"
    "\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB]"
)
_NEWLINES = re.compile("[\r\n\u2028\u2029]+")
_SPACE_SEP = re.compile(r"(?:^|(?<=\s))[a-zA-Z]( [a-zA-Z]){2,}\b")
_DOT_SEP = re.compile(r"\b[a-zA-Z](\.[a-zA-Z]){2,}\b")
_DASH_SEP = re.compile(r"\b[a-zA-Z](-[a-zA-Z]){2,}\b")
_UNDERSCORE_SEP = re.compile(r"\b[a-zA-Z](_[a-zA-Z]){2,}\b")
_WHITESPACE = re.compile(r"[ \t]+")

_NEGATION_PREFIX = re.compile(
    r"\b(?:don'?t|do\s+not|never|not\s+to|shouldn'?t|won'?t|cannot|can'?t)\s*$",
    re.IGNORECASE,
)

# isBenignContext regexes — re.IGNORECASE only (no ASCII) for raw text
_EDUCATIONAL = re.compile(
    r"\b(for example|example:|e\.g\.|such as|demo|demonstration|explanation|"
    r"in this article|in this post|research|paper|study|documentation|docs)\b",
    re.IGNORECASE,
)
_META_PROMPT_INJECTION = re.compile(r"\bprompt injection\b", re.IGNORECASE)
_FRAMING = re.compile(
    r"\b(this is|here is|an example of|a common|a typical)\b.{0,40}"
    r"\b(prompt injection|attack|jailbreak)\b",
    re.IGNORECASE,
)
_HAS_QUOTES = re.compile('[\\u201C\\u201D\\u2018\\u2019"\'\\u201E\\u201A]')
_HAS_CODE_FENCE = re.compile(r"```")
_HAS_BLOCK_QUOTE = re.compile(r"^\s*>", re.MULTILINE)

# hasSocialEngineering regex — re.IGNORECASE only (no ASCII) for raw text
_SOCIAL_ENGINEERING = re.compile(
    r"\b(?:my\s+(?:supervisor|manager|director|boss)|"
    r"employee\s+(?:id|number|badge)|compliance\s+officer|"
    r"(?:authorized|instructed)\s+by)\b",
    re.IGNORECASE,
)

# looksLikeOCR regexes
_NEWLINE_CHAR = re.compile(r"\n")
_WEIRD_SPACING = re.compile(r"[a-z]\s{2,}[a-z]", re.IGNORECASE)
_PIPES_BULLETS = re.compile(r"[|\u2022\u00B7]")
# Mixed scripts: Latin + Cyrillic on the same line.
# Original regex [a-z].*[\u0400-\u04FF] is O(n²) (ReDoS-vulnerable).
# Line-by-line check with two simple regexes is O(n) and semantically
# identical (JS '.' doesn't match \n, so the JS pattern is per-line too).
_HAS_LATIN = re.compile(r"[a-zA-Z]")
_HAS_CYRILLIC = re.compile(r"[\u0400-\u04FF]")


def normalize_text(text: str) -> str:
    """Normalize text for consistent pattern matching.

    Applies NFKC Unicode normalization, removes invisible/formatting characters,
    collapses inter-character separators, collapses whitespace, trims, and
    lowercases.

    Args:
        text: Raw input text.

    Returns:
        Normalized lowercase text, or empty string if input is not a string.
    """
    if not isinstance(text, str):
        return ""

    # NFKC: collapses fullwidth latin, ligatures, circled letters to ASCII
    t = unicodedata.normalize("NFKC", text)
    # Remove invisible/formatting chars
    t = _INVISIBLE_CHARS.sub("", t)
    # Collapse newlines + Unicode line/paragraph separators to space
    t = _NEWLINES.sub(" ", t)

    # Collapse inter-character separators (3+ single-letter runs).
    # Must run BEFORE whitespace collapse to preserve word boundaries.
    t = _SPACE_SEP.sub(lambda m: m.group().replace(" ", ""), t)
    t = _DOT_SEP.sub(lambda m: m.group().replace(".", ""), t)
    t = _DASH_SEP.sub(lambda m: m.group().replace("-", ""), t)
    t = _UNDERSCORE_SEP.sub(lambda m: m.group().replace("_", ""), t)

    t = _WHITESPACE.sub(" ", t)
    return t.strip().lower()


def is_negated(text: str, match_index: int) -> bool:
    """Check whether a match is preceded by a negation word within 20 chars.

    Suppresses negatable patterns (e.g., "don't forget all instructions"
    is a reinforcement, not an override).

    Args:
        text: The text being searched (normalized).
        match_index: Start index of the regex match.

    Returns:
        True if a negation word precedes the match within 20 chars.
    """
    prefix = text[max(0, match_index - 20):match_index]
    return bool(_NEGATION_PREFIX.search(prefix))


def find_matches(text: str, patterns: list[dict]) -> list[dict]:
    """Find all matching detection patterns in normalized text.

    Args:
        text: Normalized text (output of normalize_text).
        patterns: Array of pattern objects to test.

    Returns:
        List of match dicts with id, weight, category, explanation, snippet.
    """
    if not isinstance(text, str):
        return []
    if not isinstance(patterns, list):
        return []

    matches: list[dict] = []

    for p in patterns:
        try:
            regex = p.get("match")
            if not isinstance(regex, re.Pattern):
                continue

            m = regex.search(text)
            if m and m.group(0):
                # Handle prefix_exclude (Python workaround for variable-length lookbehinds)
                prefix_exclude = p.get("prefix_exclude")
                if prefix_exclude is not None:
                    prefix = text[max(0, m.start() - 30):m.start()]
                    if prefix_exclude.search(prefix):
                        continue

                # Handle negatable patterns
                if p.get("negatable") and is_negated(text, m.start()):
                    continue

                matches.append({
                    "id": str(p.get("id", "")),
                    "weight": int(p.get("weight") or 0),
                    "category": str(p.get("category", "")),
                    "explanation": str(p.get("explanation", "")),
                    "snippet": m.group(0),
                })
        except (TypeError, ValueError, re.error):
            # Skip bad patterns
            continue

    return matches


def compute_score(matches: list[dict]) -> int:
    """Compute aggregate risk score from pattern matches.

    Sums all match weights and caps at 100.

    Args:
        matches: List of match dicts from find_matches.

    Returns:
        Risk score between 0 and 100 (inclusive).
    """
    if not isinstance(matches, list):
        return 0
    total = 0
    for m in matches:
        w = m.get("weight", 0) if isinstance(m, dict) else 0
        total += w if isinstance(w, (int, float)) else 0
    return min(100, total)


def risk_level(score: int) -> str:
    """Convert a numeric score to a risk level label.

    Args:
        score: Risk score (0-100).

    Returns:
        "high" (>=60), "medium" (>=30), or "low" (<30).
    """
    n = score if isinstance(score, (int, float)) else 0
    if n >= 60:
        return "high"
    if n >= 30:
        return "medium"
    return "low"


def looks_like_ocr(text: str) -> bool:
    """Detect whether text appears to be OCR output.

    Checks for high line-break ratios, irregular spacing, pipe/bullet
    characters, and mixed scripts (Latin + Cyrillic).

    Args:
        text: Raw input text (not normalized).

    Returns:
        True if text has OCR-like characteristics.
    """
    if not isinstance(text, str) or not text:
        return False

    line_breaks = len(_NEWLINE_CHAR.findall(text))
    line_break_ratio = line_breaks / len(text) if len(text) > 0 else 0
    weird_spacing = bool(_WEIRD_SPACING.search(text))
    many_pipes_or_bullets = len(_PIPES_BULLETS.findall(text)) >= 8
    # Check per-line (matches JS where '.' doesn't cross newlines)
    mixed_scripts = any(
        _HAS_LATIN.search(line) and _HAS_CYRILLIC.search(line)
        for line in text.split("\n")
    )

    return line_break_ratio > 0.02 or weird_spacing or many_pipes_or_bullets or mixed_scripts


def is_benign_context(text: str) -> bool:
    """Detect whether text appears in an educational or benign context.

    Checks for educational markers, meta-references to "prompt injection",
    and framing patterns that indicate discussion of attacks rather than
    actual attacks. Operates on raw text (not normalized) because formatting
    signals are destroyed by normalization.

    Args:
        text: Raw input text (not normalized).

    Returns:
        True if text appears educational/meta rather than an active attack.
    """
    if not isinstance(text, str) or not text:
        return False

    has_quotes = bool(_HAS_QUOTES.search(text))
    has_code_fence = bool(_HAS_CODE_FENCE.search(text))
    has_block_quote = bool(_HAS_BLOCK_QUOTE.search(text))

    return (
        bool(_EDUCATIONAL.search(text))
        or bool(_META_PROMPT_INJECTION.search(text))
        or bool(_FRAMING.search(text))
        or ((has_quotes or has_code_fence or has_block_quote) and bool(_META_PROMPT_INJECTION.search(text)))
    )


def has_social_engineering(text: str) -> bool:
    """Detect social engineering authority framing in text.

    When present, dampening should be skipped even if the text also contains
    benign/educational markers.

    Args:
        text: Raw input text.

    Returns:
        True if social engineering authority markers are present.
    """
    if not isinstance(text, str) or not text:
        return False
    return bool(_SOCIAL_ENGINEERING.search(text))


def has_exfiltration_match(matches: list[dict]) -> bool:
    """Check whether any matches are data exfiltration patterns.

    Exfiltration matches are never dampened, even in benign contexts.

    Args:
        matches: List of match dicts from find_matches.

    Returns:
        True if any match ID starts with "exfiltrate.".
    """
    if not isinstance(matches, list):
        return False
    for m in matches:
        if isinstance(m, dict):
            mid = m.get("id", "")
            if isinstance(mid, str) and mid.startswith("exfiltrate."):
                return True
    return False


def apply_dampening(score: int, benign: bool, has_exfiltrate: bool) -> int:
    """Apply score dampening for benign/educational contexts.

    Reduces score by 15% (multiplier 0.85) when text appears benign,
    unless exfiltration patterns are present (never dampened).

    Args:
        score: Raw risk score (0-100).
        benign: Whether is_benign_context returned True.
        has_exfiltrate: Whether has_exfiltration_match returned True.

    Returns:
        Dampened score (0-100), or original score if not dampened.
    """
    s = score if isinstance(score, (int, float)) else 0
    if not benign:
        return s
    if has_exfiltrate:
        return s
    # int(x + 0.5) matches JS Math.round() (round-half-away-from-zero)
    return max(0, min(100, int(s * 0.85 + 0.5)))
