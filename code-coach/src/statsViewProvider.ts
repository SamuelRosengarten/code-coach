import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readErrorEvents, getLogFilePath } from './errorLogger';
import { computeStatsPayload } from './stats';

const WATCH_DEBOUNCE_MS = 500;

function getNonce(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let nonce = '';
	for (let i = 0; i < 32; i++) {
		nonce += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return nonce;
}

export class StatsViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
	public static readonly viewType = 'codeCoach.statsView';

	private view: vscode.WebviewView | undefined;
	private watcher: fs.FSWatcher | undefined;
	private watchTimer: NodeJS.Timeout | undefined;

	constructor(private readonly extensionUri: vscode.Uri) {}

	public resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
		};
		webviewView.webview.html = this.getHtml(webviewView.webview);

		webviewView.webview.onDidReceiveMessage((message) => {
			if (message?.type === 'ready') {
				this.postStats();
			}
		});

		webviewView.onDidDispose(() => {
			this.view = undefined;
			this.stopWatching();
		});

		this.startWatching();
	}

	public refresh(): void {
		this.postStats();
	}

	public dispose(): void {
		this.stopWatching();
	}

	private postStats(): void {
		if (!this.view) {
			return;
		}
		try {
			const events = readErrorEvents();
			const payload = computeStatsPayload(events, new Date());
			this.view.webview.postMessage({ type: 'stats', payload });
		} catch (error) {
			this.view.webview.postMessage({ type: 'error', message: String(error) });
		}
	}

	private startWatching(): void {
		this.stopWatching();
		const logFilePath = getLogFilePath();
		try {
			this.watcher = fs.watch(logFilePath, () => this.scheduleRefresh());
		} catch {
			// Log file may not exist yet; watch its directory instead so we
			// pick it up as soon as the first mistake is logged.
			try {
				const logFileName = path.basename(logFilePath);
				this.watcher = fs.watch(path.dirname(logFilePath), (_event: string, filename: string | null) => {
					if (filename === logFileName) {
						this.scheduleRefresh();
						this.startWatching();
					}
				});
			} catch (error) {
				console.error('Code Coach: could not watch error log for changes', error);
			}
		}
	}

	private stopWatching(): void {
		this.watcher?.close();
		this.watcher = undefined;
		if (this.watchTimer) {
			clearTimeout(this.watchTimer);
			this.watchTimer = undefined;
		}
	}

	private scheduleRefresh(): void {
		if (this.watchTimer) {
			clearTimeout(this.watchTimer);
		}
		this.watchTimer = setTimeout(() => this.postStats(), WATCH_DEBOUNCE_MS);
	}

	private getHtml(webview: vscode.Webview): string {
		const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'dashboard.css'));
		const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'dashboard.js'));
		const nonce = getNonce();

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link href="${cssUri}" rel="stylesheet">
	<title>Code Coach</title>
</head>
<body>
	<div id="app" class="cc-app">
		<p class="cc-loading">Loading stats…</p>
	</div>
	<script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
	}
}
