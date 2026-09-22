import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readErrorEvents, getLogFilePath, countOccurrencesWithinWindow } from './errorLogger';
import { computeWeeklyTrend, formatLanguageLabel, WeeklyTrendPayload } from './stats';
import { muteType, unmuteType, listMutedTypes } from './muteStore';
import { clearHintsForType } from './hintDecorations';
import { getKindLabel } from './hintLabels';

const WEEK_COUNT = 6;
const KIND_LIST_SIZE = 5;
const ALL_LANGUAGES = 'All';

interface KindEntry {
	errorType: string;
	language: string;
	label: string;
	total: number;
	previousTotal: number;
	recentCount: number;
}

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
			} else if (message?.type === 'mute' && message.language && message.errorType) {
				muteType(message.language, message.errorType);
				clearHintsForType(message.language, message.errorType);
				this.postStats();
			} else if (message?.type === 'unmute' && message.language && message.errorType) {
				unmuteType(message.language, message.errorType);
				this.postStats();
			} else if (message?.type === 'updateThreshold' && typeof message.value === 'number') {
				vscode.workspace
					.getConfiguration('codeCoach')
					.update('muteSuggestionThreshold', message.value, vscode.ConfigurationTarget.Global);
			} else if (message?.type === 'updateWindow' && typeof message.value === 'number') {
				vscode.workspace
					.getConfiguration('codeCoach')
					.update('muteSuggestionWindowMinutes', message.value, vscode.ConfigurationTarget.Global);
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
			const now = new Date();
			const config = vscode.workspace.getConfiguration('codeCoach');
			const muteThreshold = config.get<number>('muteSuggestionThreshold', 20);
			const muteWindowMinutes = config.get<number>('muteSuggestionWindowMinutes', 5);

			const languages = [...new Set(events.map((e) => e.language))].sort();
			const languageLabels: Record<string, string> = {};
			for (const language of languages) {
				languageLabels[language] = formatLanguageLabel(language);
			}

			const trendByLanguage: Record<string, WeeklyTrendPayload> = {
				[ALL_LANGUAGES]: computeWeeklyTrend(events, now, WEEK_COUNT),
			};
			const kindEntriesByLanguage: Record<string, KindEntry[]> = {
				[ALL_LANGUAGES]: this.buildKindEntries(trendByLanguage[ALL_LANGUAGES], muteWindowMinutes, now),
			};
			for (const language of languages) {
				const trend = computeWeeklyTrend(events, now, WEEK_COUNT, language);
				trendByLanguage[language] = trend;
				kindEntriesByLanguage[language] = this.buildKindEntries(trend, muteWindowMinutes, now);
			}

			const mutedTypes = listMutedTypes().map((m) => `${m.language}::${m.errorType}`);
			this.view.webview.postMessage({
				type: 'stats',
				languages,
				languageLabels,
				trendByLanguage,
				kindEntriesByLanguage,
				muteThreshold,
				muteWindowMinutes,
				mutedTypes,
			});
		} catch (error) {
			this.view.webview.postMessage({ type: 'error', message: String(error) });
		}
	}

	private buildKindEntries(trend: WeeklyTrendPayload, muteWindowMinutes: number, now: Date): KindEntry[] {
		const thisWeekIndex = WEEK_COUNT - 1;
		const previousWeekIndex = WEEK_COUNT - 2;
		return Object.keys(trend.seriesByType)
			.sort((a, b) => trend.seriesByType[b][thisWeekIndex] - trend.seriesByType[a][thisWeekIndex])
			.slice(0, KIND_LIST_SIZE)
			.map((errorType) => {
				const series = trend.seriesByType[errorType];
				const language = trend.languageByType[errorType] ?? 'unknown';
				return {
					errorType,
					language,
					label: getKindLabel(errorType, language),
					total: series[thisWeekIndex],
					previousTotal: series[previousWeekIndex] ?? 0,
					recentCount: countOccurrencesWithinWindow(language, errorType, muteWindowMinutes, now),
				};
			});
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
