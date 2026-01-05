# Firemanager Extensions

## Tampermonkey

To use the scripts you have to install the *Tampermonkey* [browser extension](https://www.tampermonkey.net/).  
The scripts from the following sections can be used to extend the functionality of [firemanager.de](https://www.firemanager.de/portal).

## Content

### Kleiderkarte

[Kleiderkarte - README](./Kleiderkarte/README.md)  

Generates documents listing all clothing items belonging to all active members. These can be printed out and placed in the locker of the respective member.

### Übungsbesuche

[Übungsbesuche - README](./Uebungsbesuche/README.md)  

Generates a JSON report on the exercise participation of each active member.

### Nächste Stiefel Nummer

[Nächste Stiefel Nummer - README](./Naechste%20Stiefel%20Nummer/README.md)  

Since patches with generated serial numbers do not last permanently on the boots, it was decided to mark them only with a consecutive number using a permanent marker.  
The template “Stiefel_&lt;sequential number>” is selected for this purpose.  
The script extracts the `sequential number` and prints the next usable one.
