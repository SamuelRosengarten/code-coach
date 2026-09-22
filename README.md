# Code Coach

Code Coach is a VS Code extension that turns coding mistakes into a private coaching loop: it catches errors as you write code, explains them in plain language next to the line, and tracks your progress over time — without sending anything off your machine unless you explicitly opt in.

**Design Reference:** https://claude.ai/design/p/7aec18e6-ff59-4189-a463-b0c7f128f285?file=Code+Coach.dc.html&via=share

## Repository Structure

This repository currently contains two parallel implementations of the extension, developed independently:

| Path | Contents |
|---|---|
| [`src/`](src/) | The original extension: one coached error type (TypeScript's `TS2304`), rule-based hints, mute tracking, and JSONL progress logging. See [How it works](#how-it-works-src) below. |
| [`code-coach/`](code-coach/) | A fuller extension: inline hints across several languages, a mistake dashboard, optional AI-powered hint rewording, and mute management. See [`code-coach/README.md`](code-coach/README.md) for installation and usage. |
| [`test-fixtures/`](test-fixtures/) | Small sample projects (currently a Dart project) used to trigger real diagnostics while developing and testing `code-coach/`'s hints. |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting process and a summary of what data Code Coach does/doesn't send off-device. |

## Design Sections

### Color Palette
A calm, low-glare palette so hints read as supportive rather than alarming — avoiding the editor's usual red/yellow error colors:
- **Background:** neutral editor background (inherits the active VS Code theme)
- **Hint accent:** soft blue `#4A90D9` — used for the hint icon/border instead of error-red
- **Success/progress:** muted green `#5FAE7A` — improvement graphs, resolved-error states
- **Muted/suppressed:** neutral gray `#9AA0A6` — for hints currently muted by the repeat-count logic
- **Text:** inherits the theme's foreground color for readability in both light and dark themes

### Typography
Matches the host editor so hints feel native rather than like a separate tool:
- **UI font:** VS Code's default UI font (`-apple-system, "Segoe UI", sans-serif` per platform)
- **Code/inline references:** the user's configured editor font (`editor.fontFamily`)
- **Hint body text:** regular weight, sentence case, no more than 2–3 short sentences per hint

### UI Components
- **Hover hint**: replaces the raw diagnostic message for a coached error type when hovering over it
- **Inline decoration**: a subtle gutter icon (or, in `code-coach/`, inline "ghost text") marking lines with an active coaching hint
- **Dashboard/sidebar panel**: a webview showing mistake-type breakdowns, a file/line heatmap, and weekly progress (implemented in `code-coach/`)
- **Session summary** *(planned)*: a short end-of-session message summarizing what was fixed

### Interaction Patterns
- Hints appear passively (on hover, or as inline text) rather than as interrupting popups
- An error type that repeats often within a short window is muted automatically, or the user is offered the choice to mute it, so coaching doesn't become nagging
- Muted errors silently fall back to the editor's normal diagnostic message instead of disappearing entirely

## Getting Started

For the fuller `code-coach/` extension, see [`code-coach/README.md`](code-coach/README.md) for:
- What the extension does (inline hints, mistake dashboard, mute management)
- How to enable optional AI-powered hint rewording, either via the Claude API (bring your own key) or a free local model (Ollama) — no network calls happen unless you turn one of these on
- Full list of settings and commands

For the simpler `src/` extension, see [How it works](#how-it-works-src) below and its own `npm install && npm run compile` workflow under [Development](#development).

## How it works (`src/`)

`src/extension.ts` is the entry point — the only file VS Code calls into directly. On startup (`activate()`) it sets up two subscriptions and hands the real work off to the other modules:

```
VS Code raises a diagnostic (a compiler/linter error)
            │
            ▼
 onDidChangeDiagnostics fires  (wired up in extension.ts)
            │
            ▼
 processDiagnostics()          (src/diagnosticsHandler.ts)
   ├─ logs it to the console
   ├─ is it the coached error type (TS2304)?  → getHint()      (src/hints.ts)
   ├─ has it repeated too often recently?     → MuteTracker    (src/muteTracker.ts)
   └─ appends one JSON line to the log file   → appendErrorEvent (src/logger.ts)
                                                  using the path from  (src/storage.ts)
                                                  and the shape from   (src/schema.ts)

 Separately, whenever the user hovers over an error:
            │
            ▼
 registerHoverProvider callback  (wired up in extension.ts)
            │
            ▼
 buildHoverMessage()             (src/hoverProvider.ts)
   └─ same getHint() + MuteTracker check as above, so a muted
      error type just falls back to VS Code's normal hover.
```

**Module responsibilities**

| File | Responsibility |
| --- | --- |
| `src/extension.ts` | Entry point. Wires the modules below into VS Code's APIs; contains almost no logic of its own. |
| `src/hints.ts` | Knows about the one coached error (`TS2304`) and its friendly explanation. |
| `src/diagnosticsHandler.ts` | Handles one batch of diagnostics: console log, mute check, and log-file write. |
| `src/hoverProvider.ts` | Picks the hover text to show at a given cursor position. |
| `src/muteTracker.ts` | Counts repeats of an error type within a rolling time window and decides when to mute it. |
| `src/logger.ts` | Appends one JSON line per error event to the log file. |
| `src/storage.ts` | Resolves (and creates) the on-disk folder the log file lives in. |
| `src/schema.ts` | Defines the shape of a logged event (`ErrorEvent`) and validates it. |

Everything except `extension.ts` is plain TypeScript with no dependency on the `vscode` module, which is what lets it be unit tested directly (see `test/`) without spinning up an editor.

### Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `codeCoach.muteThreshold` | `3` | How many times the same error type may occur within the window before its hint is suppressed. |
| `codeCoach.muteWindowMinutes` | `10` | Length of the rolling window, in minutes, over which repeats are counted. |

### Storage location

Error events are logged to `<globalStorageUri>/error-log.jsonl`. `globalStorageUri` (rather than the workspace-scoped `storageUri`) is used deliberately: since the dashboard is meant to show progress "over weeks," a workspace-scoped log would reset every time a student opens a different project/repo.

## Development

```bash
npm install
npm run compile        # tsc build
npm test               # unit test suite (node:test)
npm run test:integration  # runs the extension in a real VS Code instance
npm run watch          # tsc in watch mode
```

To try the extension by hand, open this folder in VS Code and press `F5` to launch an Extension Development Host.

### Testing notes

Two layers, both run in CI:

- **Unit tests** (`test/`) cover the event schema, storage resolution, log writing, hint lookup, mute-tracking logic, and the diagnostics-handling pipeline — including a clean-install case with no pre-existing storage folder and checks that every logged line is valid JSON matching the schema.
- **Integration tests** (`integration/`) launch a real VS Code instance via `@vscode/test-electron` and drive the extension end to end: activation creates the global storage folder on a fresh profile, the real TypeScript language service reports the coached error as `source: "ts"` / `code: 2304`, hovering it surfaces the friendly hint, and the occurrence lands in the JSONL log.

The integration suite needs to download VS Code, so it requires network access to `update.code.visualstudio.com`. In CI it runs under `xvfb`.

## Security

Code Coach is local-first by default — see [`SECURITY.md`](SECURITY.md) for what's sent off-device (nothing, unless you opt into an AI hint provider) and how to report a vulnerability.

---

**Last updated:** September 21, 2026
**Related:** Visual Code Extension Project
