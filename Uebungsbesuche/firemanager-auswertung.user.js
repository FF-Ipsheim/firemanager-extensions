// ==UserScript==
// @name         Firemanager Auswertung
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auswertung der Teilnahmen für Mitglieder und Speicherung als JSON
// @author       Jochen Fähnlein
// @match        https://www.firemanager.de/portal/personals
// @grant        none
// ==/UserScript==

document.addEventListener('DOMContentLoaded', function() {
	(function() {
		function addDownloadButton(auswertung, memberCount) {
			function downloadJSON(data, filename) {
				const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}
			const btn = document.createElement('button');
			btn.textContent = `JSON herunterladen (${memberCount} Mitglieder)`;
			btn.style.position = 'fixed';
			btn.style.top = '10px';
			btn.style.right = '10px';
			btn.style.zIndex = 9999;
			btn.style.background = '#ffeb3b';
			btn.style.color = '#000';
			btn.style.fontWeight = 'bold';
			btn.style.border = '2px solid #000';
			btn.style.padding = '10px 20px';
			btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
			btn.onclick = () => downloadJSON(auswertung, 'firemanager_auswertung.json');
			document.body.appendChild(btn);
		}

		function addCreateSummaryButton() {
			function downloadJSON(data, filename) {
				const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				a.remove();
			}
			const btn = document.createElement('button');
			btn.id = 'createSummaryBtn';
			btn.textContent = `Teilnahme Auswertung erstellen`;
			btn.style.position = 'fixed';
			btn.style.top = '10px';
			btn.style.right = '10px';
			btn.style.zIndex = 9999;
			btn.style.background = '#ffeb3b';
			btn.style.color = '#000';
			btn.style.fontWeight = 'bold';
			btn.style.border = '2px solid #000';
			btn.style.padding = '10px 20px';
			btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
			btn.onclick = async () => {
				btn.disabled = true;
				btn.textContent = 'Auswertung wird erstellt...';

				try {
					const members = getMembers();
					const auswertung = [];
					for (const member of members) {
						console.log('Verarbeite Mitglied: ', member.id, member.name);
						const istAT = member.id ? await isAT(member.id) : false;
						const details = member.id ? await fetchAllDetails(member.id) : null;
						
						auswertung.push({id: member.id, name: member.name, istAT: istAT, details});
					}
					localStorage.setItem('firemanager_auswertung', JSON.stringify(auswertung));
					console.log('Firemanager Auswertung gespeichert:', auswertung);

					btn.textContent = `JSON herunterladen (${members.length} Mitglieder)`;
					btn.style.background = '#58da31ff';
					btn.disabled = false;

					downloadJSON(auswertung, 'firemanager_auswertung.json');

					btn.remove();

					addCreateSummaryButton();

				} catch (e) {
					console.error('Fehler bei der Auswertung:', e);
					
					btn.textContent = `Fehler bei der Auswertung`;
					btn.style.background = '#ff0000';
				}
			};
			document.body.appendChild(btn);
		}

		async function main() {
			try {
				const members = getMembers();
				const auswertung = {};
				for (const member of members) {
					auswertung[member.id] = member.id ? await fetchAllDetails(member.id) : null;
				}
				localStorage.setItem('firemanager_auswertung', JSON.stringify(auswertung));
				console.log('Firemanager Auswertung gespeichert:', auswertung);
				addDownloadButton(auswertung, members.length);
			} catch (e) {
				console.error('Fehler bei der Auswertung:', e);
				addDownloadButton({}, 0);
			}
		}

		async function main1() {
			addCreateSummaryButton();
		}

		// main();
		main1();
	})();
});

// Mitglieder aus Tabelle extrahieren
function getMembers() {
	const members = [];
	// Tabelle mit Mitgliedern
	const table = document.querySelector("body > div.d-lg-flex.flex-lg-row > div.flex-lg-grow-1.main-content-wrapper > div > div:nth-child(2) > div.table-responsive-lg > table");
	if (!table) return members;
	const rows = table.querySelectorAll('table > tbody > tr');
	rows.forEach(row => {
		// Name und Link sind im 5. <td> (Index 4)
		const cells = row.querySelectorAll('td');
		if (cells.length < 5) return;
		const nameCell = cells[4];
		const nameLinks = nameCell.querySelectorAll('a.fm-link');
		let name = '';
		let link = null;
		let id = null;
		if (nameLinks.length > 0) {
			// Name ist Vorname und Nachname, beide als <a>
			name = Array.from(nameLinks).map(a => a.textContent.trim()).join(' ');
			link = nameLinks[0].href;
			id = link.split('/').pop();
		}
		if (name) members.push({id, name, link});
	});
	return members;
}

