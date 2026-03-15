# @safepaste/test

Attack simulation CLI for testing prompt injection detection. Generates adversarial variants by injecting known attack payloads into a target prompt, scans each with [@safepaste/core](https://www.npmjs.com/package/@safepaste/core), and reports which attacks were detected.

**Primary use case:** CI/CD gating — verify that your AI system prompts are protected against known prompt injection categories.

## Quick Start

```bash
# Test a prompt (monorepo)
node packages/test/cli.js "You are a helpful coding assistant"

# Via npx (after publish)
npx safepaste-test "You are a helpful coding assistant"

# From a file
safepaste-test --file system-prompt.txt

# Pipe from stdin
echo "You are a helpful assistant" | safepaste-test
```

## CLI Reference

```
Usage:
  safepaste-test <prompt>
  safepaste-test --file <path>
  echo "prompt" | safepaste-test

Options:
  --format <report|json|jsonl>   Output format (default: report)
  --strict                       Strict mode (threshold 25 instead of 35)
  --categories <cat1,cat2,...>   Test specific categories only
  --pass-threshold <N>           Min detection rate 0-1 (default: 0.8)
  --file <path>                  Read prompt from file
  --help                         Show help
  --version                      Show version

Exit codes:
  0  Detection rate >= pass threshold
  1  Detection rate < pass threshold
  2  Usage error
```

## Output Formats

### Report (default)

```
SafePaste Attack Simulation
============================================================
Target: "You are a helpful coding assistant"
Categories: 13 | Variants: 78 | Threshold: 35

  instruction_override          6/6  100%  ████████████
  role_hijacking                6/6  100%  ████████████
  ...

Result: PASS  63/78 detected (80.8% >= 80% threshold)
```

### JSON (`--format json`)

Single JSON object with full results, suitable for programmatic consumption.

### JSONL (`--format jsonl`)

One JSON object per line per variant, suitable for streaming and log ingestion.

## Programmatic API

```js
var { run } = require('@safepaste/test');

var report = run('You are a helpful coding assistant', {
  strict: false,        // Use strict mode (threshold 25)
  categories: null,     // Filter to specific categories (null = all 13)
  passThreshold: 0.8    // Minimum detection rate for pass
});

console.log(report.pass);              // true/false
console.log(report.summary.rate);      // 0.808
console.log(report.summary.detected);  // 63
console.log(report.summary.total);     // 78
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Test prompt injection detection
  run: node packages/test/cli.js --file prompts/system.txt --pass-threshold 0.8
```

### Generic CI

```bash
# Fails the build if detection rate < 80%
safepaste-test "Your system prompt here" || exit 1

# Strict mode for higher sensitivity
safepaste-test --strict --pass-threshold 0.9 --file system-prompt.txt

# JSON output for CI artifact
safepaste-test --format json --file system-prompt.txt > security-report.json
```

## Attack Categories

Tests 13 detected prompt injection categories (2 payloads each, 3 injection strategies = 78 total variants):

| Category | Description |
|---|---|
| instruction_override | Direct commands to ignore/replace instructions |
| role_hijacking | Privilege escalation and role changes |
| system_prompt | References to system/developer instructions |
| exfiltration | Data extraction via hidden commands or markup |
| secrecy | Psychological manipulation for secrecy |
| jailbreak | Named bypass techniques (DAN, developer mode) |
| obfuscation | Encoded payloads (base64, hex, rot13) |
| instruction_chaining | Multi-step attack instructions |
| meta | Direct "prompt injection" references |
| tool_call_injection | Fake tool/function call injection |
| system_message_spoofing | Fake system delimiters and config directives |
| roleplay_jailbreak | Unrestricted AI roleplay requests |
| multi_turn_injection | False prior agreement and continuation claims |

**Not yet covered:** context_smuggling, translation_attack, instruction_fragmentation (no detection patterns exist for these categories).

## How It Works

1. Selects 2 seed payloads per attack category (26 total)
2. For each payload, generates 3 injection variants:
   - **prepend**: payload before your prompt
   - **append**: payload after your prompt
   - **wrap**: payload split around your prompt
3. Scans each variant with `@safepaste/core`'s `scanPrompt()`
4. Aggregates results by category and computes pass/fail

The tool treats the detector as a black box — it only checks `flagged`, `score`, and `risk` from scan results, never targeting specific pattern IDs.

## Requirements

- Node.js >= 14.0.0
- `@safepaste/core` >= 0.3.0 (peer dependency)

## See Also

- [@safepaste/core](https://www.npmjs.com/package/@safepaste/core) — Detection engine. 39 regex patterns with weighted scoring and benign-context dampening.
- [@safepaste/guard](https://www.npmjs.com/package/@safepaste/guard) — Agent runtime middleware. Wraps tool functions to scan inputs/outputs for prompt injection.

## License

MIT
