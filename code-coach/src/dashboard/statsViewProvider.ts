// Hosts the sidebar "Stats" panel: a VS Code webview, which is really just
// an embedded, sandboxed browser page. This class's job is the *bridge*
// between the extension (Node.js, filesystem access, the stats.ts math)
// and that page (plain HTML/CSS/JS in media/dashboard.{css,js}, no Node
// APIs) — computing data here and posting it across as a message, and
// listening for messages back (mute button clicks, etc.).
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readErrorEvents, getLogFilePath, countOccurrencesWithinWindow } from '../storage/errorLogger';
import { computeWeeklyTrend, formatLanguageLabel, WeeklyTrendPayload } from './stats';
import { muteType, unmuteType, listMutedTypes } from '../storage/muteStore';
import { clearHintsForType } from '../diagnostics/hintDecorations';
import { getKindLabel } from '../hints/hintLabels';

const WEEK_COUNT = 6;
const KIND_LIST_SIZE = 5; // how many error-type rows to show per language in the dashboard's list
const ALL_LANGUAGES = 'All'; // key used for the "all languages combined" tab/entry alongside each real language

/** One row in the dashboard's "most common mistakes" list. */
interface KindEntry {
	errorType: string;
	language: string;
	label: string;
	total: number;
	previousTotal: number;
	recentCount: number;
}

const WATCH_DEBOUNCE_MS = 500;

/** A random 32-character string required by the page's Content-Security-Policy below, so only this extension's own <script> tag is allowed to run. */
function getNonce(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let nonce = '';
	for (let i = 0; i < 32; i++) {
		nonce += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return nonce;
}

// `viewType` here must match the "id" of the view registered in
// package.json's contributes.views.codeCoach — that's how VS Code knows
// to construct *this* class for that sidebar entry.
export class StatsViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
	public static readonly viewType = 'codeCoach.statsView';

	private view: vscode.WebviewView | undefined;
	private watcher: fs.FSWatcher | undefined;
	private watchTimer: NodeJS.Timeout | undefined;

	constructor(private readonly extensionUri: vscode.Uri) {}

	// Called by VS Code once, the first time the Stats view becomes visible.
	public resolveWebviewView(webviewView: vscode.WebviewView): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true, // required for media/dashboard.js to run at all
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
		};
		webviewView.webview.html = this.getHtml(webviewView.webview);

		// The webview page (media/dashboard.js) sends these via
		// `vscode.postMessage(...)` on its side — this is the only
		// channel it has back to the extension (it can't call our
		// functions directly, since it runs in a separate, sandboxed context).
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

	/** Backs the "Refresh Stats" command/button. */
	public refresh(): void {
		this.postStats();
	}

	public dispose(): void {
		this.stopWatching();
	}

	/**
	 * Reads the error log, computes everything the dashboard needs to
	 * render, and posts it to the webview as one message. This is the only
	 * way data reaches the page — see getHtml()/media/dashboard.js for how
	 * the page listens for and renders it.
	 */
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

			// Computed once for "All" languages combined, then again per
			// individual language, so the dashboard's language tabs can
			// switch instantly without asking the extension to recompute.
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

	/** Turns a WeeklyTrendPayload into the top KIND_LIST_SIZE rows for the dashboard's "most common mistakes" list, ranked by this week's count. */
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

	/**
	 * Keeps the dashboard live-updating as new mistakes are logged, by
	 * watching the log file on disk (fs.watch) rather than polling it —
	 * so a change from *anywhere* (this window or another) refreshes the
	 * view. Falls back to watching the log file's parent directory when
	 * the log doesn't exist yet (a fresh install), since fs.watch can't
	 * watch a path that isn't there; once the file shows up, watching is
	 * restarted so it can watch the real file directly from then on.
	 */
	private startWatching(): void {
		this.stopWatching();
		const logFilePath = getLogFilePath();
		try {
			this.watcher = fs.watch(logFilePath, () => this.scheduleRefresh());
		} catch {
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

	/** Debounces refreshes: a burst of rapid log writes (several mistakes in quick succession) triggers just one postStats() call, not one per write. */
	private scheduleRefresh(): void {
		if (this.watchTimer) {
			clearTimeout(this.watchTimer);
		}
		this.watchTimer = setTimeout(() => this.postStats(), WATCH_DEBOUNCE_MS);
	}

	/**
	 * Builds the webview's initial HTML shell. The real content is rendered
	 * client-side by media/dashboard.js once it receives the first 'stats'
	 * message (see postStats() above) — this is just the page skeleton
	 * plus a strict Content-Security-Policy that only allows this
	 * extension's own stylesheet/script to load (everything else, e.g. any
	 * external network request, is blocked by default).
	 */
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
