# Code Coach

Code Coach is a VS Code extension that turns coding mistakes into a private coaching loop: it catches errors as you write code, explains them in plain language next to the line, and tracks your progress over time — without sending anything off your machine unless you explicitly opt in.

This repository contains the extension source, its design reference, and sample fixtures used to test it against real diagnostics.

**Design Reference:** https://claude.ai/design/p/7aec18e6-ff59-4189-a463-b0c7f128f285?file=Code+Coach.dc.html&via=share

## Repository Structure

| Path | Contents |
|---|---|
| [`code-coach/`](code-coach/) | The VS Code extension itself — source, tests, and [installation & usage instructions](code-coach/README.md). |
| [`test-fixtures/`](test-fixtures/) | Small sample projects (currently a Dart project) used to trigger real diagnostics while developing and testing hints. |
| [`SECURITY.md`](SECURITY.md) | Vulnerability reporting process and a summary of what data Code Coach does/doesn't send off-device. |

## Getting Started

See [`code-coach/README.md`](code-coach/README.md) for:
- What the extension does (inline hints, mistake dashboard, mute management)
- How to enable optional AI-powered hint rewording, either via the Claude API (bring your own key) or a free local model (Ollama) — no network calls happen unless you turn one of these on
- Full list of settings and commands

## Design

The visual language and UI for the coaching system (error hints, the mistake dashboard, session summaries, progress reports) is maintained in the design reference linked above. Coaching elements currently covered there include mistake-type visualizations, a file/line heatmap for error concentration, weekly improvement graphs, and an exportable one-page report for sharing with tutors or mentors.

## Security

Code Coach is local-first by default — see [`SECURITY.md`](SECURITY.md) for what's sent off-device (nothing, unless you opt into an AI hint provider) and how to report a vulnerability.
