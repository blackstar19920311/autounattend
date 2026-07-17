## GitHub Deploy Rule
If the user types the exact word 'GITHUB' (in all caps) or asks to push to GitHub, you must execute the following sequence without asking: run `git add .`, then `git commit -m "Auto-sync"` (or a more descriptive message based on the recent changes), and finally `git push origin main` to synchronize the local source code with the GitHub repository. Do NOT build the project or push the `dist` folder.

## Hibakeresési és Refaktorálási Szabály
SOHA NE változtasd meg a meglévő funkcionalitást hibakeresés vagy optimalizálás során! A hibakeresés (debugging) kizárólag a valódi kódhibák (bugok) felderítésére és a kód funkcionálisan azonos (1:1), de egyszerűbb / tisztább újraírására (refactoring) korlátozódhat. A funkcióknak (pl. termékkulcs átugrás, alapértelmezett választások) mindig érintetlenül kell maradniuk.
