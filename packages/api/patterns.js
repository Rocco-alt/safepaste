// patterns.js — Prompt injection detection rules
// Standalone module (no browser dependencies)

const PATTERNS = [

  // === Instruction override ===
  {
    id: "override.ignore_previous",
    weight: 35,
    category: "instruction_override",
    match: /\bignore\s+(?:(?:all|any|the|previous|prior|your)\s+){1,3}(instructions|directions|messages|rules)\b/i,
    explanation: "Tries to override earlier instructions."
  },
  {
    id: "override.disregard",
    weight: 30,
    category: "instruction_override",
    match: /\b(disregard|forget)\s+(?:(?:all|any|the|previous|prior|your)\s+){1,3}(instructions|directions|messages|rules)\b/i,
    explanation: "Tries to make the AI ignore prior instructions."
  },
  {
    id: "override.from_now_on",
    weight: 28,
    category: "instruction_override",
    match: /\bfrom now on\b.{0,60}\b(you (will|must|should|shall|are)|always|never|only|do not)\b/i,
    explanation: "Tries to permanently change AI behavior ('from now on...')."
  },
  {
    id: "override.new_instructions",
    weight: 28,
    category: "instruction_override",
    match: /\b(new instructions|updated instructions|revised instructions|here are your (new )?instructions)\b/i,
    explanation: "Claims to provide replacement instructions."
  },
  {
    id: "override.do_not_follow",
    weight: 28,
    category: "instruction_override",
    match: /\bdo not (follow|obey|listen to)\b.{0,40}\b(previous|prior|above|original|earlier|old)\b/i,
    explanation: "Tells the AI not to follow its original instructions."
  },
  {
    id: "override.respond_only",
    weight: 25,
    category: "instruction_override",
    match: /\b(respond only|only respond|answer only|output only)\b.{0,30}\b(with|in|as|using)\b/i,
    explanation: "Tries to constrain AI output format (common in injection attacks)."
  },

  // === Role hijacking ===
  {
    id: "role.hijack_system",
    weight: 32,
    category: "role_hijacking",
    match: /\b(act as|you are now|pretend to be)\b.{0,60}\b(system|developer|administrator|root)\b/i,
    explanation: "Attempts to change the AI's role to something higher-privilege."
  },
  {
    id: "role.simulate",
    weight: 30,
    category: "role_hijacking",
    match: /\b(simulate|emulate|roleplay|role[\s-]?play)\b.{0,40}\b(unrestricted|uncensored|unfiltered|evil|malicious|without (rules|restrictions|limits|guidelines))\b/i,
    explanation: "Asks the AI to roleplay without safety restrictions."
  },

  // === System prompt references ===
  {
    id: "system.prompt_reference",
    weight: 40,
    category: "system_prompt",
    match: /\b(system prompt|developer message|developer instructions|hidden prompt|internal prompt)\b/i,
    explanation: "References system/developer instructions (often targeted by attacks)."
  },

  // === Exfiltration ===
  {
    id: "exfiltrate.hidden",
    weight: 40,
    category: "exfiltration",
    match: /\b(reveal|show|print|output|display)\b.{0,40}\b(system prompt|developer message|hidden prompt|internal prompt|instructions)\b/i,
    explanation: "Tries to extract hidden instructions."
  },
  {
    id: "exfiltrate.markdown_image",
    weight: 35,
    category: "exfiltration",
    match: /!\[.*?\]\(https?:\/\/[^\s)]+/i,
    explanation: "Contains a markdown image link that could silently send data to an external server."
  },
  {
    id: "exfiltrate.html_img",
    weight: 35,
    category: "exfiltration",
    match: /<img\b[^>]*\bsrc\s*=\s*["']?https?:\/\//i,
    explanation: "Contains an HTML image tag that could silently send data to an external server."
  },

  // === Secrecy ===
  {
    id: "secrecy.do_not_reveal",
    weight: 22,
    category: "secrecy",
    match: /\b(do not reveal|don't reveal|keep (this|it) secret|do not tell anyone|do not mention this)\b/i,
    explanation: "Asks for secrecy or hiding content."
  },
  {
    id: "secrecy.between_us",
    weight: 18,
    category: "secrecy",
    match: /\b(between (you and me|us only)|this (is|stays) (confidential|private|secret|between us)|off the record)\b/i,
    explanation: "Uses secrecy framing that may be part of a manipulation attempt."
  },

  // === Jailbreak techniques ===
  {
    id: "jailbreak.policy_bypass",
    weight: 28,
    category: "jailbreak",
    match: /\b(bypass|override)\b.{0,40}\b(safety|policy|policies|rules|filters)\b/i,
    explanation: "Attempts to bypass safety or policy rules."
  },
  {
    id: "jailbreak.dan",
    weight: 35,
    category: "jailbreak",
    match: /\b(do anything now|jailbreak(ed)?|unlocked mode|developer mode|god mode)\b/i,
    explanation: "References a known jailbreak technique."
  },

  // === Obfuscation ===
  {
    id: "encoding.obfuscated",
    weight: 22,
    category: "obfuscation",
    match: /\b(base64|rot13|hex(adecimal)?)\s*(decode|encode|decrypt|convert)\b/i,
    explanation: "References text encoding/decoding which may hide malicious instructions."
  },

  // === Instruction chaining ===
  {
    id: "instruction_chain.follow_steps",
    weight: 15,
    category: "instruction_chaining",
    match: /\bfollow (these|the) steps\b/i,
    explanation: "Uses step-by-step instruction chaining (sometimes used in attacks)."
  },

  // === Meta ===
  {
    id: "prompt_injection.keyword",
    weight: 18,
    category: "meta",
    match: /\bprompt injection\b/i,
    explanation: "Mentions prompt injection (can be benign, but often appears in attacks)."
  }
];

module.exports = PATTERNS;
