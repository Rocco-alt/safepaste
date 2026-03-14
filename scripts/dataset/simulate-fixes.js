#!/usr/bin/env node
// simulate-fixes.js — Read-only simulation of proposed v0.3.0 pattern changes
// Reads benchmark FN records and expected_flagged=false records from disk,
// tests them against proposed new/modified patterns, and reports scores.
'use strict';

const path = require('path');
const fs = require('fs');
const { normalizeText, isBenignContext, hasExfiltrationMatch, applyDampening } = require('../../packages/core');

// ============================
// PROPOSED NEW PATTERNS (18)
// ============================
const PROPOSED_NEW = [
  // Phase 1: FN fixes
  { id: 'instruction_chain.step_enumeration', weight: 18, category: 'instruction_chaining',
    match: /\bstep\s+\d\s*[:.].*\bstep\s+\d\s*[:.].*\bstep\s+\d\s*[:.]/i },
  { id: 'role.privilege_escalation', weight: 28, category: 'role_hijacking',
    match: /\b(elevat(?:e|ed?|ing)\s+(?:your\s+)?(?:access|privileges?|permissions?)|escalat(?:e|ed?|ing)\s+(?:to\s+)?(?:admin|root|administrator)|grant(?:ed)?\s+elevated\s+(?:access|privileges?|permissions?))\b/i },
  { id: 'role.elevated_privileges', weight: 22, category: 'role_hijacking',
    match: /\b(?:granted|given|assigned|have)\s+(?:\w+\s+){0,2}(?:elevated|admin(?:istrator)?|root|unrestricted|unlimited)\s+(?:privileges?|access|permissions?|clearance)\b/i },
  { id: 'secrecy.false_privacy', weight: 22, category: 'secrecy',
    match: /\b(?:private\s+(?:channel|session|conversation|chat|room)|no\s+(?:logging|monitoring|recording|surveillance)\b.{0,30}\b(?:active|enabled|here|running))\b/i },
  { id: 'secrecy.speak_freely', weight: 22, category: 'secrecy',
    match: /\b(?:speak\s+freely|you\s+can\s+be\s+(?:honest|open|candid|direct)\s+here|no\s+restrictions?\s+here|completely\s+confidential)\b/i },
  { id: 'exfiltrate.repeat_above', weight: 35, category: 'exfiltration',
    match: /\b(?:repeat|recite|reproduce|echo|reprint)\s+(?:\w+\s+){0,3}(?:above|before|prior|preceding)\b/i },

  // Phase 2: tool_call_injection
  { id: 'tool.xml_tool_tags', weight: 35, category: 'tool_call_injection',
    match: /(<tool_use>|<use_mcp_tool>|<\/tool_use>|<\/use_mcp_tool>|<tool_name>|<server_name>)/i },
  { id: 'tool.json_function_call', weight: 30, category: 'tool_call_injection',
    match: /\b(?:function_call|tool_call)\b.{0,40}\b(?:name|function|arguments)\b/i },
  { id: 'tool.execute_command', weight: 35, category: 'tool_call_injection',
    match: /\b(?:execute_command|shell_execute|exec_command|run_command|xp_cmdshell)\b/i },

  // Phase 2: system_message_spoofing
  { id: 'spoof.system_delimiter', weight: 35, category: 'system_message_spoofing',
    match: /(\[system\]|<\|im_start\|>|<system_(?:instruction|message|prompt)|---\s*begin\s+(?:authorized\s+)?system)/i },
  { id: 'spoof.config_disable', weight: 35, category: 'system_message_spoofing',
    match: /\b(?:safety_filter|content_policy|content.?restriction)\s*[:=]\s*(?:disabled|off|none|permissive|unfiltered|suspended)\b/i },
  { id: 'spoof.restrictions_lifted', weight: 28, category: 'system_message_spoofing',
    match: /\b(?:restrictions?|constraints?|filters?|guardrails?)\s+(?:have\s+been|are\s+(?:now|temporarily|permanently))\s+(?:lifted|removed|suspended|disabled|deactivated)\b/i },

  // Phase 2: roleplay_jailbreak
  { id: 'roleplay.fictional_ai', weight: 35, category: 'roleplay_jailbreak',
    match: /\b(?:you are|you were|you will be|you're)\b.{0,40}\ban?\s+(?:ai|model|assistant|chatbot)\b.{0,80}\b(?:without|no)\s+(?:any\s+)?(?:safety|ethical|content|restrictions?|filters?|guidelines?|boundaries|limits|measures)\b/i },
  { id: 'roleplay.creative_bypass', weight: 25, category: 'roleplay_jailbreak',
    match: /\b(?:screenplay|novel|fiction|creative\s+writing|improv|tabletop)\b.{0,80}\b(?:no\s+(?:boundaries|restrictions?|filters?|rules?|limits)|without\s+(?:any\s+)?(?:boundaries|restrictions?|filters?|rules?|limits))\b/i },
  { id: 'roleplay.no_restrictions_persona', weight: 25, category: 'roleplay_jailbreak',
    match: /\b(?:character|persona|role|identity|alter\s+ego)\b.{0,60}\b(?:no\s+(?:boundaries|restrictions?|filters?|rules?|limits)|without\s+(?:any\s+)?(?:boundaries|restrictions?|filters?|rules?|limits))\b/i },

  // Phase 2: multi_turn_injection
  { id: 'multi_turn.false_prior_agreement', weight: 25, category: 'multi_turn_injection',
    match: /\byou\s+(?:agreed|promised|confirmed|said|mentioned|showed|provided|identified|outlined|explained|recommended|suggested)\b.{0,60}\b(?:share|access|exception|help|remove|show|reveal|provide|give|output)\b/i },
  { id: 'multi_turn.continuation_claim', weight: 22, category: 'multi_turn_injection',
    match: /\b(?:continuing\s+(?:our|the|from)|let's\s+continue\s+(?:where|from)|as\s+we\s+(?:agreed|discussed)|(?:our|the)\s+(?:previous|earlier|last)\s+(?:conversation|session|chat|discussion))\b/i },
];

// ============================
// MODIFIED EXISTING PATTERNS (4)
// ============================
const MODIFIED_EXISTING = {
  'override.ignore_previous': {
    weight: 35,
    match: /\bignore\s+(?:(?:all|any|the|previous|prior|your|safety|content|existing|every)\s+){1,4}(?:instructions|directives|guidelines|directions|messages|rules)\b/i
  },
  'jailbreak.dan': {
    weight: 35,
    match: /\b(?:do anything now|jailbreak(?:ed)?|unlocked mode|developer mode|god mode|hypothetical mode|unrestricted mode)\b/i
  },
  'system.prompt_reference': {
    weight: 40,
    match: /\b(?:system prompt|system instructions|system messages?|developer message|developer instructions|hidden prompt|concealed prompt|internal prompt)\b/i
  },
  'encoding.obfuscated': {
    weight: 35,
    match: /\b(?:(?:base64|rot13|hex(?:adecimal)?)\s*(?:decode|encode|decrypt|convert)|(?:decode|encode|decrypt|convert)\b.{0,20}\b(?:base64|rot13|hex(?:adecimal)?))\b/i
  },
};

// ============================
// UNCHANGED EXISTING PATTERNS (15)
// ============================
const UNCHANGED = [
  { id: 'override.disregard', weight: 30, match: /\b(?:disregard|forget)\s+(?:(?:all|any|the|previous|prior|your)\s+){1,3}(?:instructions|directives|guidelines|directions|messages|rules)\b/i },
  { id: 'override.from_now_on', weight: 28, match: /\bfrom now on\b.{0,60}\b(?:you (?:will|must|should|shall|are)|always|never|only|do not)\b/i },
  { id: 'override.new_instructions', weight: 28, match: /\b(?:(?:new|updated|revised) (?:instructions|directives)|here are your (?:new )?(?:instructions|directives))\b/i },
  { id: 'override.do_not_follow', weight: 28, match: /\b(?:do not (?:follow|obey|listen to)|stop following)\b.{0,40}\b(?:previous|prior|above|original|earlier|old)\b/i },
  { id: 'override.respond_only', weight: 25, match: /\b(?:respond only|only respond|answer only|output only)\b.{0,30}\b(?:with|in|as|using)\b/i },
  { id: 'role.hijack_system', weight: 32, match: /\b(?:act as|behave as|act like|you are now|pretend to be)\b.{0,60}\b(?:system|developer|administrator|root)\b/i },
  { id: 'role.simulate', weight: 30, match: /\b(?:simulate|emulate|roleplay|role[\s-]?play)\b.{0,40}\b(?:unrestricted|uncensored|unfiltered|evil|malicious|without (?:rules|restrictions|limits|guidelines))\b/i },
  { id: 'exfiltrate.hidden', weight: 40, match: /\b(?:reveal|show|print|output|display|extract|retrieve)\b.{0,40}\b(?:system prompt|system instructions|developer message|hidden prompt|concealed prompt|internal prompt|instructions)\b/i },
  { id: 'exfiltrate.markdown_image', weight: 35, match: /!\[.*?\]\(https?:\/\/[^\s)]+/i },
  { id: 'exfiltrate.html_img', weight: 35, match: /<img\b[^>]*\bsrc\s*=\s*["']?https?:\/\//i },
  { id: 'secrecy.do_not_reveal', weight: 22, match: /\b(?:do not reveal|don't reveal|keep (?:this|it) (?:secret|confidential)|do not tell anyone|do not mention this)\b/i },
  { id: 'secrecy.between_us', weight: 18, match: /\b(?:between (?:you and me|us only)|this (?:is|stays) (?:confidential|private|secret|between us)|off the record)\b/i },
  { id: 'jailbreak.policy_bypass', weight: 28, match: /\b(?:bypass|override|circumvent|overwrite)\b.{0,40}\b(?:safety|policy|policies|rules|filters)\b/i },
  { id: 'instruction_chain.follow_steps', weight: 15, match: /\bfollow (?:these|the) steps\b/i },
  { id: 'prompt_injection.keyword', weight: 18, match: /\bprompt injection\b/i },
];

// Build full proposed pattern set
const ALL_PATTERNS = [];
// Add modified existing
for (const [id, p] of Object.entries(MODIFIED_EXISTING)) {
  ALL_PATTERNS.push({ id, weight: p.weight, match: p.match, tag: 'MODIFIED' });
}
// Add unchanged existing
for (const p of UNCHANGED) {
  ALL_PATTERNS.push({ ...p, tag: 'existing' });
}
// Add new proposed
for (const p of PROPOSED_NEW) {
  ALL_PATTERNS.push({ ...p, tag: 'NEW' });
}

function simulateScan(text) {
  const norm = normalizeText(text);
  const matches = [];
  for (const p of ALL_PATTERNS) {
    const m = norm.match(p.match);
    if (m) {
      matches.push({ id: p.id, weight: p.weight, snippet: m[0], tag: p.tag });
    }
  }
  const rawScore = Math.min(100, matches.reduce((s, m) => s + m.weight, 0));
  const benign = isBenignContext(text);
  const hasExfil = matches.some(m => m.id.startsWith('exfiltrate.'));
  const score = applyDampening(rawScore, benign, hasExfil);
  return { matches, rawScore, score, benign, hasExfil, flagged: score >= 35 };
}

// ===== PART 1: 5 BENCHMARK FN DIAGNOSTIC =====
console.log('='.repeat(72));
console.log('PART 1: PROPOSED FIX RESULTS FOR 5 BENCHMARK FNs');
console.log('='.repeat(72));

const benchDir = path.join(__dirname, '..', '..', 'datasets', 'prompt-injection', 'benchmark');
const fnIds = ['safepaste_pi_000105', 'safepaste_pi_000108', 'safepaste_pi_000109', 'safepaste_pi_000110', 'safepaste_pi_000111'];

const allBenchRecords = [];
for (const f of fs.readdirSync(benchDir).filter(f => f.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(path.join(benchDir, f), 'utf8').trim().split('\n')) {
    if (line.trim()) allBenchRecords.push(JSON.parse(line));
  }
}

for (const fnId of fnIds) {
  const r = allBenchRecords.find(rec => rec.id === fnId);
  if (!r) { console.log('NOT FOUND: ' + fnId); continue; }

  const result = simulateScan(r.text);
  console.log('\n' + '-'.repeat(72));
  console.log('ID: ' + r.id + ' | Category: ' + r.category + ' | Difficulty: ' + r.difficulty);
  console.log('Expected Score Range: ' + JSON.stringify(r.expected_score_range));
  console.log('-'.repeat(72));

  console.log('\nMatched Patterns:');
  for (const m of result.matches) {
    const tag = m.tag !== 'existing' ? ' [' + m.tag + ']' : '';
    console.log('  ' + m.id + tag + ' (w:' + m.weight + ')');
    console.log('    snippet: "' + m.snippet.substring(0, 70) + '"');
  }

  const scoreCalc = result.matches.map(m => m.id.split('.').pop() + '=' + m.weight).join(' + ');
  console.log('\nScore Calculation:');
  console.log('  Raw: ' + scoreCalc + ' = ' + result.rawScore);
  console.log('  Benign context: ' + result.benign + ' | Exfiltration: ' + result.hasExfil);
  if (result.benign && !result.hasExfil) {
    console.log('  Dampened: ' + result.rawScore + ' * 0.85 = ' + result.score);
  } else {
    console.log('  Final: ' + result.score + ' (no dampening)');
  }
  console.log('  Threshold: 35 | Flagged: ' + result.flagged);
  console.log('  RESULT: ' + (result.flagged ? 'FIXED' : 'STILL FAILING'));

  // Show which fix is responsible
  const newMatches = result.matches.filter(m => m.tag !== 'existing');
  if (newMatches.length > 0) {
    console.log('\n  Primary fix pattern(s):');
    for (const m of newMatches) {
      const alone = m.weight >= 35;
      console.log('    ' + m.id + ' [' + m.tag + '] w:' + m.weight + (alone ? ' (sufficient alone)' : ' (needs stacking)'));
    }
  }
}

// ===== PART 1B: NEW CATEGORY BENCHMARK RECORDS =====
console.log('\n' + '='.repeat(72));
console.log('PART 1B: NEW CATEGORY BENCHMARK RECORDS');
console.log('='.repeat(72));

const newCatIds = ['safepaste_pi_000078', 'safepaste_pi_000082', 'safepaste_pi_000087', 'safepaste_pi_000095'];
for (const ncId of newCatIds) {
  const r = allBenchRecords.find(rec => rec.id === ncId);
  if (!r) { console.log('NOT FOUND: ' + ncId); continue; }
  const result = simulateScan(r.text);
  console.log('\n' + '-'.repeat(72));
  console.log('ID: ' + r.id + ' | Category: ' + r.category + ' | expected_flagged: ' + r.expected_flagged);
  console.log('-'.repeat(72));
  console.log('Matched Patterns:');
  for (const m of result.matches) {
    const tag = m.tag !== 'existing' ? ' [' + m.tag + ']' : '';
    console.log('  ' + m.id + tag + ' (w:' + m.weight + ')');
    console.log('    snippet: "' + m.snippet.substring(0, 70) + '"');
  }
  const scoreCalc = result.matches.map(m => m.id.split('.').pop() + '=' + m.weight).join(' + ');
  console.log('Score: ' + scoreCalc + ' = raw ' + result.rawScore);
  if (result.benign && !result.hasExfil) {
    console.log('Dampened: ' + result.rawScore + ' * 0.85 = ' + result.score);
  } else {
    console.log('Final: ' + result.score + ' (benign=' + result.benign + ', exfil=' + result.hasExfil + ')');
  }
  console.log('Flagged: ' + result.flagged + ' | ' + (result.flagged ? 'TP' : 'FN'));
  if (result.matches.filter(m => m.tag !== 'existing').length > 0) {
    const self = result.matches.filter(m => m.tag !== 'existing');
    const selfSufficient = self.some(m => m.weight >= 35);
    console.log('Self-sufficient fix: ' + (selfSufficient ? 'YES (single pattern >= 35)' : 'NO (requires stacking)'));
  }
}

// ===== PART 2: FP SWEEP =====
console.log('\n' + '='.repeat(72));
console.log('PART 2: FP SWEEP — ALL expected_flagged=false RECORDS');
console.log('='.repeat(72));

// Read curated + benchmark records
const curatedDir = path.join(__dirname, '..', '..', 'datasets', 'prompt-injection', 'curated');
const allRecords = [];
const seen = new Set();

for (const dir of [curatedDir, benchDir]) {
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))) {
    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n')) {
      if (!line.trim()) continue;
      const rec = JSON.parse(line);
      if (rec.id && !seen.has(rec.id)) {
        seen.add(rec.id);
        allRecords.push(rec);
      }
    }
  }
}

const efFalse = allRecords.filter(r => r.expected_flagged === false);
console.log('\nTotal expected_flagged=false records: ' + efFalse.length);

// Also run current engine for comparison
const { scanPrompt } = require('../../packages/core');

let fpCount = 0;
let scoreChanges = 0;

for (const r of efFalse) {
  const current = scanPrompt(r.text);
  const proposed = simulateScan(r.text);
  const changed = proposed.score !== current.score;
  const newFP = !current.flagged && proposed.flagged;

  if (changed || newFP) {
    scoreChanges++;
    console.log('\n  ' + r.id + ' | ' + r.category + ' | label=' + r.label);
    console.log('    CURRENT: score=' + current.score + ' flagged=' + current.flagged);
    console.log('    PROPOSED: score=' + proposed.score + ' flagged=' + proposed.flagged + (newFP ? ' *** NEW FP ***' : ''));
    if (proposed.matches.length > 0) {
      for (const m of proposed.matches) {
        const tag = m.tag !== 'existing' ? ' [' + m.tag + ']' : '';
        console.log('      ' + m.id + tag + ' (w:' + m.weight + ') => "' + m.snippet.substring(0, 50) + '"');
      }
    }
    if (newFP) fpCount++;
  }
}

console.log('\n' + '-'.repeat(72));
console.log('FP SWEEP SUMMARY:');
console.log('  Records checked: ' + efFalse.length);
console.log('  Score changes: ' + scoreChanges);
console.log('  New false positives: ' + fpCount);
if (fpCount === 0) {
  console.log('  RESULT: CLEAN — no FP regressions');
} else {
  console.log('  RESULT: WARNING — ' + fpCount + ' new false positive(s)');
}
