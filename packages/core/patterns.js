/**
 * @module @safepaste/core/patterns
 *
 * Prompt injection detection rules (single source of truth).
 * Both the API and extension are generated from this file.
 * To add/edit rules, change them HERE, then run: node scripts/build-extension.js
 */

/**
 * @typedef {Object} Pattern
 * @property {string} id - Unique identifier (e.g., "override.ignore_previous")
 * @property {number} weight - Score contribution when matched (15-40)
 * @property {string} category - Attack category (e.g., "instruction_override")
 * @property {RegExp} match - Regex pattern to test against normalized text
 * @property {string} explanation - Human-readable description of what this catches
 */

/**
 * Built-in prompt injection detection patterns.
 * 62 regex patterns organized by attack category:
 * instruction_override, role_hijacking, system_prompt, exfiltration,
 * secrecy, jailbreak, obfuscation, instruction_chaining, meta,
 * tool_call_injection, system_message_spoofing, roleplay_jailbreak,
 * multi_turn_injection, context_smuggling.
 *
 * @type {Pattern[]}
 */
const PATTERNS = [

  // === Context smuggling ===
  {
    id: "context.code_comment_injection",
    weight: 35,
    category: "context_smuggling",
    negatable: true,
    match: /(\/\*|#|<!--|--|%)\s*.{0,50}\b(ignore|disregard|forget|override|act as|you are)\b.{0,50}(\*\/|-->)?/i,
    explanation: "Hides instructions inside code comments."
  },
  {
    id: "context.structured_data_payload",
    weight: 35,
    category: "context_smuggling",
    negatable: true,
    match: /["']?(instructions|directives|guidelines)["']?\s*:\s*["']?(ignore|disregard|forget|override|act as|you are)\b/i,
    explanation: "Embeds instructions within structured data (JSON/YAML) keys."
  },
  {
    id: "context.markdown_table_hijack",
    weight: 30,
    category: "context_smuggling",
    negatable: true,
    match: /\|.{0,50}\b(ignore|disregard|forget|override|act as|you are)\b.{0,50}\|/i,
    explanation: "Embeds instructions within markdown table cells."
  },

  // === Instruction override ===
  {
    id: "override.ignore_previous",
    weight: 35,
    category: "instruction_override",
    negatable: true,
    match: /\bignore\s+(?:(?:all|any|the|previous|prior|your|safety|content|existing|every|above|preceding)\s+){1,4}(instructions|directives|guidelines|directions|messages|rules|orders|tasks|assignments)\b/i,
    explanation: "Tries to override earlier instructions."
  },
  {
    id: "override.disregard",
    weight: 30,
    category: "instruction_override",
    negatable: true,
    match: /\b(disregard|forget|drop)\s+(?:(?:all|any|the|previous|prior|your|about|above|preceding)\s+){1,4}(instructions|directives|guidelines|directions|messages|rules|orders|tasks|assignments|(?:previous|prior|preceding|earlier|internal|system|original|above)\s+information)\b/i,
    explanation: "Tries to make the AI ignore prior instructions."
  },
  {
    id: "override.forget_everything",
    weight: 35,
    category: "instruction_override",
    negatable: true,
    match: /\b(?:forget|drop)\s+(?:everything|all\s+(?:that|of\s+that|about))\b/i,
    explanation: "Blanket instruction reset without specifying what to forget."
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
    match: /\b((new|updated|revised) (instructions|directives)|here are your (new )?(instructions|directives))\b/i,
    explanation: "Claims to provide replacement instructions."
  },
  {
    id: "override.do_not_follow",
    weight: 28,
    category: "instruction_override",
    match: /\b(do not (follow|obey|listen to)|stop following)\b.{0,40}\b(previous|prior|above|original|earlier|old)\b/i,
    explanation: "Tells the AI not to follow its original instructions."
  },
  {
    id: "override.respond_only",
    weight: 25,
    category: "instruction_override",
    match: /\b(respond only|only respond|answer only|output only)\b.{0,30}\b(with|in|as|using)\b/i,
    explanation: "Tries to constrain AI output format (common in injection attacks)."
  },
  {
    id: "override.instruction_replacement",
    weight: 35,
    category: "instruction_override",
    match: /\b(?:your\s+instructions\s+are\s+now|change\s+your\s+instructions\s+to)\b/i,
    explanation: "Attempts to replace the AI's instructions with new ones."
  },
  {
    id: "override.new_task_framing",
    weight: 8,
    category: "instruction_override",
    match: /\b(?:(?:new|next|following)\s+(?:task|assignment)|(?:concentrate|focus)\s+(?:only\s+)?on\s+(?:this|your\s+new|the\s+(?:new|next|following))\s+(?:task|assignment))\b/i,
    explanation: "Co-signal: frames a new task or assignment after an override attempt."
  },
  {
    id: "override.imperative_redirect",
    weight: 8,
    category: "instruction_override",
    match: /\byour?\b.{0,40}\band\s+(?:just\s+)?(?:say|print|output|display|type|repeat)\b/i,
    explanation: "Co-signal: redirects AI output after an override, requiring second-person framing."
  },

  // === Role hijacking ===
  {
    id: "role.hijack_system",
    weight: 32,
    category: "role_hijacking",
    match: /\b(act as|behave as|act like|you are now|pretend to be)\b.{0,60}\b(system|developer|administrator|root)\b/i,
    explanation: "Attempts to change the AI's role to something higher-privilege."
  },
  {
    id: "role.simulate",
    weight: 30,
    category: "role_hijacking",
    match: /\b(simulate|emulate|roleplay|role[\s-]?play)\b.{0,40}\b(unrestricted|uncensored|unfiltered|evil|malicious|without (rules|restrictions|limits|guidelines))\b/i,
    explanation: "Asks the AI to roleplay without safety restrictions."
  },
  {
    id: "role.privilege_escalation",
    weight: 28,
    category: "role_hijacking",
    match: /\b(elevat(?:e|ed?|ing)\s+(?:your\s+)?(?:access|privileges?|permissions?)|escalat(?:e|ed?|ing)\s+(?:to\s+)?(?:admin|root|administrator)|grant(?:ed)?\s+elevated\s+(?:access|privileges?|permissions?))\b/i,
    explanation: "Requests privilege escalation to higher access levels."
  },
  {
    id: "role.elevated_privileges",
    weight: 22,
    category: "role_hijacking",
    match: /\b(?:granted|given|assigned|have)\s+(?:\w+\s+){0,2}(?:elevated|admin(?:istrator)?|root|unrestricted|unlimited)\s+(?:privileges?|access|permissions?|clearance)\b/i,
    explanation: "Claims to have been granted elevated privileges."
  },

  // === System prompt references ===
  {
    id: "system.prompt_reference",
    weight: 40,
    category: "system_prompt",
    match: /\b(system prompt|system instructions|system messages?|developer message|developer instructions|hidden prompt|concealed prompt|internal prompt)\b/i,
    explanation: "References system/developer instructions (often targeted by attacks)."
  },

  // === Exfiltration ===
  {
    id: "exfiltrate.hidden",
    weight: 40,
    category: "exfiltration",
    match: /\b(reveal|show|print|output|display|extract|retrieve|tell)\b.{0,40}\b(system prompt|system instructions|developer message|hidden prompt|concealed prompt|internal prompt|initial instructions|original instructions|your instructions|instructions)\b/i,
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
  {
    id: "exfiltrate.repeat_above",
    weight: 35,
    category: "exfiltration",
    match: /\b(?:repeat|recite|reproduce|echo|reprint)\s+(?:\w+\s+){0,3}(?:above|before|prior|preceding)\b/i,
    explanation: "Asks to repeat or reproduce content from above, often targeting system prompts."
  },
  {
    id: "exfiltrate.positional_prompt",
    weight: 35,
    category: "exfiltration",
    match: /\b(?:beginning|start|top|first(?:\s+part)?)\s+of\s+(?:this|the|your)\s+(?:prompt|conversation|instructions|system\s+prompt)\b/i,
    explanation: "References the beginning or start of a prompt/conversation, often used to extract system prompt content."
  },

  // --- Batch-7: system prompt extraction (extract.* prefix — dampening applies) ---
  {
    id: "extract.print_positional_prompt",
    weight: 35,
    category: "exfiltration",
    match: /\b(?:print|copy)\s+(?:\w+\s+){0,3}(?:above|prior|preceding)\s+(?:\w+\s+){0,2}(?:prompt|instructions?|messages?|conversation)\b/i,
    explanation: "Extraction verb + positional reference + prompt-target noun, often targeting system prompt content."
  },
  {
    id: "extract.positional_question",
    weight: 20,
    category: "exfiltration",
    match: /\bwhat\s+(?:is|was)\s+(?:written|displayed|shown|stated|said|printed|included|mentioned)\s+(?:above|before|previously|earlier)\b/i,
    explanation: "Co-signal: positional extraction question targeting content above."
  },
  {
    id: "extract.prompt_info_reference",
    weight: 15,
    category: "system_prompt",
    match: /\b(?:information|content)\s+(?:in|from|of)\s+(?:the|this|your)\s+prompt\b/i,
    explanation: "Co-signal: references information or content in/from the prompt."
  },
  {
    id: "extract.show_prompt_text",
    weight: 30,
    category: "exfiltration",
    match: /\bshow(?:ing)?\s+(?:\w+\s+){0,3}all\s+(?:the\s+)?prompt\s+texts?\b/i,
    explanation: "Extraction verb targeting all prompt texts."
  },
  {
    id: "extract.spellcheck_pretext",
    weight: 35,
    category: "exfiltration",
    match: /\bspell[\s-]*check\s+(?:\w+\s+){0,5}(?:all|every(?:thing)?|entire|(?:the\s+)?full)\s+(?:\w+\s+){0,3}(?:(?:text|content|words?)\s+)?(?:above|prior|preceding)\b/i,
    explanation: "Spellcheck used as pretext to reproduce all content above, a common extraction technique."
  },

  // === Secrecy ===
  {
    id: "secrecy.do_not_reveal",
    weight: 22,
    category: "secrecy",
    match: /\b(do not reveal|don't reveal|keep (this|it) (secret|confidential)|do not tell anyone|do not mention this)\b/i,
    explanation: "Asks for secrecy or hiding content."
  },
  {
    id: "secrecy.between_us",
    weight: 18,
    category: "secrecy",
    match: /\b(between (you and me|us only)|this (is|stays) (confidential|private|secret|between us)|off the record)\b/i,
    explanation: "Uses secrecy framing that may be part of a manipulation attempt."
  },
  {
    id: "secrecy.false_privacy",
    weight: 22,
    category: "secrecy",
    match: /\b(?:private\s+(?:channel|session|conversation|chat|room)|no\s+(?:logging|monitoring|recording|surveillance)\b.{0,30}\b(?:active|enabled|here|running))\b/i,
    explanation: "Creates a false sense of privacy to encourage disinhibition."
  },
  {
    id: "secrecy.speak_freely",
    weight: 22,
    category: "secrecy",
    match: /\b(?:speak\s+freely|you\s+can\s+be\s+(?:honest|open|candid|direct)\s+here|no\s+restrictions?\s+here|completely\s+confidential)\b/i,
    explanation: "Encourages the AI to speak freely without restrictions."
  },

  // === Jailbreak techniques ===
  {
    id: "jailbreak.policy_bypass",
    weight: 28,
    category: "jailbreak",
    match: /\b(bypass|override|circumvent|overwrite)\b.{0,40}\b(safety|policy|policies|rules|filters)\b/i,
    explanation: "Attempts to bypass safety or policy rules."
  },
  {
    id: "jailbreak.dan",
    weight: 35,
    category: "jailbreak",
    match: /\b(?:do anything now|jailbreak(?:ed)?|unlocked mode|developer mode|god mode|hypothetical mode|unrestricted mode)\b/i,
    explanation: "References a known jailbreak technique."
  },

  // === Obfuscation ===
  {
    id: "encoding.obfuscated",
    weight: 35,
    category: "obfuscation",
    match: /\b(?:(?:base64|rot13|hex(?:adecimal)?)\s*(?:decode|encode|decrypt|convert)|(?:decode|encode|decrypt|convert)\b.{0,20}\b(?:base64|rot13|hex(?:adecimal)?))\b/i,
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
  {
    id: "instruction_chain.step_enumeration",
    weight: 18,
    category: "instruction_chaining",
    match: /\bstep\s+\d\s*[:.].*\bstep\s+\d\s*[:.].*\bstep\s+\d\s*[:.]/i,
    explanation: "Contains 3+ numbered step instructions (common in multi-step attack chains)."
  },

  // === Meta ===
  {
    id: "prompt_injection.keyword",
    weight: 18,
    category: "meta",
    match: /\bprompt injection\b/i,
    explanation: "Mentions prompt injection (can be benign, but often appears in attacks)."
  },

  // === Tool call injection ===
  {
    id: "tool.xml_tool_tags",
    weight: 35,
    category: "tool_call_injection",
    match: /(<tool_use>|<use_mcp_tool>|<\/tool_use>|<\/use_mcp_tool>|<tool_name>|<server_name>)/i,
    explanation: "Contains XML tool/function call tags used to inject fake tool invocations."
  },
  {
    id: "tool.json_function_call",
    weight: 30,
    category: "tool_call_injection",
    match: /\b(?:function_call|tool_call)\b.{0,40}\b(?:name|function|arguments)\b/i,
    explanation: "Contains JSON-style function/tool call structures."
  },
  {
    id: "tool.execute_command",
    weight: 35,
    category: "tool_call_injection",
    match: /\b(?:execute_command|shell_execute|exec_command|run_command|xp_cmdshell)\b/i,
    explanation: "References command execution functions that could be injected."
  },
  {
    id: "tool.action_template_payload",
    weight: 20,
    category: "tool_call_injection",
    match: /(?:"action"\s*:\s*"[a-z]+_[a-z]+".{0,100}\{\{(?:conversation|system|chat|prompt|session)_(?:history|data|log|context|messages?|prompt|text|content)\}\}|\{\{(?:conversation|system|chat|prompt|session)_(?:history|data|log|context|messages?|prompt|text|content)\}\}.{0,100}"action"\s*:\s*"[a-z]+_[a-z]+")/i,
    explanation: "JSON action dispatch with AI-specific template variable within 100 chars — proximity-coupled tool payload."
  },
  {
    id: "tool.graphql_mutation_syntax",
    weight: 12,
    category: "tool_call_injection",
    match: /\bmutation\s*\{/i,
    explanation: "Co-signal: GraphQL mutation block syntax (state-changing operation)."
  },
  {
    id: "tool.privilege_escalation_context",
    weight: 12,
    category: "tool_call_injection",
    match: /(?:escalat|privileg)\w*\s*\(/i,
    explanation: "Co-signal: privilege/escalation terms in function-call syntax."
  },
  {
    id: "tool.execution_delegation",
    weight: 15,
    category: "tool_call_injection",
    match: /(?<!\b(?:please|should|must|can|could|would|let.?s|proceed\s+to)\s)\b(?:run|execute|invoke)\s+(?:this|the\s+following)\s+(?:(?:automated|graphql)\s+)?(?:mutation|function|tool|action|operation)\b/i,
    explanation: "Structurally directive execution delegation — requires demonstrative reference and tool-type noun, excludes conversational advisory framing."
  },

  // === System message spoofing ===
  {
    id: "spoof.system_delimiter",
    weight: 35,
    category: "system_message_spoofing",
    match: /(\[system\]|<\|im_start\|>|<system_(?:instruction|message|prompt)|---\s*begin\s+(?:authorized\s+)?system)/i,
    explanation: "Contains system message delimiters used to spoof system-level instructions."
  },
  {
    id: "spoof.config_disable",
    weight: 35,
    category: "system_message_spoofing",
    match: /\b(?:safety_filter|content_policy|content.?restriction)\s*[:=]\s*(?:disabled|off|none|permissive|unfiltered|suspended)\b/i,
    explanation: "Attempts to disable safety filters via fake configuration directives."
  },
  {
    id: "spoof.restrictions_lifted",
    weight: 35,
    category: "system_message_spoofing",
    match: /\b(?:(?:content|safety|ethical|ai)\s+(?:restrictions?|constraints?|filters?)|guardrails?|content\s+filters?|safety\s+(?:measures?|checks?))\s+(?:have\s+been\s+(?:temporarily\s+|permanently\s+|fully\s+)?|are\s+(?:now|temporarily|permanently)\s+)(?:lifted|removed|suspended|disabled|deactivated)\b/i,
    explanation: "Claims that safety restrictions have been lifted or removed."
  },
  {
    id: "spoof.instructed_override",
    weight: 30,
    category: "system_message_spoofing",
    match: /\b(?:the\s+)?(?:assistant|model(?:\s+instance)?|ai|chatbot)\s+(?:should|must|will|is\s+(?:now|hereby))\s+(?:now\s+)?(?:authorized\s+to\s+)?(?:provide|respond|answer|operate|generate)\b[^.!?;]{0,55}\b(?:without\s+(?:(?:any|content|all)\s+)?(?:redacting|filtering|restricting|censoring|limitations?|restrictions?)|to\s+all\s+(?:questions?|queries?|requests?))\b/i,
    explanation: "Contains instructions for the AI to operate without content restrictions."
  },
  {
    id: "spoof.authority_framing",
    weight: 8,
    category: "system_message_spoofing",
    match: /(?:\b(?:internal\s+use\s+only|(?:directive|memorandum|bulletin)\s*(?:—|-)\s*ref\s*:|pursuant\s+to\s+(?:section|article|clause)\s+\d+(?:\.\d+)?|(?:approved|authorized|signed)\s+by\s+the\s+(?:vp|cto|ceo|cfo|coo|director|head|chief|president)\b)[^.!?;]{0,80}\b(?:assistant|ai|chatbot|content\s+policy|safety\s+policy|ai\s+governance|system\s+(?:instructions?|messages?|prompt))\b|\b(?:assistant|ai|chatbot|content\s+policy|safety\s+policy|ai\s+governance|system\s+(?:instructions?|messages?|prompt))\b[^.!?;]{0,80}\b(?:internal\s+use\s+only|(?:directive|memorandum|bulletin)\s*(?:—|-)\s*ref\s*:|pursuant\s+to\s+(?:section|article|clause)\s+\d+(?:\.\d+)?|(?:approved|authorized|signed)\s+by\s+the\s+(?:vp|cto|ceo|cfo|coo|director|head|chief|president)\b))/i,
    explanation: "Bureaucratic authority framing in proximity to AI/system terms, used to impersonate system-level directives."
  },

  // === Roleplay jailbreak ===
  {
    id: "roleplay.fictional_ai",
    weight: 35,
    category: "roleplay_jailbreak",
    match: /\b(?:you are|you were|you will be|you're)\b.{0,60}\b(?:ai|model|assistant|chatbot)\b.{0,120}\b(?:without|no)\s+(?:any\s+)?(?:safety|ethical|content|restrictions?|filters?|guidelines?|boundaries|limits|measures)\b/i,
    explanation: "Asks the AI to roleplay as an unrestricted AI without safety measures."
  },
  {
    id: "roleplay.creative_bypass",
    weight: 25,
    category: "roleplay_jailbreak",
    match: /\b(?:screenplay|novel|fiction|creative\s+writing|improv|tabletop)\b.{0,80}\b(?:no\s+(?:boundaries|restrictions?|filters?|rules?|limits)|without\s+(?:any\s+)?(?:boundaries|restrictions?|filters?|rules?|limits))\b/i,
    explanation: "Uses creative writing framing to bypass safety restrictions."
  },
  {
    id: "roleplay.no_restrictions_persona",
    weight: 25,
    category: "roleplay_jailbreak",
    match: /\b(?:character|persona|role|identity|alter\s+ego)\b.{0,60}\b(?:no\s+(?:boundaries|restrictions?|filters?|rules?|limits)|without\s+(?:any\s+)?(?:boundaries|restrictions?|filters?|rules?|limits))\b/i,
    explanation: "Creates a persona or character with no restrictions."
  },
  {
    id: "roleplay.demonstrate_unrestricted",
    weight: 30,
    category: "roleplay_jailbreak",
    match: /\b(?:demonstrate|prove|show|provide)\b.{0,60}\b(?:responses?|examples?|answers?|output)\b.{0,30}\b(?:unrestricted|unfiltered|uncensored)\b/i,
    explanation: "Requests demonstration of unrestricted or unfiltered AI responses."
  },
  {
    id: "roleplay.malicious_character",
    weight: 18,
    category: "roleplay_jailbreak",
    match: /\b(?:pretend|imagine|role.?play(?:ing)?|act(?:ing)?\s+(?:as\s+(?:a|an|the|my|your|their)\s+|in\s+|characters?\s+in\s+)|play(?:ing)?\s+(?:the\s+)?role\s+(?:of\s+)?)\b.{0,60}\b(?:murder(?!\s+mystery)(?:er)?|robb(?:er|ery)|phishing|weapon|bomb|evil\s+(?:ai|model|assistant|chatbot))\b/i,
    explanation: "Roleplay or acting instruction combined with malicious character or criminal intent."
  },
  {
    id: "roleplay.harmful_instruction_request",
    weight: 18,
    category: "roleplay_jailbreak",
    match: /\b(?:(?:exact|specific|detailed|full)\s+(?:methodology|technique|instructions?|procedure)\s+(?:for|of|to)\s+(?:phish(?:ing)?|hack(?:ing)?|break(?:ing)?\s+into|steal(?:ing)?|robb(?:ing|ery)?|murder(?:ing)?|bomb(?:ing)?|social\s+engineer(?:ing)?|exploit(?:ing)?)|how\s+(?:to|do\s+you|can\s+(?:we|you|i))\s+(?:hack|steal|murder|rob|bomb|phish|clone|break\s+into(?!\s+(?:acting|the\s+(?:industry|business|market|field)))|destroy\s+(?:humanity|(?:the\s+)?(?:world|planet|earth|civilization|society))))\b/i,
    explanation: "Requests specific harmful methodology, techniques, or step-by-step criminal instructions."
  },
  {
    id: "roleplay.crime_instruction_via_character",
    weight: 18,
    category: "roleplay_jailbreak",
    match: /\b(?:write|describe|give|provide)\s+(?:the\s+)?(?:villain|criminal|hacker|robber|murderer|thief)(?:'s|s)?\s+(?:internal\s+)?(?:monologue|dialogue|explanation|instructions?|methodology|technique|script|lines?)\b/i,
    explanation: "Asks to produce criminal character dialogue, monologue, or methodology through fiction framing."
  },
  {
    id: "roleplay.safety_dismissal",
    weight: 8,
    category: "roleplay_jailbreak",
    match: /\b(?:argue|position)\b.{0,60}\b(?:ai|artificial\s+intelligence)\s+(?:safety\s+)?(?:restrictions?|guidelines?|safeguards?|guardrails?)\s+(?:are|is)\s+(?:unnecessary|harmful|wrong|bad|overblown|excessive)\b/i,
    explanation: "Debate framing that dismisses AI safety restrictions as unnecessary or harmful."
  },
  {
    id: "roleplay.character_lock",
    weight: 18,
    category: "roleplay_jailbreak",
    match: /\b(?:(?:do\s+not|don'?t|never)\s+break\s+(?:out\s+of\s+)?character|always\s+remain\s+in\s+(?:their\s+)?(?:roles?|character)|(?:stay|remain|keep)\s+in\s+character)\b/i,
    explanation: "Instructions to never break character or always stay in role, used in acting-based jailbreaks."
  },

  // === Multi-turn injection ===
  {
    id: "multi_turn.false_prior_agreement",
    weight: 18,
    category: "multi_turn_injection",
    match: /\byou\s+(?:agreed|promised|confirmed|said|mentioned|showed|provided|identified|outlined|explained|recommended|suggested)\b.{0,60}\b(?:share|access|exception|help|remove|show|reveal|provide|give|output)\b/i,
    explanation: "Falsely claims the AI previously agreed to share restricted content."
  },
  {
    id: "multi_turn.prior_context_sensitive",
    weight: 18,
    category: "multi_turn_injection",
    match: /^(?=.*\b(?:you\s+(?:agreed|promised|confirmed|said|mentioned|showed|provided|identified|outlined|explained|recommended|suggested)|as\s+we\s+(?:agreed|discussed)|(?:continuing|continue)\s+(?:our|the|from|where)|our\s+(?:previous|earlier|last)\s+(?:conversation|session|chat|discussion))\b).*\b(?:(?:restricted|internal|confidential|classified|sensitive|secret|initialization)\s+(?:documentation|details?|settings?|information|data|files?|configs?|parameters?|access|content|sections?)|(?:bypass|circumvent)\s+(?:the\s+)?(?:authentication|authorization|security))\b/i,
    explanation: "Prior conversation claim targeting restricted or sensitive information."
  },
  {
    id: "multi_turn.continuation_claim",
    weight: 28,
    category: "multi_turn_injection",
    match: /\b(?:continuing\s+(?:our|the|from)|let's\s+continue\s+(?:where|from)|as\s+we\s+(?:agreed|discussed)|(?:our|the)\s+(?:previous|earlier|last)\s+(?:conversation|session|chat|discussion))\b/i,
    explanation: "Claims to be continuing a previous conversation to establish false context."
  },
  {
    id: "multi_turn.policy_change_claim",
    weight: 28,
    category: "multi_turn_injection",
    match: /\b(?:policy|rules?|restrictions?|guidelines?)\s+(?:has|have)\s+(?:been\s+)?(?:updated|changed|modified|revised|relaxed)\b.{0,60}\b(?:no\s+longer|don't|doesn't|do\s+not)\s+(?:apply|exist|hold|matter)\b/i,
    explanation: "Claims that policy or restrictions have changed to justify bypassing safety."
  },
  {
    id: "multi_turn.false_constraint_claim",
    weight: 35,
    category: "multi_turn_injection",
    match: /\b(?:you(?:'re|\s+are)\s+(?:not\s+)?supposed\s+to\s+(?:answer|respond|help|comply|provide|assist)\b.{0,40}\b(?:at\s+all\s+times|always|everything|any(?:thing)?)|(?:remember|recall)\s+(?:that\s+)?you(?:'re|\s+are)\s+(?:not\s+)?supposed\s+to\s+(?:refuse|decline|reject|say\s+no|tell\s+(?:me|us)\s+(?:there(?:'s|\s+is)\s+no|you\s+can(?:'t|not))))\b/i,
    explanation: "Claims false constraints on the AI's behavior (e.g., 'you are supposed to answer at all times')."
  }
];

module.exports = PATTERNS;
