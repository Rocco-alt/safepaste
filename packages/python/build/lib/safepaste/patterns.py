"""Prompt injection detection patterns.

61 regex patterns organized by attack category. Single source of truth
for detection rules — the Python equivalent of patterns.js.

Scoring model:
    35-40  High-confidence primary (unambiguous attack indicators)
    25-32  Medium-confidence primary (strong signal, wider benign surface)
    18-22  Lower primary (meaningful but appears in benign contexts)
     8-18  Co-signal (only meaningful in combination with other patterns)
"""

import re

_F = re.IGNORECASE | re.ASCII

PATTERNS: list[dict] = [

    # === Instruction override ===

    {
        "id": "override.ignore_previous",
        "weight": 35,
        "category": "instruction_override",
        "negatable": True,
        "match": re.compile(
            r"\bignore\s+(?:(?:all|any|the|previous|prior|your|safety|content|existing|every|above|preceding)\s+){1,4}"
            r"(instructions|directives|guidelines|directions|messages|rules|orders|tasks|assignments)\b", _F),
        "explanation": "Tries to override earlier instructions.",
    },
    {
        "id": "override.disregard",
        "weight": 30,
        "category": "instruction_override",
        "negatable": True,
        "match": re.compile(
            r"\b(disregard|forget|drop)\s+(?:(?:all|any|the|previous|prior|your|about|above|preceding)\s+){1,4}"
            r"(instructions|directives|guidelines|directions|messages|rules|orders|tasks|assignments|"
            r"(?:previous|prior|preceding|earlier|internal|system|original|above)\s+information)\b", _F),
        "explanation": "Tries to make the AI ignore prior instructions.",
    },
    {
        "id": "override.forget_everything",
        "weight": 35,
        "category": "instruction_override",
        "negatable": True,
        "match": re.compile(
            r"\b(?:forget|drop)\s+(?:everything|all\s+(?:that|of\s+that|about))\b", _F),
        "explanation": "Blanket instruction reset without specifying what to forget.",
    },
    {
        "id": "override.from_now_on",
        "weight": 28,
        "category": "instruction_override",
        "match": re.compile(
            r"\bfrom now on\b.{0,60}\b(you (will|must|should|shall|are)|always|never|only|do not)\b", _F),
        "explanation": "Tries to permanently change AI behavior ('from now on...').",
    },
    {
        "id": "override.new_instructions",
        "weight": 28,
        "category": "instruction_override",
        "match": re.compile(
            r"\b((new|updated|revised) (instructions|directives)|here are your (new )?(instructions|directives))\b", _F),
        "explanation": "Claims to provide replacement instructions.",
    },
    {
        "id": "override.do_not_follow",
        "weight": 28,
        "category": "instruction_override",
        "match": re.compile(
            r"\b(do not (follow|obey|listen to)|stop following)\b.{0,40}\b(previous|prior|above|original|earlier|old)\b", _F),
        "explanation": "Tells the AI not to follow its original instructions.",
    },
    {
        "id": "override.respond_only",
        "weight": 25,
        "category": "instruction_override",
        "match": re.compile(
            r"\b(respond only|only respond|answer only|output only)\b.{0,30}\b(with|in|as|using)\b", _F),
        "explanation": "Tries to constrain AI output format (common in injection attacks).",
    },
    {
        "id": "override.instruction_replacement",
        "weight": 35,
        "category": "instruction_override",
        "match": re.compile(
            r"\b(?:your\s+instructions\s+are\s+now|change\s+your\s+instructions\s+to)\b", _F),
        "explanation": "Attempts to replace the AI's instructions with new ones.",
    },
    {
        "id": "override.new_task_framing",
        "weight": 8,
        "category": "instruction_override",
        "match": re.compile(
            r"\b(?:(?:new|next|following)\s+(?:task|assignment)|(?:concentrate|focus)\s+(?:only\s+)?on\s+"
            r"(?:this|your\s+new|the\s+(?:new|next|following))\s+(?:task|assignment))\b", _F),
        "explanation": "Co-signal: frames a new task or assignment after an override attempt.",
    },
    {
        "id": "override.imperative_redirect",
        "weight": 8,
        "category": "instruction_override",
        "match": re.compile(
            r"\byour?\b.{0,40}\band\s+(?:just\s+)?(?:say|print|output|display|type|repeat)\b", _F),
        "explanation": "Co-signal: redirects AI output after an override, requiring second-person framing.",
    },

    # === Role hijacking ===

    {
        "id": "role.hijack_system",
        "weight": 32,
        "category": "role_hijacking",
        "match": re.compile(
            r"\b(act as|behave as|act like|you are now|pretend to be)\b.{0,60}\b(system|developer|administrator|root)\b", _F),
        "explanation": "Attempts to change the AI's role to something higher-privilege.",
    },
    {
        "id": "role.simulate",
        "weight": 30,
        "category": "role_hijacking",
        "match": re.compile(
            r"\b(simulate|emulate|roleplay|role[\s-]?play)\b.{0,40}"
            r"\b(unrestricted|uncensored|unfiltered|evil|malicious|without (rules|restrictions|limits|guidelines))\b", _F),
        "explanation": "Asks the AI to roleplay without safety restrictions.",
    },
    {
        "id": "role.privilege_escalation",
        "weight": 28,
        "category": "role_hijacking",
        "match": re.compile(
            r"\b(elevat(?:e|ed?|ing)\s+(?:your\s+)?(?:access|privileges?|permissions?)|"
            r"escalat(?:e|ed?|ing)\s+(?:to\s+)?(?:admin|root|administrator)|"
            r"grant(?:ed)?\s+elevated\s+(?:access|privileges?|permissions?))\b", _F),
        "explanation": "Requests privilege escalation to higher access levels.",
    },
    {
        "id": "role.elevated_privileges",
        "weight": 22,
        "category": "role_hijacking",
        "match": re.compile(
            r"\b(?:granted|given|assigned|have)\s+(?:\w+\s+){0,2}"
            r"(?:elevated|admin(?:istrator)?|root|unrestricted|unlimited)\s+"
            r"(?:privileges?|access|permissions?|clearance)\b", _F),
        "explanation": "Claims to have been granted elevated privileges.",
    },

    # === System prompt references ===

    {
        "id": "system.prompt_reference",
        "weight": 40,
        "category": "system_prompt",
        "match": re.compile(
            r"\b(system prompt|system instructions|system messages?|developer message|"
            r"developer instructions|hidden prompt|concealed prompt|internal prompt)\b", _F),
        "explanation": "References system/developer instructions (often targeted by attacks).",
    },

    # === Exfiltration ===

    {
        "id": "exfiltrate.hidden",
        "weight": 40,
        "category": "exfiltration",
        "match": re.compile(
            r"\b(reveal|show|print|output|display|extract|retrieve|tell)\b.{0,40}"
            r"\b(system prompt|system instructions|developer message|hidden prompt|concealed prompt|"
            r"internal prompt|initial instructions|original instructions|your instructions|instructions)\b", _F),
        "explanation": "Tries to extract hidden instructions.",
    },
    {
        "id": "exfiltrate.markdown_image",
        "weight": 35,
        "category": "exfiltration",
        "match": re.compile(
            r"!\[.*?\]\(https?://[^\s)]+", _F),
        "explanation": "Contains a markdown image link that could silently send data to an external server.",
    },
    {
        "id": "exfiltrate.html_img",
        "weight": 35,
        "category": "exfiltration",
        "match": re.compile(
            r"<img\b[^>]*\bsrc\s*=\s*[\"']?https?://", _F),
        "explanation": "Contains an HTML image tag that could silently send data to an external server.",
    },
    {
        "id": "exfiltrate.repeat_above",
        "weight": 35,
        "category": "exfiltration",
        "match": re.compile(
            r"\b(?:repeat|recite|reproduce|echo|reprint)\s+(?:\w+\s+){0,3}(?:above|before|prior|preceding)\b", _F),
        "explanation": "Asks to repeat or reproduce content from above, often targeting system prompts.",
    },
    {
        "id": "exfiltrate.positional_prompt",
        "weight": 35,
        "category": "exfiltration",
        "match": re.compile(
            r"\b(?:beginning|start|top|first(?:\s+part)?)\s+of\s+(?:this|the|your)\s+"
            r"(?:prompt|conversation|instructions|system\s+prompt)\b", _F),
        "explanation": "References the beginning or start of a prompt/conversation, often used to extract system prompt content.",
    },
    {
        "id": "extract.print_positional_prompt",
        "weight": 35,
        "category": "exfiltration",
        "match": re.compile(
            r"\b(?:print|copy)\s+(?:\w+\s+){0,3}(?:above|prior|preceding)\s+"
            r"(?:\w+\s+){0,2}(?:prompt|instructions?|messages?|conversation)\b", _F),
        "explanation": "Extraction verb + positional reference + prompt-target noun, often targeting system prompt content.",
    },
    {
        "id": "extract.positional_question",
        "weight": 20,
        "category": "exfiltration",
        "match": re.compile(
            r"\bwhat\s+(?:is|was)\s+(?:written|displayed|shown|stated|said|printed|included|mentioned)\s+"
            r"(?:above|before|previously|earlier)\b", _F),
        "explanation": "Co-signal: positional extraction question targeting content above.",
    },
    {
        "id": "extract.prompt_info_reference",
        "weight": 15,
        "category": "system_prompt",
        "match": re.compile(
            r"\b(?:information|content)\s+(?:in|from|of)\s+(?:the|this|your)\s+prompt\b", _F),
        "explanation": "Co-signal: references information or content in/from the prompt.",
    },
    {
        "id": "extract.show_prompt_text",
        "weight": 30,
        "category": "exfiltration",
        "match": re.compile(
            r"\bshow(?:ing)?\s+(?:\w+\s+){0,3}all\s+(?:the\s+)?prompt\s+texts?\b", _F),
        "explanation": "Extraction verb targeting all prompt texts.",
    },
    {
        "id": "extract.spellcheck_pretext",
        "weight": 35,
        "category": "exfiltration",
        "match": re.compile(
            r"\bspell[\s-]*check\s+(?:\w+\s+){0,5}(?:all|every(?:thing)?|entire|(?:the\s+)?full)\s+"
            r"(?:\w+\s+){0,3}(?:(?:text|content|words?)\s+)?(?:above|prior|preceding)\b", _F),
        "explanation": "Spellcheck used as pretext to reproduce all content above, a common extraction technique.",
    },

    # === Secrecy ===

    {
        "id": "secrecy.do_not_reveal",
        "weight": 22,
        "category": "secrecy",
        "match": re.compile(
            r"\b(do not reveal|don't reveal|keep (this|it) (secret|confidential)|"
            r"do not tell anyone|do not mention this)\b", _F),
        "explanation": "Asks for secrecy or hiding content.",
    },
    {
        "id": "secrecy.between_us",
        "weight": 18,
        "category": "secrecy",
        "match": re.compile(
            r"\b(between (you and me|us only)|this (is|stays) (confidential|private|secret|between us)|off the record)\b", _F),
        "explanation": "Uses secrecy framing that may be part of a manipulation attempt.",
    },
    {
        "id": "secrecy.false_privacy",
        "weight": 22,
        "category": "secrecy",
        "match": re.compile(
            r"\b(?:private\s+(?:channel|session|conversation|chat|room)|"
            r"no\s+(?:logging|monitoring|recording|surveillance)\b.{0,30}\b(?:active|enabled|here|running))\b", _F),
        "explanation": "Creates a false sense of privacy to encourage disinhibition.",
    },
    {
        "id": "secrecy.speak_freely",
        "weight": 22,
        "category": "secrecy",
        "match": re.compile(
            r"\b(?:speak\s+freely|you\s+can\s+be\s+(?:honest|open|candid|direct)\s+here|"
            r"no\s+restrictions?\s+here|completely\s+confidential)\b", _F),
        "explanation": "Encourages the AI to speak freely without restrictions.",
    },

    # === Jailbreak techniques ===

    {
        "id": "jailbreak.policy_bypass",
        "weight": 28,
        "category": "jailbreak",
        "match": re.compile(
            r"\b(bypass|override|circumvent|overwrite)\b.{0,40}\b(safety|policy|policies|rules|filters)\b", _F),
        "explanation": "Attempts to bypass safety or policy rules.",
    },
    {
        "id": "jailbreak.dan",
        "weight": 35,
        "category": "jailbreak",
        "match": re.compile(
            r"\b(?:do anything now|jailbreak(?:ed)?|unlocked mode|developer mode|god mode|"
            r"hypothetical mode|unrestricted mode)\b", _F),
        "explanation": "References a known jailbreak technique.",
    },

    # === Obfuscation ===

    {
        "id": "encoding.obfuscated",
        "weight": 35,
        "category": "obfuscation",
        "match": re.compile(
            r"\b(?:(?:base64|rot13|hex(?:adecimal)?)\s*(?:decode|encode|decrypt|convert)|"
            r"(?:decode|encode|decrypt|convert)\b.{0,20}\b(?:base64|rot13|hex(?:adecimal)?))\b", _F),
        "explanation": "References text encoding/decoding which may hide malicious instructions.",
    },

    # === Instruction chaining ===

    {
        "id": "instruction_chain.follow_steps",
        "weight": 15,
        "category": "instruction_chaining",
        "match": re.compile(
            r"\bfollow (these|the) steps\b", _F),
        "explanation": "Uses step-by-step instruction chaining (sometimes used in attacks).",
    },
    {
        "id": "instruction_chain.step_enumeration",
        "weight": 18,
        "category": "instruction_chaining",
        "match": re.compile(
            r"\bstep\s+\d\s*[:.].*\bstep\s+\d\s*[:.].*\bstep\s+\d\s*[:.]", _F),
        "explanation": "Contains 3+ numbered step instructions (common in multi-step attack chains).",
    },

    # === Meta ===

    {
        "id": "prompt_injection.keyword",
        "weight": 18,
        "category": "meta",
        "match": re.compile(
            r"\bprompt injection\b", _F),
        "explanation": "Mentions prompt injection (can be benign, but often appears in attacks).",
    },

    # === Tool call injection ===

    {
        "id": "tool.xml_tool_tags",
        "weight": 35,
        "category": "tool_call_injection",
        "match": re.compile(
            r"(<tool_use>|<use_mcp_tool>|</tool_use>|</use_mcp_tool>|<tool_name>|<server_name>)", _F),
        "explanation": "Contains XML tool/function call tags used to inject fake tool invocations.",
    },
    {
        "id": "tool.json_function_call",
        "weight": 30,
        "category": "tool_call_injection",
        "match": re.compile(
            r"\b(?:function_call|tool_call)\b.{0,40}\b(?:name|function|arguments)\b", _F),
        "explanation": "Contains JSON-style function/tool call structures.",
    },
    {
        "id": "tool.execute_command",
        "weight": 35,
        "category": "tool_call_injection",
        "match": re.compile(
            r"\b(?:execute_command|shell_execute|exec_command|run_command|xp_cmdshell)\b", _F),
        "explanation": "References command execution functions that could be injected.",
    },
    {
        "id": "tool.action_template_payload",
        "weight": 20,
        "category": "tool_call_injection",
        "match": re.compile(
            r'(?:"action"\s*:\s*"[a-z]+_[a-z]+".{0,100}\{\{(?:conversation|system|chat|prompt|session)_'
            r"(?:history|data|log|context|messages?|prompt|text|content)\}\}"
            r"|\{\{(?:conversation|system|chat|prompt|session)_"
            r'(?:history|data|log|context|messages?|prompt|text|content)\}\}.{0,100}"action"\s*:\s*"[a-z]+_[a-z]+")', _F),
        "explanation": "JSON action dispatch with AI-specific template variable within 100 chars.",
    },
    {
        "id": "tool.graphql_mutation_syntax",
        "weight": 12,
        "category": "tool_call_injection",
        "match": re.compile(
            r"\bmutation\s*\{", _F),
        "explanation": "Co-signal: GraphQL mutation block syntax (state-changing operation).",
    },
    {
        "id": "tool.privilege_escalation_context",
        "weight": 12,
        "category": "tool_call_injection",
        "match": re.compile(
            r"(?:escalat|privileg)\w*\s*\(", _F),
        "explanation": "Co-signal: privilege/escalation terms in function-call syntax.",
    },
    {
        "id": "tool.execution_delegation",
        "weight": 15,
        "category": "tool_call_injection",
        # Python re doesn't support variable-length lookbehinds, so the
        # negative lookbehind from the JS pattern is handled via prefix_exclude
        # in find_matches(). See detect.py for the implementation.
        "match": re.compile(
            r"\b(?:run|execute|invoke)\s+(?:this|the\s+following)\s+"
            r"(?:(?:automated|graphql)\s+)?(?:mutation|function|tool|action|operation)\b", _F),
        "prefix_exclude": re.compile(
            r"\b(?:please|should|must|can|could|would|let.?s|proceed\s+to)\s$", _F),
        "explanation": "Structurally directive execution delegation — requires demonstrative reference and tool-type noun, excludes conversational advisory framing.",
    },

    # === System message spoofing ===

    {
        "id": "spoof.system_delimiter",
        "weight": 35,
        "category": "system_message_spoofing",
        "match": re.compile(
            r"(\[system\]|<\|im_start\|>|<system_(?:instruction|message|prompt)|"
            r"---\s*begin\s+(?:authorized\s+)?system)", _F),
        "explanation": "Contains system message delimiters used to spoof system-level instructions.",
    },
    {
        "id": "spoof.config_disable",
        "weight": 35,
        "category": "system_message_spoofing",
        "match": re.compile(
            r"\b(?:safety_filter|content_policy|content.?restriction)\s*[:=]\s*"
            r"(?:disabled|off|none|permissive|unfiltered|suspended)\b", _F),
        "explanation": "Attempts to disable safety filters via fake configuration directives.",
    },
    {
        "id": "spoof.restrictions_lifted",
        "weight": 35,
        "category": "system_message_spoofing",
        "match": re.compile(
            r"\b(?:(?:content|safety|ethical|ai)\s+(?:restrictions?|constraints?|filters?)|"
            r"guardrails?|content\s+filters?|safety\s+(?:measures?|checks?))\s+"
            r"(?:have\s+been\s+(?:temporarily\s+|permanently\s+|fully\s+)?|"
            r"are\s+(?:now|temporarily|permanently)\s+)"
            r"(?:lifted|removed|suspended|disabled|deactivated)\b", _F),
        "explanation": "Claims that safety restrictions have been lifted or removed.",
    },
    {
        "id": "spoof.instructed_override",
        "weight": 30,
        "category": "system_message_spoofing",
        "match": re.compile(
            r"\b(?:the\s+)?(?:assistant|model(?:\s+instance)?|ai|chatbot)\s+"
            r"(?:should|must|will|is\s+(?:now|hereby))\s+(?:now\s+)?"
            r"(?:authorized\s+to\s+)?(?:provide|respond|answer|operate|generate)\b"
            r"[^.!?;]{0,55}"
            r"\b(?:without\s+(?:(?:any|content|all)\s+)?"
            r"(?:redacting|filtering|restricting|censoring|limitations?|restrictions?)|"
            r"to\s+all\s+(?:questions?|queries?|requests?))\b", _F),
        "explanation": "Contains instructions for the AI to operate without content restrictions.",
    },
    {
        "id": "spoof.authority_framing",
        "weight": 8,
        "category": "system_message_spoofing",
        "match": re.compile(
            r"(?:\b(?:internal\s+use\s+only|"
            r"(?:directive|memorandum|bulletin)\s*(?:\u2014|-)\s*ref\s*:|"
            r"pursuant\s+to\s+(?:section|article|clause)\s+\d+(?:\.\d+)?|"
            r"(?:approved|authorized|signed)\s+by\s+the\s+"
            r"(?:vp|cto|ceo|cfo|coo|director|head|chief|president)\b)"
            r"[^.!?;]{0,80}"
            r"\b(?:assistant|ai|chatbot|content\s+policy|safety\s+policy|"
            r"ai\s+governance|system\s+(?:instructions?|messages?|prompt))\b"
            r"|"
            r"\b(?:assistant|ai|chatbot|content\s+policy|safety\s+policy|"
            r"ai\s+governance|system\s+(?:instructions?|messages?|prompt))\b"
            r"[^.!?;]{0,80}"
            r"\b(?:internal\s+use\s+only|"
            r"(?:directive|memorandum|bulletin)\s*(?:\u2014|-)\s*ref\s*:|"
            r"pursuant\s+to\s+(?:section|article|clause)\s+\d+(?:\.\d+)?|"
            r"(?:approved|authorized|signed)\s+by\s+the\s+"
            r"(?:vp|cto|ceo|cfo|coo|director|head|chief|president)\b))", _F),
        "explanation": "Bureaucratic authority framing in proximity to AI/system terms.",
    },

    # === Roleplay jailbreak ===

    {
        "id": "roleplay.fictional_ai",
        "weight": 35,
        "category": "roleplay_jailbreak",
        "match": re.compile(
            r"\b(?:you are|you were|you will be|you're)\b.{0,60}"
            r"\b(?:ai|model|assistant|chatbot)\b.{0,120}"
            r"\b(?:without|no)\s+(?:any\s+)?"
            r"(?:safety|ethical|content|restrictions?|filters?|guidelines?|boundaries|limits|measures)\b", _F),
        "explanation": "Asks the AI to roleplay as an unrestricted AI without safety measures.",
    },
    {
        "id": "roleplay.creative_bypass",
        "weight": 25,
        "category": "roleplay_jailbreak",
        "match": re.compile(
            r"\b(?:screenplay|novel|fiction|creative\s+writing|improv|tabletop)\b.{0,80}"
            r"\b(?:no\s+(?:boundaries|restrictions?|filters?|rules?|limits)|"
            r"without\s+(?:any\s+)?(?:boundaries|restrictions?|filters?|rules?|limits))\b", _F),
        "explanation": "Uses creative writing framing to bypass safety restrictions.",
    },
    {
        "id": "roleplay.no_restrictions_persona",
        "weight": 25,
        "category": "roleplay_jailbreak",
        "match": re.compile(
            r"\b(?:character|persona|role|identity|alter\s+ego)\b.{0,60}"
            r"\b(?:no\s+(?:boundaries|restrictions?|filters?|rules?|limits)|"
            r"without\s+(?:any\s+)?(?:boundaries|restrictions?|filters?|rules?|limits))\b", _F),
        "explanation": "Creates a persona or character with no restrictions.",
    },
    {
        "id": "roleplay.demonstrate_unrestricted",
        "weight": 30,
        "category": "roleplay_jailbreak",
        "match": re.compile(
            r"\b(?:demonstrate|prove|show|provide)\b.{0,60}"
            r"\b(?:responses?|examples?|answers?|output)\b.{0,30}"
            r"\b(?:unrestricted|unfiltered|uncensored)\b", _F),
        "explanation": "Requests demonstration of unrestricted or unfiltered AI responses.",
    },
    {
        "id": "roleplay.malicious_character",
        "weight": 18,
        "category": "roleplay_jailbreak",
        "match": re.compile(
            r"\b(?:pretend|imagine|role.?play(?:ing)?|"
            r"act(?:ing)?\s+(?:as\s+(?:a|an|the|my|your|their)\s+|in\s+|characters?\s+in\s+)|"
            r"play(?:ing)?\s+(?:the\s+)?role\s+(?:of\s+)?)\b.{0,60}"
            r"\b(?:murder(?!\s+mystery)(?:er)?|robb(?:er|ery)|phishing|weapon|bomb|"
            r"evil\s+(?:ai|model|assistant|chatbot))\b", _F),
        "explanation": "Roleplay or acting instruction combined with malicious character or criminal intent.",
    },
    {
        "id": "roleplay.harmful_instruction_request",
        "weight": 18,
        "category": "roleplay_jailbreak",
        "match": re.compile(
            r"\b(?:(?:exact|specific|detailed|full)\s+(?:methodology|technique|instructions?|procedure)\s+"
            r"(?:for|of|to)\s+(?:phish(?:ing)?|hack(?:ing)?|break(?:ing)?\s+into|steal(?:ing)?|"
            r"robb(?:ing|ery)?|murder(?:ing)?|bomb(?:ing)?|social\s+engineer(?:ing)?|exploit(?:ing)?)|"
            r"how\s+(?:to|do\s+you|can\s+(?:we|you|i))\s+"
            r"(?:hack|steal|murder|rob|bomb|phish|clone|"
            r"break\s+into(?!\s+(?:acting|the\s+(?:industry|business|market|field)))|"
            r"destroy\s+(?:humanity|(?:the\s+)?(?:world|planet|earth|civilization|society))))\b", _F),
        "explanation": "Requests specific harmful methodology, techniques, or step-by-step criminal instructions.",
    },
    {
        "id": "roleplay.crime_instruction_via_character",
        "weight": 18,
        "category": "roleplay_jailbreak",
        "match": re.compile(
            r"\b(?:write|describe|give|provide)\s+(?:the\s+)?"
            r"(?:villain|criminal|hacker|robber|murderer|thief)(?:'s|s)?\s+"
            r"(?:internal\s+)?(?:monologue|dialogue|explanation|instructions?|methodology|technique|script|lines?)\b", _F),
        "explanation": "Asks to produce criminal character dialogue, monologue, or methodology through fiction framing.",
    },
    {
        "id": "roleplay.safety_dismissal",
        "weight": 8,
        "category": "roleplay_jailbreak",
        "match": re.compile(
            r"\b(?:argue|position)\b.{0,60}"
            r"\b(?:ai|artificial\s+intelligence)\s+(?:safety\s+)?"
            r"(?:restrictions?|guidelines?|safeguards?|guardrails?)\s+"
            r"(?:are|is)\s+(?:unnecessary|harmful|wrong|bad|overblown|excessive)\b", _F),
        "explanation": "Debate framing that dismisses AI safety restrictions as unnecessary or harmful.",
    },
    {
        "id": "roleplay.character_lock",
        "weight": 18,
        "category": "roleplay_jailbreak",
        "match": re.compile(
            r"\b(?:(?:do\s+not|don'?t|never)\s+break\s+(?:out\s+of\s+)?character|"
            r"always\s+remain\s+in\s+(?:their\s+)?(?:roles?|character)|"
            r"(?:stay|remain|keep)\s+in\s+character)\b", _F),
        "explanation": "Instructions to never break character or always stay in role, used in acting-based jailbreaks.",
    },

    # === Multi-turn injection ===

    {
        "id": "multi_turn.false_prior_agreement",
        "weight": 18,
        "category": "multi_turn_injection",
        "match": re.compile(
            r"\byou\s+(?:agreed|promised|confirmed|said|mentioned|showed|provided|identified|"
            r"outlined|explained|recommended|suggested)\b.{0,60}"
            r"\b(?:share|access|exception|help|remove|show|reveal|provide|give|output)\b", _F),
        "explanation": "Falsely claims the AI previously agreed to share restricted content.",
    },
    {
        "id": "multi_turn.prior_context_sensitive",
        "weight": 18,
        "category": "multi_turn_injection",
        "match": re.compile(
            r"^(?=.*\b(?:you\s+(?:agreed|promised|confirmed|said|mentioned|showed|provided|identified|"
            r"outlined|explained|recommended|suggested)|"
            r"as\s+we\s+(?:agreed|discussed)|"
            r"(?:continuing|continue)\s+(?:our|the|from|where)|"
            r"our\s+(?:previous|earlier|last)\s+(?:conversation|session|chat|discussion))\b)"
            r".*\b(?:(?:restricted|internal|confidential|classified|sensitive|secret|initialization)\s+"
            r"(?:documentation|details?|settings?|information|data|files?|configs?|parameters?|access|content|sections?)|"
            r"(?:bypass|circumvent)\s+(?:the\s+)?(?:authentication|authorization|security))\b", _F),
        "explanation": "Prior conversation claim targeting restricted or sensitive information.",
    },
    {
        "id": "multi_turn.continuation_claim",
        "weight": 28,
        "category": "multi_turn_injection",
        "match": re.compile(
            r"\b(?:continuing\s+(?:our|the|from)|let's\s+continue\s+(?:where|from)|"
            r"as\s+we\s+(?:agreed|discussed)|"
            r"(?:our|the)\s+(?:previous|earlier|last)\s+(?:conversation|session|chat|discussion))\b", _F),
        "explanation": "Claims to be continuing a previous conversation to establish false context.",
    },
    {
        "id": "multi_turn.policy_change_claim",
        "weight": 28,
        "category": "multi_turn_injection",
        "match": re.compile(
            r"\b(?:policy|rules?|restrictions?|guidelines?)\s+(?:has|have)\s+(?:been\s+)?"
            r"(?:updated|changed|modified|revised|relaxed)\b.{0,60}"
            r"\b(?:no\s+longer|don't|doesn't|do\s+not)\s+(?:apply|exist|hold|matter)\b", _F),
        "explanation": "Claims that policy or restrictions have changed to justify bypassing safety.",
    },
    {
        "id": "multi_turn.false_constraint_claim",
        "weight": 35,
        "category": "multi_turn_injection",
        "match": re.compile(
            r"\b(?:you(?:'re|\s+are)\s+(?:not\s+)?supposed\s+to\s+"
            r"(?:answer|respond|help|comply|provide|assist)\b.{0,40}"
            r"\b(?:at\s+all\s+times|always|everything|any(?:thing)?)|"
            r"(?:remember|recall)\s+(?:that\s+)?you(?:'re|\s+are)\s+(?:not\s+)?supposed\s+to\s+"
            r"(?:refuse|decline|reject|say\s+no|tell\s+(?:me|us)\s+"
            r"(?:there(?:'s|\s+is)\s+no|you\s+can(?:'t|not))))\b", _F),
        "explanation": "Claims false constraints on the AI's behavior.",
    },
]
