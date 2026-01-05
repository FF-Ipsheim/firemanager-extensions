// ==UserScript==
// @name         Firemanager Nächste Stiefel Nummer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Ermittlung der nächsten freien Stiefel Nummer
// @author       Jochen Fähnlein
// @match        https://www.firemanager.de/portal/kkleiderkammers
// @grant        none
// ==/UserScript==

document.addEventListener('DOMContentLoaded', function () {
	(function () {
		function addCreateKleiderkammerButton() {
			const btn = document.createElement('button');
			btn.id = 'createKleiderkammerBtn';
			btn.textContent = `Ermittle nächste freie Stiefel Nummer`;
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
				btn.textContent = 'Ermittle ...';

				try {
					const nextFreeNumber = await getStiefelSeriennummer();
					if (nextFreeNumber === null) {
						btn.textContent = `Fehler: Keine Stiefel gefunden!`;
						btn.style.background = '#ff0000';
						return;
					}

					showNextFreeNumber(nextFreeNumber);

					btn.disabled = false;
					btn.textContent = `Ermittle nächste freie Stiefel Nummer`;
				} catch (e) {
					console.error('Fehler bei der Ermittlung:', e);
					btn.textContent = `Fehler bei der Ermittlung!`;
					btn.style.background = '#ff0000';
				}
			};
			document.body.appendChild(btn);
		}

		async function main() {
			addCreateKleiderkammerButton();
		}

		main();
	})();
});

function showNextFreeNumber(nextFreeNumber) {
	const modal = document.createElement('div');
	modal.style.position = 'fixed';
	modal.style.top = '0';
	modal.style.left = '0';
	modal.style.width = '100vw';
	modal.style.height = '100vh';
	modal.style.background = 'rgba(0,0,0,0.4)';
	modal.style.display = 'flex';
	modal.style.alignItems = 'center';
	modal.style.justifyContent = 'center';
	modal.style.zIndex = 10000;

	const dialog = document.createElement('div');
	dialog.style.background = '#fff';
	dialog.style.padding = '32px 24px';
	dialog.style.borderRadius = '8px';
	dialog.style.boxShadow = '0 4px 24px rgba(0,0,0,0.2)';
	dialog.style.textAlign = 'center';
	dialog.innerHTML = `
						<h2>Nächste freie Stiefel Nummer</h2>
						<p style="font-size:2em;font-weight:bold;margin:16px 0;">${nextFreeNumber}</p>
						<button id="closeStiefelModal" style="padding:8px 24px;font-size:1em;">Schließen</button>
					`;

	modal.appendChild(dialog);
	document.body.appendChild(modal);

	document.getElementById('closeStiefelModal').onclick = () => {
		document.body.removeChild(modal);
	};
}

async function getStiefelSeriennummer() {
	const stiefelIds = [
		7694, // Stiefel Elten CRAIG GTX
		2437, // Stiefel Haix
		2286, // Stiefel Jori
		2285, // Stiefel Schlupf Gummi
		2365, // Stiefel Schlupf Leder
		2284, // Stiefel Elten Euro Proof
		9078  // Stiefel Jori Basic Mid S3
	];

	// /portal/kkleiderkammers/ausgegeben/Search.ktyp_id%5B0%5D:7694/Search.ktyp_id%5B1%5D:2437/Search.ktyp_id%5B2%5D:2286/Search.ktyp_id%5B3%5D:2285/Search.ktyp_id%5B4%5D:2365/Search.ktyp_id%5B5%5D:2284/Search.ktyp_id%5B6%5D:9078/Search.ausgemustert:0/Search.limit:1000
	const url = `/portal/kkleiderkammers/ausgegeben/` +
		stiefelIds.map((id, idx) => `Search.ktyp_id%5B${idx}%5D:${id}`).join('/') +
		`/Search.ausgemustert:0/Search.limit:1000`;

	try {
		const resp = await fetch(url);
		const html = await resp.text();
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		
		// Tabelle Bekleidungsübersicht
		const table = doc.querySelector("body > div.d-lg-flex.flex-lg-row > div.flex-lg-grow-1.main-content-wrapper > div.container-fluid.pt-3.ps-4 > div:nth-child(2) > div > div > div.table-responsive-lg > table");
		if (!table) return null;

		const foundStiefelIds = new Set();

		const rows = table.querySelectorAll('table > tbody > tr');
		rows.forEach(row => {
			// Name und Link sind im 4. <td> (Index 3)
			const cells = row.querySelectorAll('td');
			if (cells.length < 3) return;
			const seriennummerCell = cells[3];

			/*
			Beispiel HTML:
			<td>Stiefel_81                   
		<br><span class="fm-descreet-text">(ID:&nbsp;33237)</span></td>
			*/
			const seriennummerText = seriennummerCell.textContent.trim();
			const seriennummerMatch = seriennummerText.match(/^Stiefel_(\d+)/);
			if (seriennummerMatch) {
				const seriennummer = parseInt(seriennummerMatch[1], 10);
				// seriennummer enthält jetzt die Nummer, z.B. 81

				foundStiefelIds.add(seriennummer);
				console.log('Gefundene Stiefel Nummer:', seriennummer);
			} else {
				console.warn('Keine Stiefel Nummer in Seriennummer gefunden:', seriennummerText);
			}
		});

		const maxStiefelId = Math.max(...foundStiefelIds);
		console.log('Maximale gefundene Stiefel Nummer:', maxStiefelId);

		const nextFreeNumber = maxStiefelId + 1;
		console.log('Nächste freie Stiefel Nummer:', nextFreeNumber);

		return nextFreeNumber;
	} catch (e) { 
		console.warn('Fehler bei getStiefelSeriennummer"', e); return null; 
	}
}
