// ==UserScript==
// @name         Firemanager Kleiderkammer Auswertung
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Erzeugen von Kleiderkarten für die Mitglieder
// @author       Jochen Fähnlein
// @match        https://www.firemanager.de/portal/personals
// @match        https://www.firemanager.de/portal/OpenPersonalkartei/*
// @match        https://www.firemanager.de/portal/kkleiderkammers/personalindex/*
// @grant        none
// ==/UserScript==

document.addEventListener('DOMContentLoaded', function () {
	(function () {
		function addCreateKleiderkammerButton() {
			function downloadJSON(data, filename) {
				const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
			btn.id = 'createKleiderkammerBtn';
			btn.textContent = `Kleiderkammer Auswertung erstellen`;
			btn.style.position = 'fixed';
			btn.style.top = '60px';
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
					let members = [];
					let auswertung = [];
					if (window.location.pathname === '/portal/personals') {
						// Auf der Mitgliederübersicht: alle Mitglieder extrahieren
						members = getMembers();
					} else {
						// Auf einer Einzelseite: nur aktuelles Mitglied extrahieren
						// Versuche die ID aus der URL zu extrahieren
						const match = window.location.pathname.match(/\/(OpenPersonalkartei|kkleiderkammers\/personalindex)\/(\d+)/);
						let id = null;
						if (match) {
							id = match[2];
						}
						// Versuche den Namen aus der Seite zu extrahieren
						let name = '';
						const subHeaderDiv = document.getElementsByClassName('fm-page-sub-header');
						if (subHeaderDiv && subHeaderDiv.length > 0) {
							const match = subHeaderDiv[0].textContent.match(/^\s*(?<name>.*),\s*(?<geburtsdatum>\d{2}\.\d{2}\.\d{4})/);
							if (match) {
								name = match.groups.name.trim();
							} else {
								throw new Error('Konnte Namen nicht extrahieren.');
							}

							if (id) {
								members = [{ id, name, link: window.location.href }];
							} else {
								alert('Konnte keine Mitglieds-ID auf dieser Seite erkennen.');
								btn.disabled = false;
								btn.textContent = 'Kleiderkammer Auswertung erstellen';
								return;
							}
						}
					}

					for (const member of members) {
						console.log('Verarbeite Mitglied: ', member.id, member.name);
						const platzNr = member.id ? await getPlatzNr(member.id) : false;
						const details = member.id ? await fetchAllDetails(member.id) : null;
						auswertung.push({ id: member.id, name: member.name, platzNr: platzNr, details });
					}
					localStorage.setItem('firemanager_kleiderkammer_auswertung', JSON.stringify(auswertung));
					console.log('Firemanager Auswertung gespeichert:', auswertung);

					btn.textContent = `JSON herunterladen (${members.length} Mitglied${members.length === 1 ? '' : 'er'})`;
					btn.style.background = '#58da31ff';
					btn.disabled = false;

					downloadJSON(auswertung, 'firemanager_kleiderkammer_auswertung.json');

					btn.remove();

					addCreateKleiderkammerButton();

				} catch (e) {
					console.error('Fehler bei der Auswertung:', e);
					btn.textContent = `Fehler bei der Auswertung`;
					btn.style.background = '#ff0000';
				}
			};
			document.body.appendChild(btn);
		}

		async function main() {
			addCreateKleiderkammerButton();
		}

		// main();
		main();
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
		if (name) members.push({ id, name, link });
	});
	return members;
}

async function getPlatzNr(memberId) {
	// https://www.firemanager.de/portal/OpenPersonalkartei/43515
	const url = `/portal/OpenPersonalkartei/${memberId}`;

	try {
		const resp = await fetch(url);
		const html = await resp.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');

		const spindnummerDiv = Array.from(doc.querySelectorAll('strong')).find(strong => strong.textContent.trim().startsWith('Spind­nummer:'));
		if (spindnummerDiv) {
			const valueDiv = spindnummerDiv.parentElement.nextElementSibling;
			if (valueDiv) {
				const spindnummer = valueDiv.textContent.trim();
				// spindnummer enthält jetzt "37"
				return spindnummer;
			}
		}

		return null;
	} catch (e) {
		console.warn('Fehler bei Ermittlung der Platznummer', memberId, e);
		return null;
	}
}

// Holt und aggregiert alle Details für ein Mitglied
async function fetchAllDetails(memberId) {
	// https://www.firemanager.de/portal/kkleiderkammers/personalindex/43626
	const url = `/portal/kkleiderkammers/personalindex/${memberId}`;

	const result = [];
	try {
		const resp = await fetch(url);
		const html = await resp.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		const table = doc.querySelector("body > div.d-lg-flex.flex-lg-row > div.flex-lg-grow-1.main-content-wrapper > div > div:nth-child(2) > div.table-responsive-lg > table");
		if (table) {
			// Finde die Indizes der relevanten Spalten
			const headerCells = Array.from(table.querySelectorAll('thead th'));
			// const colNames = ["Bezeichnung", "Bezeichung", "Seriennummer", "Größe"]; // Bezeichnung ist an der Oberfläche falsch geschrieben
			// const colIndices = colNames.map(name => headerCells.findIndex(th => th.textContent.trim() === name));
			// if (colIndices.some(idx => idx === -1)) {
			// 	console.warn('Nicht alle relevanten Spalten gefunden', colIndices);
			// } else {
			const colIndices = [2, 4, 5]; // Bezeichnung, Seriennummer, Größe

			// Zeilen durchgehen
			const rows = table.querySelectorAll('tbody > tr');
			rows.forEach(row => {
				const cells = row.querySelectorAll('td');
				if (cells.length > Math.max(...colIndices)) {
					let bezeichnungValue = cells[colIndices[0]].textContent.trim();
					const seriennummerValue = cells[colIndices[1]].textContent.trim();
					let groesseValue = cells[colIndices[2]].textContent.trim();

					// [{"bezeichnung":"Bayern 2000 Jacke(ID: 2277)","seriennummer":"FF-IPS-PSA-10222","groesse":"52(ID: 2706)"}]
					// Bezeichnung und Größe müssen noch bereinigt werden
					const bezeichnungMatch = bezeichnungValue.match(/^(.*?)(\(ID:\s*\d+\))?$/);
					if (bezeichnungMatch) {
						bezeichnungValue = bezeichnungMatch[1].trim();
					}
					const groesseMatch = groesseValue.match(/^(.*?)(\(ID:\s*\d+\))?$/);
					if (groesseMatch) {
						groesseValue = groesseMatch[1].trim();
					}

					result.push({
						bezeichnung: bezeichnungValue,
						seriennummer: seriennummerValue,
						groesse: groesseValue
					});
				}
			});
			
		} else {
			console.warn('Keine Tabelle für ausgegebene Kleidung gefunden', memberId);
		}
	} catch (e) {
		console.warn('Fehler bei Ermittlung der Details', memberId, e);
	}
	return result;
}