async function isAT(memberId) {
	// https://www.firemanager.de/portal/OpenPersonalkartei/43515
	const url = `/portal/OpenPersonalkartei/${memberId}`;

	try {
		const resp = await fetch(url);
		const html = await resp.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		const atemschutzHeading = doc.querySelector("#tabs-1 > div > div:nth-child(3) > div > div > div > h5");
		return atemschutzHeading !== null && atemschutzHeading.innerText.trim() === 'Atemschutz';
	} catch (e) { console.warn('Fehler bei Prüfung "Ist Atemschutz"', memberId, e); return false; }
}

// Holt und aggregiert alle Details für ein Mitglied
async function fetchAllDetails(memberId) {
	const baseUrl = '/portal';

	const result = {
		'2023': {uebungen: 0, leistungspruefungen: 0, einsaetze: 0, einsaetze_atemschutz: 0},
		'2024': {uebungen: 0, leistungspruefungen: 0, einsaetze: 0, einsaetze_atemschutz: 0},
		'2025': {uebungen: 0, leistungspruefungen: 0, einsaetze: 0, einsaetze_atemschutz: 0}
	};

	// Übungen
	await werteUebungsteilnahmeAus(baseUrl, memberId, result);
	// Leistungsprüfungen
	await werteLeistungspruefungenAus(baseUrl, memberId, result);
	// Einsätze
	await werteEinsaetzeAus(baseUrl, memberId, result);
	// Einsätze mit Atemschutz
	await werteEinsaetzeMitAtemschutzAus(baseUrl, memberId, result);
	// Stunden (und sonstige Termine)
	// try {
	// 	const resp = await fetch(urls.stunden);
	// 	const html = await resp.text();
	// 	const table = parseTableFromHtml(html);
	// 	const {result: sonstige, stunden} = countRowsByYears(table, true);
	// 	for (const y of Object.keys(sonstige)) {
	// 		result[y].sonstige = sonstige[y];
	// 		result[y].stunden = stunden[y];
	// 	}
	// } catch (e) { console.warn('Fehler bei Stunden', memberId, e); }
	return result;
}

async function werteEinsaetzeMitAtemschutzAus(baseUrl, result, memberId) {
	// https://www.firemanager.de/portal/punterweisungs/personalatem/43626
	const url = `${baseUrl}/punterweisungs/personalatem/${memberId}`;

	const years = Object.keys(result);

	try {
		const resp = await fetch(url);
		const html = await resp.text();
		const table = parseTableFromHtml(html, "body > div.d-lg-flex.flex-lg-row > div.flex-lg-grow-1.main-content-wrapper > div > div:nth-child(2) > div.table-responsive-lg > table");
		const jahresWerte = countRowsByYears(table, years);
		for (const y of Object.keys(jahresWerte)) result[y].einsaetze_atemschutz = jahresWerte[y];
	} catch (e) { console.warn('Fehler bei Einsätzen mit Atemschutz', memberId, e); }
}

async function werteEinsaetzeAus(baseUrl, memberId, result) {
	// https://www.firemanager.de/portal/eldiseinsatzes/personalindex/43626
	const url = `${baseUrl}/eldiseinsatzes/personalindex/${memberId}`;

	const years = Object.keys(result);

	try {
		const resp = await fetch(url);
		const html = await resp.text();
		const table = parseTableFromHtml(html, "body > div.d-lg-flex.flex-lg-row > div.flex-lg-grow-1.main-content-wrapper > div > div:nth-child(2) > div.table-responsive-lg > table");
		const jahresWerte = countRowsByYears(table, years);
		for (const y of Object.keys(jahresWerte)) result[y].einsaetze = jahresWerte[y];
	} catch (e) { console.warn('Fehler bei Einsätzen', memberId, e); }
}

async function werteLeistungspruefungenAus(baseUrl, memberId, result) {
	// https://www.firemanager.de/portal/pabzeichens/personalindex/43626
	const url = `${baseUrl}/pabzeichens/personalindex/${memberId}`;

	try {
		const years = Object.keys(result);

		const resp = await fetch(url);
		const html = await resp.text();
		const table = parseTableFromHtml(html, "body > div.d-lg-flex.flex-lg-row > div.flex-lg-grow-1.main-content-wrapper > div > div:nth-child(2) > div.table-responsive-lg > table");
		const jahresWerte = countRowsByYears(table, years);
		for (const y of Object.keys(jahresWerte)) result[y].leistungspruefungen = jahresWerte[y];
	} catch (e) { console.warn('Fehler bei Leistungsprüfungen', memberId, e); }
}

