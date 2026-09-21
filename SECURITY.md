# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Code Coach, please **do not** create a public GitHub issue. Instead, please report it responsibly.

### How to Report

1. **Email:** samrosengarten2@icloud.com
   - Subject: `[SECURITY] Code Coach Vulnerability Report`
   - Include as much detail as possible (steps to reproduce, impact, affected versions)

2. **GitHub Security Advisory:** Use the "Report a vulnerability" feature in the Security tab of this repository

### What to Expect

- **Acknowledgment:** We'll confirm receipt within 48 hours
- **Timeline:** We aim to investigate and respond within 7 days
- **Fix:** Critical vulnerabilities will be addressed and released as soon as possible
- **Credit:** We're happy to credit you for the report if you'd like

## Supported Versions

| Version | Status |
|---------|--------|
| 1.x     | Supported |
| < 1.0   | Pre-release—use at own risk |

We recommend always using the latest version to get security updates and improvements.

## Security Considerations

Code Coach runs locally in your VS Code environment by default:
- With `codeCoach.hintProvider` set to `"off"` (the default), nothing ever leaves your machine — hints come from a built-in, offline library, and mistake logs are written only to local storage.
- If you opt into `codeCoach.hintProvider: "claude"`, the diagnostic's error type, language, and error message (not your source file) are sent to the Claude API to generate a reworded hint. Your Anthropic API key is stored via VS Code's `SecretStorage`, never in settings files, and is used only for requests to Anthropic.
- If you opt into `codeCoach.hintProvider: "local"`, that same limited data is sent to a model server running on your own machine (Ollama, by default) and never leaves your device.
- Does **not** store personal data
- Mistake logs (error type, file, line, language, timestamp) are always written only to local storage, regardless of `hintProvider`

## Questions?

For general security questions or best practices, feel free to open a discussion or reach out.

---

**Thank you for helping keep Code Coach secure!**
