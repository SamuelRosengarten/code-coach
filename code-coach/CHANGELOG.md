# Change Log

All notable changes to the "code-coach" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## 0.0.2

- Added optional AI-powered hint rewording via `codeCoach.hintProvider`: `"claude"` (Claude API, bring your own key, stored in SecretStorage) or `"local"` (free, via a locally-running Ollama model). Falls back silently to the built-in hint on any failure or timeout.
- Added commands: `Code Coach: Set Claude API Key`, `Code Coach: Clear Claude API Key`.
- Added settings: `codeCoach.hintProvider`, `codeCoach.localHintEndpoint`, `codeCoach.localHintModel`.
- Lowered the minimum required VS Code version (`engines.vscode`) from `^1.138.0` to `^1.85.0`. The stricter requirement was never needed by the code and was blocking installs on older VS Code.

## 0.0.1

- Initial release