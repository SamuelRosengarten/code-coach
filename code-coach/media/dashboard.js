(function () {
	const vscode = acquireVsCodeApi();
	const app = document.getElementById('app');

	const COLOR_COUNT = 7;
	const ALL_LANGUAGES = 'All';

	const state = {
		language: ALL_LANGUAGES,
		languages: [],
		languageLabels: {},
		trendByLanguage: {},
		kindEntriesByLanguage: {},
		muteThreshold: 20,
		muteWindowMinutes: 5,
		mutedTypes: new Set(),
	};

	window.addEventListener('message', (event) => {
		const message = event.data;
		if (message.type === 'stats') {
			state.languages = message.languages || [];
			state.languageLabels = message.languageLabels || {};
			state.trendByLanguage = message.trendByLanguage || {};
			state.kindEntriesByLanguage = message.kindEntriesByLanguage || {};
			state.muteThreshold = message.muteThreshold || 20;
			state.muteWindowMinutes = message.muteWindowMinutes || 5;
			state.mutedTypes = new Set(message.mutedTypes || []);
			if (state.language !== ALL_LANGUAGES && !state.languages.includes(state.language)) {
				state.language = ALL_LANGUAGES;
			}
			render();
		} else if (message.type === 'error') {
			app.innerHTML = '';
			app.appendChild(el('p', 'cc-empty', 'Code Coach could not load your stats.'));
		}
	});

	vscode.postMessage({ type: 'ready' });

	function el(tag, className, text) {
		const node = document.createElement(tag);
		if (className) {
			node.className = className;
		}
		if (text !== undefined) {
			node.textContent = text;
		}
		return node;
	}

	function currentTrend() {
		return state.trendByLanguage[state.language];
	}

	function currentKindEntries() {
		return state.kindEntriesByLanguage[state.language] || [];
	}

	function isMutedEntry(language, errorType) {
		return state.mutedTypes.has(language + '::' + errorType);
	}

	function formatKindDelta(entry) {
		if (entry.previousTotal === 0) {
			return { text: 'new', cls: 'cc-delta-new' };
		}
		const pct = Math.round(((entry.total - entry.previousTotal) / entry.previousTotal) * 100);
		if (pct === 0) {
			return { text: '0%', cls: 'cc-delta-flat' };
		}
		return { text: (pct > 0 ? '+' : '') + pct + '%', cls: pct < 0 ? 'cc-delta-good' : 'cc-delta-bad' };
	}

	function labelFor(errorType) {
		const found = currentKindEntries().find((k) => k.errorType === errorType);
		return found ? found.label : errorType;
	}

	function trendPhrase(series) {
		const firstSeen = series.find((v) => v > 0);
		const last = series[series.length - 1];
		if (firstSeen === undefined) {
			return 'has no history yet';
		}
		const pct = Math.round(((last - firstSeen) / firstSeen) * 100);
		if (Math.abs(pct) < 15) {
			return 'is holding steady';
		}
		return pct < 0 ? `has fallen by ${Math.abs(pct)}% since week one` : `is up ${pct}% since week one`;
	}

	function buildInsight(trend) {
		const [primaryType, secondaryType] = trend.topTypes;
		if (!primaryType) {
			return 'No mistakes logged yet this week. Start coding — patterns will show up here.';
		}
		const primaryText = `${labelFor(primaryType)} (gold) ${trendPhrase(trend.seriesByType[primaryType])}.`;
		if (!secondaryType) {
			return primaryText;
		}
		const secondaryText = `${labelFor(secondaryType)} (dotted) ${trendPhrase(trend.seriesByType[secondaryType])}.`;
		return `${primaryText} ${secondaryText}`;
	}

	function buildLineChart(weeks, series) {
		const width = 280;
		const height = 112;
		const bottomAxis = 16;
		const plotHeight = height - bottomAxis;
		const colCount = weeks.length;
		const xStep = colCount > 1 ? width / (colCount - 1) : width;

		const allValues = series.flatMap((s) => s.values);
		const maxVal = Math.max(1, ...allValues);

		const svgNs = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNs, 'svg');
		svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
		svg.setAttribute('role', 'img');
		svg.setAttribute('aria-label', 'Line chart of mistakes per week');

		function pointFor(value, index) {
			return [index * xStep, plotHeight - (value / maxVal) * plotHeight];
		}

		series.forEach((s, si) => {
			const points = s.values.map((v, i) => pointFor(v, i));
			const line = document.createElementNS(svgNs, 'polyline');
			line.setAttribute('points', points.map((p) => p.join(',')).join(' '));
			line.setAttribute('class', 'cc-line ' + (si === 0 ? 'cc-line-primary' : 'cc-line-secondary'));
			svg.appendChild(line);

			if (si === 0) {
				const [lx, ly] = points[points.length - 1];
				const dot = document.createElementNS(svgNs, 'circle');
				dot.setAttribute('cx', String(lx));
				dot.setAttribute('cy', String(ly));
				dot.setAttribute('r', '3.5');
				dot.setAttribute('class', 'cc-line-dot');
				svg.appendChild(dot);
			}
		});

		weeks.forEach((week, i) => {
			const label = document.createElementNS(svgNs, 'text');
			const x = i * xStep;
			const anchor = i === 0 ? 'start' : i === colCount - 1 ? 'end' : 'middle';
			label.setAttribute('x', String(Math.min(Math.max(x, 0), width)));
			label.setAttribute('y', String(height - 2));
			label.setAttribute('text-anchor', anchor);
			label.setAttribute('class', 'cc-week-label');
			label.textContent = week.label;
			svg.appendChild(label);
		});

		return svg;
	}

	function buildGauge(seen, threshold) {
		const wrap = el('div', 'cc-gauge');
		const track = el('div', 'cc-gauge-track');
		const ratio = threshold > 0 ? seen / threshold : 0;
		const pastThreshold = ratio >= 1;
		const fill = el('div', 'cc-gauge-fill' + (pastThreshold ? ' cc-gauge-full' : ''));
		fill.style.width = Math.max(0, Math.min(1, ratio)) * 100 + '%';
		track.appendChild(fill);
		wrap.appendChild(track);
		const label = pastThreshold
			? `Seen ${seen} times in ${state.muteWindowMinutes} min`
			: `Seen ${seen} of ${threshold} in ${state.muteWindowMinutes} min`;
		wrap.appendChild(el('span', 'cc-gauge-label', label));
		return wrap;
	}

	function buildLanguageFilter() {
		const seg = el('div', 'cc-seg');
		seg.setAttribute('role', 'group');
		seg.setAttribute('aria-label', 'Language filter');
		[ALL_LANGUAGES, ...state.languages].forEach((lang) => {
			const button = document.createElement('button');
			button.textContent = lang === ALL_LANGUAGES ? ALL_LANGUAGES : state.languageLabels[lang] || lang;
			button.className = lang === state.language ? 'on' : '';
			button.setAttribute('aria-pressed', String(lang === state.language));
			button.addEventListener('click', () => {
				if (lang === state.language) {
					return;
				}
				state.language = lang;
				render();
			});
			seg.appendChild(button);
		});
		return seg;
	}

	function buildKindList() {
		const card = el('div', 'cc-card');
		card.appendChild(el('div', 'cc-eyebrow', 'By kind · this week'));
		const entries = currentKindEntries();
		if (entries.length === 0) {
			card.appendChild(el('p', 'cc-empty', 'No mistakes logged yet this week.'));
			return card;
		}
		entries.forEach((entry, index) => {
			const muted = isMutedEntry(entry.language, entry.errorType);

			const block = el('div', 'cc-row-block' + (muted ? ' cc-row-muted' : ''));

			const top = el('div', 'cc-row-top');
			top.appendChild(el('span', 'cc-dot cc-color-' + (index % COLOR_COUNT)));
			top.appendChild(el('span', 'cc-row-name', entry.label));
			top.appendChild(el('span', 'cc-row-total', String(entry.total)));
			const delta = formatKindDelta(entry);
			top.appendChild(el('span', 'cc-row-delta ' + delta.cls, delta.text));

			const muteBtn = document.createElement('button');
			muteBtn.className = 'cc-row-mute' + (muted ? ' cc-on' : '');
			muteBtn.textContent = muted ? 'Unmute' : 'Mute';
			muteBtn.title = muted
				? 'Show hints for this mistake again'
				: "Already know this one? Stop showing its hint.";
			muteBtn.addEventListener('click', () => {
				vscode.postMessage({
					type: muted ? 'unmute' : 'mute',
					language: entry.language,
					errorType: entry.errorType,
				});
			});
			top.appendChild(muteBtn);
			block.appendChild(top);

			const gaugeRow = el('div', 'cc-gauge-row');
			gaugeRow.appendChild(buildGauge(entry.recentCount, state.muteThreshold));
			if (muted) {
				gaugeRow.appendChild(el('span', 'cc-muted-badge', 'Muted'));
			}
			block.appendChild(gaugeRow);

			card.appendChild(block);
		});
		return card;
	}

	function buildSettings() {
		const card = el('div', 'cc-card');
		card.appendChild(el('div', 'cc-eyebrow', 'Coaching settings'));

		const sliderRow = el('div', 'cc-settings-row');
		const label = el('div', 'cc-settings-label');
		label.appendChild(document.createTextNode('Mute a repeated hint after '));
		const strong = el('span', 'cc-hl-primary', String(state.muteThreshold));
		label.appendChild(strong);
		label.appendChild(document.createTextNode(' hits'));
		sliderRow.appendChild(label);

		const slider = document.createElement('input');
		slider.type = 'range';
		slider.min = '5';
		slider.max = '50';
		slider.step = '1';
		slider.value = String(state.muteThreshold);
		slider.className = 'cc-slider';
		slider.setAttribute('aria-label', 'Mute a repeated hint after this many hits');
		const updateFill = () => {
			const pct = ((Number(slider.value) - Number(slider.min)) / (Number(slider.max) - Number(slider.min))) * 100;
			slider.style.setProperty('--cc-fill', pct + '%');
		};
		updateFill();
		slider.addEventListener('input', () => {
			strong.textContent = slider.value;
			updateFill();
		});
		slider.addEventListener('change', () => {
			state.muteThreshold = Number(slider.value);
			vscode.postMessage({ type: 'updateThreshold', value: state.muteThreshold });
			render();
		});
		sliderRow.appendChild(slider);
		card.appendChild(sliderRow);

		const windowRow = el('div', 'cc-window-row');
		windowRow.appendChild(el('span', undefined, 'within'));
		const seg = el('div', 'cc-seg');
		seg.setAttribute('role', 'group');
		seg.setAttribute('aria-label', 'Time window for the mute suggestion');
		[2, 5, 10].forEach((minutes) => {
			const button = document.createElement('button');
			button.textContent = minutes + ' min';
			button.className = minutes === state.muteWindowMinutes ? 'on' : '';
			button.setAttribute('aria-pressed', String(minutes === state.muteWindowMinutes));
			button.addEventListener('click', () => {
				if (minutes === state.muteWindowMinutes) {
					return;
				}
				state.muteWindowMinutes = minutes;
				vscode.postMessage({ type: 'updateWindow', value: minutes });
				render();
			});
			seg.appendChild(button);
		});
		windowRow.appendChild(seg);
		card.appendChild(windowRow);

		return card;
	}

	function render() {
		app.innerHTML = '';

		if (!currentTrend()) {
			app.appendChild(el('p', 'cc-loading', 'Loading stats…'));
			return;
		}

		const header = el('div');
		header.appendChild(el('div', 'cc-eyebrow', 'Code Coach'));
		header.appendChild(el('h1', 'cc-h1', 'Your week'));
		app.appendChild(header);

		app.appendChild(buildLanguageFilter());

		const trend = currentTrend();
		const entries = currentKindEntries();

		if (entries.length === 0) {
			app.appendChild(
				el('p', 'cc-empty', "Code Coach hasn't logged any mistakes yet. Start coding — we'll track patterns here.")
			);
			app.appendChild(buildSettings());
			return;
		}

		const chartCard = el('div', 'cc-card');
		const chartHead = el('div', 'cc-card-head');
		chartHead.appendChild(el('span', 'cc-card-title', 'Mistakes per week'));
		chartHead.appendChild(el('span', 'cc-card-meta', trend.weeks.length + ' weeks'));
		chartCard.appendChild(chartHead);

		const chartWrap = el('div', 'cc-chart');
		const series = trend.topTypes.map((type) => ({ values: trend.seriesByType[type] }));
		chartWrap.appendChild(buildLineChart(trend.weeks, series));
		chartCard.appendChild(chartWrap);
		chartCard.appendChild(el('p', 'cc-insight', buildInsight(trend)));
		app.appendChild(chartCard);

		app.appendChild(buildKindList());
		app.appendChild(buildSettings());
	}

	render();
}());
