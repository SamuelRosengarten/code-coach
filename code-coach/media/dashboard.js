(function () {
	const vscode = acquireVsCodeApi();
	const app = document.getElementById('app');

	const COLOR_COUNT = 7;
	const state = { payload: null, language: 'All' };

	window.addEventListener('message', (event) => {
		const message = event.data;
		if (message.type === 'stats') {
			state.payload = message.payload;
			if (state.language !== 'All' && !state.payload.languages.includes(state.language)) {
				state.language = 'All';
			}
			render();
		} else if (message.type === 'error') {
			app.innerHTML = '';
			const p = document.createElement('p');
			p.className = 'cc-empty';
			p.textContent = 'Code Coach could not load your stats.';
			app.appendChild(p);
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

	function sum(values) {
		return values.reduce((a, b) => a + b, 0);
	}

	function formatDelta(delta) {
		if (delta === 0) {
			return '0';
		}
		return (delta > 0 ? '+' : '−') + Math.abs(delta);
	}

	function deltaClass(delta) {
		if (delta < 0) {
			return 'cc-delta-down';
		}
		if (delta > 0) {
			return 'cc-delta-up';
		}
		return 'cc-delta-flat';
	}

	function currentEntries(payload) {
		if (state.language === 'All') {
			return payload.languages.map((lang) => {
				const stats = payload.byLanguage[lang];
				return { key: lang, name: payload.languageLabels[lang] || lang, ...stats };
			});
		}
		const typeMap = payload.byLanguageAndType[state.language] || {};
		return Object.keys(typeMap).map((type) => ({ key: type, name: type, ...typeMap[type] }));
	}

	function buildChart(days, entries) {
		const width = 280;
		const height = 140;
		const bottomAxis = 14;
		const plotHeight = height - bottomAxis;
		const colCount = days.length;
		const gap = 6;
		const colWidth = (width - gap * (colCount + 1)) / colCount;

		const dayTotals = days.map((_, i) => sum(entries.map((e) => e.daily[i])));
		const maxTotal = Math.max(1, ...dayTotals);

		const svgNs = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgNs, 'svg');
		svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
		svg.setAttribute('role', 'img');
		const totalMistakes = sum(dayTotals);
		svg.setAttribute('aria-label', `Stacked bar chart of ${totalMistakes} mistakes across the last ${colCount} days.`);

		days.forEach((day, colIndex) => {
			const x = gap + colIndex * (colWidth + gap);
			let y = height - bottomAxis;

			entries.forEach((entryData, entryIndex) => {
				const value = entryData.daily[colIndex];
				if (value <= 0) {
					return;
				}
				const barHeight = (value / maxTotal) * plotHeight;
				y -= barHeight;
				const rect = document.createElementNS(svgNs, 'rect');
				rect.setAttribute('x', String(x));
				rect.setAttribute('y', String(y));
				rect.setAttribute('width', String(colWidth));
				rect.setAttribute('height', String(barHeight));
				rect.setAttribute('rx', '1.5');
				rect.setAttribute('class', 'cc-color-' + (entryIndex % COLOR_COUNT));
				const title = document.createElementNS(svgNs, 'title');
				title.textContent = `${entryData.name}: ${value} on ${day.label}`;
				rect.appendChild(title);
				svg.appendChild(rect);
			});

			const label = document.createElementNS(svgNs, 'text');
			label.setAttribute('x', String(x + colWidth / 2));
			label.setAttribute('y', String(height - 2));
			label.setAttribute('text-anchor', 'middle');
			label.setAttribute('class', 'cc-day-label');
			label.textContent = day.label;
			svg.appendChild(label);
		});

		return svg;
	}

	function buildInsight(entries, totalCurrent) {
		if (totalCurrent === 0) {
			return 'No mistakes logged in the last 7 days. Keep it up, or start coding to see your stats here.';
		}

		const withPriorData = entries.filter((e) => e.previousTotal > 0);
		const improving = withPriorData
			.map((e) => ({ ...e, delta: e.total - e.previousTotal }))
			.filter((e) => e.delta < 0)
			.sort((a, b) => a.delta - b.delta)[0];
		if (improving) {
			return `${improving.name} is down ${Math.abs(improving.delta)} from last week, now at ${improving.total}.`;
		}

		const worsening = withPriorData
			.map((e) => ({ ...e, delta: e.total - e.previousTotal }))
			.filter((e) => e.delta > 0)
			.sort((a, b) => b.delta - a.delta)[0];
		if (worsening) {
			return `${worsening.name} is up ${worsening.delta} from last week, now at ${worsening.total} — worth a look.`;
		}

		const top = [...entries].sort((a, b) => b.total - a.total)[0];
		const noun = state.language === 'All' ? 'source of mistakes' : 'mistake type';
		return `${top.name} is your most common ${noun} this week, with ${top.total}.`;
	}

	function render() {
		app.innerHTML = '';
		const payload = state.payload;
		if (!payload) {
			app.appendChild(el('p', 'cc-loading', 'Loading stats…'));
			return;
		}

		if (payload.languages.length === 0) {
			app.appendChild(el('p', 'cc-empty', "Code Coach hasn't logged any mistakes yet. Start coding — we'll track patterns here."));
			return;
		}

		const header = el('div', 'cc-header');
		header.appendChild(el('span', 'cc-title', 'Code Coach'));
		header.appendChild(el('span', 'cc-range', `Last 7 days · ${payload.rangeLabel}`));
		app.appendChild(header);

		const seg = el('div', 'cc-seg');
		seg.setAttribute('role', 'group');
		seg.setAttribute('aria-label', 'Language filter');
		['All', ...payload.languages].forEach((lang) => {
			const button = document.createElement('button');
			button.textContent = lang === 'All' ? 'All' : (payload.languageLabels[lang] || lang);
			button.className = lang === state.language ? 'on' : '';
			button.setAttribute('aria-pressed', String(lang === state.language));
			button.addEventListener('click', () => {
				state.language = lang;
				render();
			});
			seg.appendChild(button);
		});
		app.appendChild(seg);

		const entries = currentEntries(payload);
		const totalCurrent = state.language === 'All' ? payload.totalCurrent : (payload.byLanguage[state.language]?.total ?? 0);
		const totalPrevious = state.language === 'All' ? payload.totalPrevious : (payload.byLanguage[state.language]?.previousTotal ?? 0);
		const uniqueFiles = state.language === 'All' ? payload.uniqueFiles : (payload.byLanguage[state.language]?.uniqueFiles ?? 0);
		const delta = totalCurrent - totalPrevious;

		const metrics = el('div', 'cc-metrics');
		const totalCard = el('div', 'cc-card');
		totalCard.appendChild(el('div', 'cc-label', 'Mistakes'));
		totalCard.appendChild(el('div', 'cc-num', String(totalCurrent)));
		metrics.appendChild(totalCard);

		const deltaCard = el('div', 'cc-card');
		deltaCard.appendChild(el('div', 'cc-label', 'vs last week'));
		const deltaNum = el('div', 'cc-num ' + deltaClass(delta), formatDelta(delta));
		deltaCard.appendChild(deltaNum);
		metrics.appendChild(deltaCard);

		const filesCard = el('div', 'cc-card');
		filesCard.appendChild(el('div', 'cc-label', 'Files affected'));
		filesCard.appendChild(el('div', 'cc-num', String(uniqueFiles)));
		metrics.appendChild(filesCard);
		app.appendChild(metrics);

		const chartCard = el('div', 'cc-card');
		const chartHead = el('div', 'cc-chart-head');
		chartHead.appendChild(el('span', 'cc-chart-title', 'Mistakes per day'));
		const dayTotals = payload.days.map((_, i) => sum(entries.map((e) => e.daily[i])));
		const maxDay = Math.max(...dayTotals);
		const busiestIndex = dayTotals.indexOf(maxDay);
		if (maxDay > 0) {
			chartHead.appendChild(el('span', 'cc-busiest', `Busiest: ${payload.days[busiestIndex].label} · ${maxDay}`));
		}
		chartCard.appendChild(chartHead);
		const chartWrap = el('div', 'cc-chart');
		chartWrap.appendChild(buildChart(payload.days, entries));
		chartCard.appendChild(chartWrap);
		app.appendChild(chartCard);

		const listCard = el('div', 'cc-card');
		listCard.appendChild(el('div', 'cc-list-title', state.language === 'All' ? 'By language' : 'By mistake type'));
		const sorted = [...entries].sort((a, b) => b.total - a.total);
		sorted.forEach((entry) => {
			const originalIndex = entries.indexOf(entry);
			const row = el('div', 'cc-row');
			const dot = el('span', 'cc-dot cc-color-' + (originalIndex % COLOR_COUNT));
			row.appendChild(dot);
			row.appendChild(el('span', 'cc-row-name', entry.name));
			row.appendChild(el('span', 'cc-row-total', String(entry.total)));
			const rowDelta = entry.total - entry.previousTotal;
			row.appendChild(el('span', 'cc-row-delta ' + deltaClass(rowDelta), formatDelta(rowDelta)));
			listCard.appendChild(row);
		});
		app.appendChild(listCard);

		const insight = el('div', 'cc-insight');
		insight.appendChild(el('span', undefined, buildInsight(entries, totalCurrent)));
		app.appendChild(insight);
	}

	render();
}());
