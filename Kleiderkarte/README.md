# Functionality

Generates documents listing all clothing items belonging to all active members. These can be printed out and placed in the locker of the respective member.

## Example output

**Kleiderkarte**  

**Name:** Mustermann, Max  
**Mitglieds-ID:** 4711  
**Spindnummer:** 37  

| Bezeichnung          | Seriennummer | Größe |
|----------------------|--------------|-------|
| Bayern 2000 Jacke    | 10222        | 52    |
| Bayern 2000 Latzhose | 10326        | 52    |

## Execution

1. Generate the report with the button `Kleiderkammer Auswertung erstellen` on one of the following pages:
   - Aktive Mitglieder - https://www.firemanager.de/portal/personals
   - Personalbogen - https://www.firemanager.de/portal/OpenPersonalkartei/*
   - Übersicht der ausgegeben Kleidung (personenbezogen) - https://www.firemanager.de/portal/kkleiderkammers/personalindex/*

2. Save the result in file `firemanager_kleiderkammer_auswertung.json`

3. Create the document from the report:

   ```sh
   node erzeuge_seriendruck.js
   ```

    The command expects the input file `firemanager_kleiderkammer_auswertung.json` in the current working directory.

## Printing

To print the result. Therefor change the printer settings to paper **DIN-A5**
