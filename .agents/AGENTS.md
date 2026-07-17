## GitHub Deploy Rule
Minden egyes kódbázist érintő módosítás vagy fájl szerkesztés után **kötelező** azonnal, kérdés nélkül automatikusan szinkronizálni a változtatásokat a GitHubbal (run `git add .`, `git commit -m "..."`, és `git push origin main`). Nem kell megvárni a "GITHUB" parancsot, ezt mindig végre kell hajtani, amíg a felhasználó kifejezetten másképp nem rendelkezik! Ne buildeld a projektet és a `dist` mappát ne pushold!

## Hibakeresési és Refaktorálási Szabály
SOHA NE változtasd meg a meglévő funkcionalitást hibakeresés vagy optimalizálás során! A hibakeresés (debugging) kizárólag a valódi kódhibák (bugok) felderítésére és a kód funkcionálisan azonos (1:1), de egyszerűbb / tisztább újraírására (refactoring) korlátozódhat. A funkcióknak (pl. termékkulcs átugrás, alapértelmezett választások) mindig érintetlenül kell maradniuk.
