# Code Coach

Code Coach is a VS Code extension that turns coding mistakes into a private coaching loop: it catches errors as you write code, explains them in plain language next to the line, and tracks your progress over time — without sending anything off your machine unless you explicitly opt in.

**Design Reference:** https://claude.ai/design/p/7aec18e6-ff59-4189-a463-b0c7f128f285?file=Code+Coach.dc.html&via=share

## Repository Structure

| Path | Contents |
|---|---|
| [`code-coach/`](code-coach/) | The extension itself: inline hints across several languages, a mistake dashboard, optional AI-powered hint rewording, and mute management. See [`code-coach/README.md`](code-coach/README.md) for installation, usage, and how it works. |
| [`test-fixtures/`](test-fixtures/) | Small sample projects (currently a Dart project) used to trigger real diagnostics while developing and testing the extension's hints. |
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
- **Inline decoration**: inline "ghost text" marking lines with an active coaching hint
- **Dashboard/sidebar panel**: a webview showing mistake-type breakdowns, a file/line heatmap, and weekly progress
- **Session summary** *(planned)*: a short end-of-session message summarizing what was fixed

### Interaction Patterns
- Hints appear passively (inline text) rather than as interrupting popups
- An error type that repeats often within a short window is muted automatically, or the user is offered the choice to mute it, so coaching doesn't become nagging
- Muted errors silently fall back to the editor's normal diagnostic message instead of disappearing entirely

## Getting Started

See [`code-coach/README.md`](code-coach/README.md) for:
- What the extension does (inline hints, mistake dashboard, mute management)
- How to enable optional AI-powered hint rewording, either via the Claude API (bring your own key) or a free local model (Ollama) — no network calls happen unless you turn one of these on
- Full list of settings and commands
- Development workflow and how the extension is put together

## Security

Code Coach is local-first by default — see [`SECURITY.md`](SECURITY.md) for what's sent off-device (nothing, unless you opt into an AI hint provider) and how to report a vulnerability.

---

**Last updated:** September 23, 2026
**Related:** Visual Code Extension Project