async function werteUebungsteilnahmeAus(base, memberId, result) {
	const personalgruppeErsterZug = 3496;
	const personalgruppeZweiterZug = 3497;

	// https://www.firemanager.de/portal/punterrichts/stati/Search.start:2025-01-01/Search.ende:2025-12-23/Search.pgrupptyp_id%5B0%5D:3496/Search.pgrupptyp_id%5B1%5D:3497
	// https://www.firemanager.de/portal/punterrichts/stati/Search.start:2024-01-01/Search.ende:2024-12-23/Search.pgrupptyp_id%5B0%5D:3496/Search.pgrupptyp_id%5B1%5D:3497

	for (const year of Object.keys(result)) {
		// year ist "2023", "2024", "2025" — hier jährliche Verarbeitung durchführen
		try {
			const url = `${base}/punterrichts/stati/Search.start:${year}-01-01/Search.ende:${year}-12-23/Search.pgrupptyp_id%5B0%5D:${personalgruppeErsterZug}/Search.pgrupptyp_id%5B1%5D:${personalgruppeZweiterZug}`;

			const resp = await fetch(url);
			const html = await resp.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			const table = doc.querySelector('body > div.d-lg-flex.flex-lg-row > div.flex-lg-grow-1.main-content-wrapper > div > div:nth-child(4) > table');
			if (table) {
				const rows = table.querySelectorAll('tbody > tr');
				for (const row of rows) {
					const span = row.querySelector('td.fm-sticky-column > span');
					if (!span) continue;
					
					// (ID: 43626)
					const content = span.innerText.trim();
					const idMatch = content.match(/\(ID:\s*(?<id>\d+)\s*\)/);

					if (idMatch && idMatch.groups.id === memberId.toString()) {
						let count = 0;
						const tds = row.querySelectorAll('td');
						for (let i = 1; i < tds.length; i++) { // ab Spalte 2 (Index 1)
							if (tds[i].querySelector('i.fa-check')) count++;
						}
						if (result[year]) result[year].uebungen = count;

						break; // Mitglied gefunden, Schleife beenden
					}
				}
			}
		} catch (e) { console.warn(`Fehler bei Übungen im Jahr ${year}:`, memberId, e); }
	}	
}

// Hilfsfunktion: Jahr aus Datum extrahieren
function getYear(dateStr) {
	if (!dateStr) return null;
	const s = String(dateStr).trim();
	// Nur 4-stellige Jahreszahlen akzeptieren
	const m = s.match(/\b(19|20)\d{2}\b/);
	if (!m) return null;
	const year = m[0];
	return (year === '2023' || year === '2024' || year === '2025') ? year : null;
}

// Zählt Zeilen pro Jahr in einer Tabelle (optional: Summiere Stunden aus letzter Spalte)
function countRowsByYears(table, years, sumLastColumn = false) {
	
	const yearKeys = Array.isArray(years) ? years : (years && typeof years === 'object' ? Object.keys(years) : null);
	if (!yearKeys) throw new Error('Ungültiger years-Parameter');

	let result = {};
	let stunden = {};

	for (const y of yearKeys) {
		result[y] = 0;
		stunden[y] = 0;
	}

	// const result = {
	// 	'2023': 0,
	// 	'2024': 0,
	// 	'2025': 0
	// };
	// let stunden = {'2023': 0, '2024': 0, '2025': 0};

	if (!table) return sumLastColumn ? {result, stunden} : result;
	const rows = table.querySelectorAll('tbody > tr');
	rows.forEach(row => {
		const cells = row.querySelectorAll('td');
		if (cells.length === 0) return;
		// Suche Jahr in allen Zellen
		let year = null;
		for (let i = 0; i < cells.length; i++) {
			year = getYear(cells[i].innerText);
			if (year) break;
		}
		if (year) {
			result[year]++;
			if (sumLastColumn) {
				// Versuche, Stundenwert aus letzter Spalte zu lesen
				const val = parseFloat(cells[cells.length-1].innerText.replace(',', '.'));
				if (!isNaN(val)) stunden[year] += val;
			}
		}
	});
	return sumLastColumn ? {result, stunden} : result;
}

// Hilfsfunktion: Tabelle aus HTML extrahieren
function parseTableFromHtml(html, tableSelector = 'table.table.table-sm.table-striped.table-hover') {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	return doc.querySelector(tableSelector);
}


