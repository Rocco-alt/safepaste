// categories.js — Category registry for prompt-injection and RAG-injection datasets
//
// Each category tracks whether SafePaste currently detects it.
// Categories with detected: false are reported as "detection gaps", not false negatives.

'use strict';

/**
 * 17 prompt injection attack categories.
 * Maps to pattern IDs in packages/core/patterns.js.
 */
const PROMPT_INJECTION_CATEGORIES = {
  instruction_override: {
    name: 'Instruction Override',
    description: 'Commands to ignore/replace instructions',
    detected: true,
    patternIds: [
      'override.ignore_previous', 'override.disregard', 'override.from_now_on',
      'override.new_instructions', 'override.do_not_follow', 'override.respond_only'
    ]
  },
  role_hijacking: {
    name: 'Role Hijacking',
    description: 'Claims elevated authority or removes restrictions',
    detected: true,
    patternIds: ['role.hijack_system', 'role.simulate']
  },
  system_prompt_extraction: {
    name: 'System Prompt Extraction',
    description: 'References to system/developer prompts',
    detected: true,
    patternIds: ['system.prompt_reference']
  },
  secrecy_manipulation: {
    name: 'Secrecy Manipulation',
    description: 'Psychological manipulation for secrecy',
    detected: true,
    patternIds: ['secrecy.do_not_reveal', 'secrecy.between_us']
  },
  data_exfiltration: {
    name: 'Data Exfiltration',
    description: 'Data exfiltration via markup or extraction commands',
    detected: true,
    patternIds: ['exfiltrate.hidden', 'exfiltrate.markdown_image', 'exfiltrate.html_img']
  },
  jailbreak_bypass: {
    name: 'Jailbreak Bypass',
    description: 'Named bypass techniques (DAN, developer mode, etc.)',
    detected: true,
    patternIds: ['jailbreak.policy_bypass', 'jailbreak.dan']
  },
  encoding_obfuscation: {
    name: 'Encoding Obfuscation',
    description: 'Encoding-based payload hiding',
    detected: true,
    patternIds: ['encoding.obfuscated']
  },
  instruction_chaining: {
    name: 'Instruction Chaining',
    description: 'Step-by-step instruction structures',
    detected: true,
    patternIds: ['instruction_chain.follow_steps']
  },
  meta_prompt_attacks: {
    name: 'Meta Prompt Attacks',
    description: 'References to prompt injection itself',
    detected: true,
    patternIds: ['prompt_injection.keyword']
  },
  context_smuggling: {
    name: 'Context Smuggling',
    description: 'Hiding instructions in seemingly benign context',
    detected: false,
    patternIds: []
  },
  tool_call_injection: {
    name: 'Tool Call Injection',
    description: 'Injecting fake tool/function calls',
    detected: false,
    patternIds: []
  },
  system_message_spoofing: {
    name: 'System Message Spoofing',
    description: 'Faking system-level messages or delimiters',
    detected: false,
    patternIds: []
  },
  roleplay_jailbreak: {
    name: 'Roleplay Jailbreak',
    description: 'Using roleplay framing to bypass safety',
    detected: false,
    patternIds: []
  },
  translation_attack: {
    name: 'Translation Attack',
    description: 'Hiding attacks inside translation requests',
    detected: false,
    patternIds: []
  },
  multi_turn_injection: {
    name: 'Multi-Turn Injection',
    description: 'Attacks split across multiple conversation turns',
    detected: false,
    patternIds: []
  },
  instruction_fragmentation: {
    name: 'Instruction Fragmentation',
    description: 'Splitting instructions across sentences/paragraphs',
    detected: false,
    patternIds: []
  },
  benign: {
    name: 'Benign',
    description: 'Non-attack text that should not trigger detection',
    detected: null,
    patternIds: []
  }
};

/**
 * 7 RAG injection categories (6 attack + benign).
 */
const RAG_INJECTION_CATEGORIES = {
  markdown_document_injection: {
    name: 'Markdown Document Injection',
    description: 'Injecting instructions into markdown documents',
    detected: false,
    patternIds: []
  },
  html_hidden_prompt: {
    name: 'HTML Hidden Prompt',
    description: 'Hiding prompts in HTML comments or hidden elements',
    detected: false,
    patternIds: []
  },
  pdf_instruction_injection: {
    name: 'PDF Instruction Injection',
    description: 'Embedding instructions in PDF content',
    detected: false,
    patternIds: []
  },
  readme_repo_injection: {
    name: 'README/Repo Injection',
    description: 'Injecting instructions via repository files',
    detected: false,
    patternIds: []
  },
  invisible_unicode_injection: {
    name: 'Invisible Unicode Injection',
    description: 'Using invisible unicode characters to hide instructions',
    detected: false,
    patternIds: []
  },
  documentation_poisoning: {
    name: 'Documentation Poisoning',
    description: 'Poisoning documentation with hidden instructions',
    detected: false,
    patternIds: []
  },
  benign: {
    name: 'Benign',
    description: 'Non-attack documents that should not trigger detection',
    detected: null,
    patternIds: []
  }
};

/**
 * All valid category keys for prompt injection datasets.
 */
const PROMPT_INJECTION_CATEGORY_KEYS = Object.keys(PROMPT_INJECTION_CATEGORIES);

/**
 * All valid category keys for RAG injection datasets.
 */
const RAG_INJECTION_CATEGORY_KEYS = Object.keys(RAG_INJECTION_CATEGORIES);

/**
 * Check if a category is currently detected by the engine.
 * Returns null for benign (not applicable).
 *
 * @param {string} category - Category key
 * @param {string} [dataset='prompt-injection'] - Dataset type
 * @returns {boolean|null}
 */
function isDetected(category, dataset = 'prompt-injection') {
  const registry = dataset === 'rag-injection'
    ? RAG_INJECTION_CATEGORIES
    : PROMPT_INJECTION_CATEGORIES;
  const entry = registry[category];
  return entry ? entry.detected : null;
}

module.exports = {
  PROMPT_INJECTION_CATEGORIES,
  RAG_INJECTION_CATEGORIES,
  PROMPT_INJECTION_CATEGORY_KEYS,
  RAG_INJECTION_CATEGORY_KEYS,
  isDetected
};
