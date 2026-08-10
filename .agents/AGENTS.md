## GitHub Deploy Rule
- **GITHUB mód**: Ha a felhasználó beírja a GITHUB kulcsszót, attól a pillanattól kezdve **minden egyes változtatás után automatikusan és azonnal** végre kell hajtani a GitHub szinkronizációt (git add ., git commit -m "...", git push origin main). Pl. ha 10 módosítás van sorban, 10-szer kell pushtolni, rögtön a módosítások után.
- **OFFLINE mód**: Ha a felhasználó beírja az OFFLINE kulcsszót, a GitHub szinkronizáció leáll. A módosításokat **nem** szabad feltölteni a távoli repóba, egészen addig, amíg újra be nem írja a GITHUB szót.
- Ne buildeld a projektet és a dist mappát ne pushold!

## GitHub Deploy Rule
- **GITHUB mód**: Ha a felhasználó beírja a GITHUB kulcsszót, attól a pillanattól kezdve **minden egyes változtatás után automatikusan és azonnal** végre kell hajtani a GitHub szinkronizációt (git add ., git commit -m "...", git push origin main). Pl. ha 10 módosítás van sorban, 10-szer kell pushtolni, rögtön a módosítások után.
- **OFFLINE mód**: Ha a felhasználó beírja az OFFLINE kulcsszót, a GitHub szinkronizáció leáll. A módosításokat **nem** szabad feltölteni a távoli repóba, egészen addig, amíg újra be nem írja a GITHUB szót.
- Ne buildeld a projektet és a dist mappát ne pushold!

## Hibakeresési és Refaktorálási Szabály
SOHA NE változtasd meg a meglévő funkcionalitást hibakeresés vagy optimalizálás során! A hibakeresés (debugging) kizárólag a valódi kódhibák (bugok) felderítésére és a kód funkcionálisan azonos (1:1), de egyszerűbb / tisztább újraírására (refactoring) korlátozódhat. A funkcióknak (pl. termékkulcs átugrás, alapértelmezett választások) mindig érintetlenül kell maradniuk.

## READ-ONLY Mód Szabály
- **READ-ONLY mód**: Ha a felhasználó arra utasít, hogy READ-ONLY (Csak olvasható) módban működjek, vagy csak lekérdezést kér módosítás nélkül, akkor **tilos** bármilyen fájlt módosítani, és **KIZÁRÓLAG** azokat a fájlokat vizsgálhatom, amelyek a helyi gépen (a jelenlegi fájlrendszerben) ténylegesen léteznek. **TILOS** korábbi GitHub commitok fájljait, vagy a jelenlegi állapoton már nem létező fájlokat/állapotokat vizsgálni, elemezni, vagy azokból információt lekérni.

## Kötelező Dokumentáció Kutatás
- Mielőtt **BÁRMILYEN** kódmódosítást, új funkció implementálását, vagy a működési logika megváltoztatását végezném a projekten, **kötelezően** rá kell keresnem a hivatalos Microsoft Learn vagy más releváns dokumentációban a weben (`search_web`), hogy biztosan a legújabb, hivatalos és támogatott logikát alkalmazzam, különös tekintettel a **Windows 11 (24H2/25H2)** specifikus követelményekre! Elavult (Windows 10) kulcsok használata és a találgatás szigorúan tilos!
