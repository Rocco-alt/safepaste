# @safepaste/guard

Runtime security middleware for AI agent pipelines. Scans tool inputs and outputs for attacks delivered through untrusted data — instruction override, data exfiltration, tool manipulation, and more across 13 categories. Uses [@safepaste/core](https://www.npmjs.com/package/@safepaste/core) for deterministic enforcement.

## Why

AI agents call external tools (web search, file read, code execution) whose outputs can contain **indirect attack payloads** — instruction override hidden in web pages, data exfiltration markup in API responses, tool call injection in document content. Guard wraps your tool functions to scan text flowing through the agent pipeline — before a tool executes (input) and after it returns (output).

Flagged results can feed back through telemetry to improve enforcement over time — Guard operates within SafePaste's structured learning loop.

## Install

```bash
npm install @safepaste/guard @safepaste/core
```

`@safepaste/core` is a peer dependency — you provide it.

## Quickstart

```js
var { createGuard } = require('@safepaste/guard');

var guard = createGuard({ mode: 'block' });

// Wrap a tool function — scans input + output automatically
var safeSearch = guard.wrapTool('web_search', searchFn);

try {
  var result = await safeSearch('latest news');
} catch (e) {
  if (e.name === 'GuardError') {
    console.log('Blocked:', e.guardResult.scan.risk);
  }
}
```

## API

### `createGuard(options)`

Returns a guard instance.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `string \| Function \| Object` | `'warn'` | `'log'`, `'warn'`, `'block'`, callback function, or `{ input, output }` for per-direction modes |
| `strict` | `boolean` | `false` | Use strict mode (threshold 25 instead of 35) |
| `on.detection` | `Function` | `null` | Called on every detection |
| `on.blocked` | `Function` | `null` | Called when block prevents execution |
| `on.error` | `Function` | `null` | Called on scanning failures |

#### Modes

| Mode | When flagged | Behavior |
|------|-------------|----------|
| `'log'` | `action: 'log'` | Return result, no side effects |
| `'warn'` | `action: 'warn'` | `console.warn()`, return result |
| `'block'` | `action: 'block'` | Throw `GuardError` |
| `function` | `action: 'callback'` | Call function; if returns `false`, throw `GuardError` |

Per-direction mode:

```js
var guard = createGuard({
  mode: { input: 'warn', output: 'block' }
});
```

### `guard.scanInput(text, ctx)` / `guard.scanOutput(text, ctx)`

Scan text manually.

```js
var result = guard.scanInput('some text', { tool: 'web_search' });
if (result.flagged) { /* handle */ }
```

### `guard.wrapTool(name, fn)`

Wrap a standalone tool function. Scans input args and output result. Handles sync and async functions.

```js
var safeTool = guard.wrapTool('tool_name', originalFn);
```

**Fail-open:** If scanning itself fails (not a block), the tool still executes and `on.error` is called. `GuardError` (intentional block) is always re-thrown.

**`this` binding:** Wrapped functions call the original with `this` set to `null`. This is designed for standalone tool functions (the standard pattern in agent frameworks), not for object methods that depend on `this`. If you need to wrap a method, bind it first: `guard.wrapTool('name', obj.method.bind(obj))`.

### `guard.wrapTools(toolMap)`

Wrap all functions in a plain `{ name: fn }` tool map. Copies only own enumerable properties — functions are wrapped, non-functions are copied by reference. Returns a new object.

Designed for the flat tool registries used by agent frameworks (OpenAI, Vercel AI SDK, LangChain). Not intended for class instances or objects with prototypal methods.

```js
var safeTools = guard.wrapTools({
  web_search: searchFn,
  read_file: readFileFn
});
```

### `scanToolInput(text, opts)` / `scanToolOutput(text, opts)`

Standalone functions (no guard instance). Always use `log` mode.

```js
var { scanToolInput } = require('@safepaste/guard');
var result = scanToolInput('text', { tool: 'search', strict: false });
```

### `GuardResult`

```js
{
  flagged: boolean,
  action: 'pass' | 'log' | 'warn' | 'block' | 'callback',
  scan: { flagged, risk, score, threshold, matches, meta },
  guard: { point, tool, mode, timestamp, durationMs }
}
```

### `GuardError`

Thrown in block mode or when a callback returns `false`.

```js
try { await safeTool(args); }
catch (e) {
  if (e.name === 'GuardError') {
    console.log(e.guardResult.scan.risk);
    console.log(e.guardResult.guard.tool);
  }
}
```

## Framework Examples

**OpenAI SDK:**
```js
var safeSearch = guard.wrapTool('web_search', searchFn);
client.chat.completions.runTools({
  tools: [{ type: 'function', function: { function: safeSearch, ... } }]
});
```

**Vercel AI SDK:**
```js
generateText({
  tools: {
    getWeather: {
      execute: guard.wrapTool('getWeather', weatherFn),
      ...
    }
  }
});
```

**LangChain JS:**
```js
var searchTool = tool(
  guard.wrapTool('search', searchImpl),
  { name: 'search', schema: z.object({ query: z.string() }) }
);
```

**Custom agent loop:**
```js
var safeTools = guard.wrapTools(tools);
for (var call of response.tool_calls) {
  try {
    var result = await safeTools[call.name](call.arguments);
  } catch (e) {
    if (e.name === 'GuardError') { /* blocked */ }
  }
}
```

## See Also

- [@safepaste/core](https://www.npmjs.com/package/@safepaste/core) — Detection engine. 61 deterministic patterns with weighted scoring and benign-context dampening.
- [@safepaste/test](https://www.npmjs.com/package/@safepaste/test) — Attack simulation CLI. Tests detection across 13 categories with CI/CD gating.

## License

MIT
