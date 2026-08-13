## GitHub Deploy Rule
- **GITHUB mód**: Ha a felhasználó beírja a `GITHUB` kulcsszót, attól a pillanattól kezdve **minden egyes változtatás után automatikusan és azonnal** végre kell hajtani a GitHub szinkronizációt (`git add .`, `git commit -m "..."`, `git push origin main`). Pl. ha 10 módosítás van sorban, 10-szer kell pushtolni, rögtön a módosítások után.
- **OFFLINE mód**: Ha a felhasználó beírja az `OFFLINE` kulcsszót, a GitHub szinkronizáció leáll. A módosításokat **nem** szabad feltölteni a távoli repóba, egészen addig, amíg újra be nem írja a `GITHUB` szót.
- Ne buildeld a projektet és a `dist` mappát ne pushold!

## Hibakeresési és Refaktorálási Szabály
SOHA NE változtasd meg a meglévő funkcionalitást hibakeresés vagy optimalizálás során! A hibakeresés (debugging) kizárólag a valódi kódhibák (bugok) felderítésére és a kód funkcionálisan azonos (1:1), de egyszerűbb / tisztább újraírására (refactoring) korlátozódhat. A funkcióknak (pl. termékkulcs átugrás, alapértelmezett választások) mindig érintetlenül kell maradniuk.
