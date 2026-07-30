/**
 * Kiegészítő fordítások.
 *
 * Szándékosan külön fájl: a `translations.js` ~40 KB, és a hozzáadott kulcsokat
 * így nem kell belekeverni. A LanguageContext úgy fűzi össze őket, hogy a
 * MEGLÉVŐ `translations.js` bejegyzések elsőbbséget kapnak, ezek csak a
 * hiányzó kulcsokat pótolják.
 */
export const extraTranslations = {
  hu: {
    // --- Validáció ---
    'val.username.req': 'A felhasználónév megadása kötelező.',
    'val.username.max': 'A felhasználónév legfeljebb 20 karakter lehet.',
    'val.username.invalidChars': 'A felhasználónév tiltott karaktert tartalmaz.',
    'val.computerName.prefixReq': 'A számítógépnév megadása kötelező.',
    'val.computerName.maxLength': 'Túl hosszú számítógépnév (véletlen utótaggal max. 8, egyébként max. 15 karakter).',
    'val.computerName.invalidChars': 'A számítógépnév csak betűt, számot és kötőjelet tartalmazhat.',
    'val.productKey.format': 'A termékkulcs formátuma: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
    'val.autoLogin.usernameReq': 'Automatikus bejelentkezéshez felhasználónév kell.',
    'val.autoLogin.noPassword': 'Automatikus bejelentkezés jelszó nélkül: a gépet bárki használhatja, aki hozzáér.',
    'val.part.diskReq': 'A lemez számának megadása kötelező.',
    'val.part.diskRange': 'Érvénytelen lemezszám (0–63).',
    'val.part.efiTooSmall': 'Az EFI partíció legalább 100 MB legyen (javasolt: 300 MB).',
    'val.part.windowsTooSmall': 'A Windows partíció legalább 32 GB (32768 MB) legyen.',
    'val.part.recoveryTooSmall': 'A Recovery partíció legalább 512 MB legyen.',
    'val.part.sizeWarning': 'Ellenőrizd, hogy a célgép lemeze elég nagy a megadott Windows + Adatok + Recovery elrendezéshez, különben a DISKPART elhasal.',
    'val.part.fullWipeWarning': 'A CLEAN ALL nullázza a teljes lemezt. HDD-n ez órákig tarthat, és VISSZAFORDÍTHATATLAN.',
    'val.part.scriptReq': 'Az egyéni DISKPART szkript nem lehet üres.',
    'val.part.idReq': 'Érvényes telepítési partíció azonosító kell (>= 1).',
    'val.part.idOutOfRange': 'A megadott partíció azonosítót az egyéni szkript nem hozza létre.',
    'val.wifi.ssidReq': 'Az SSID megadása kötelező.',
    'val.wifi.passReq': 'A Wi-Fi jelszó megadása kötelező (nyílt hálózatnál válts biztonsági módot).',
    'val.wifi.plaintextWarning': 'A Wi-Fi jelszó NYÍLT SZÖVEGBEN kerül az XML-be. Ez az unattend formátum sajátja.',
    'val.domain.nameReq': 'A tartomány nevének megadása kötelező.',
    'val.domain.userReq': 'A tartományi felhasználó megadása kötelező.',
    'val.domain.passReq': 'A tartományi jelszó megadása kötelező.',
    'val.domain.plaintextWarning': 'A tartományi jelszó NYÍLT SZÖVEGBEN kerül az XML-be. Használj minimális jogú join-fiókot!',
    'val.password.plaintextWarning': 'A helyi fiók jelszava NYÍLT SZÖVEGBEN kerül az XML-be. Telepítés után töröld a C:\\Windows\\Panther\\unattend.xml fájlt.',
    'val.officeKey.format': 'Az Office kulcs formátuma: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
    'val.winget.noDriveD': 'D: útvonalra telepítendő appot választottál, de az "Csak C:" particionálás nem hoz létre D: meghajtót.',
    'val.uac.warning': 'Az UAC kikapcsolása (EnableLUA=0) Windows 11-en megbénítja a Store/UWP appokat és a Beállítások alkalmazást.',

    // --- Státusz ---
    'app.status.warnings': 'Figyelmeztetések',

    // --- Rendszerinformációk ---
    'sysinfo.timeZone': 'Időzóna',
    'sysinfo.timeZone.desc': 'Korábban fixen közép-európai időzóna került az XML-be, a nyelvtől függetlenül.',
    'sysinfo.productKey.emptyHint': 'Hagyd üresen, ha a telepítőlemez kiadását akarod használni. Kulcs megadása egy adott kiadásra (pl. Pro) kényszeríti a telepítést.',

    // --- Particionálás ---
    'part.size.efi': 'EFI partíció mérete (MB)',
    'part.size.windows': 'Windows partíció mérete (MB)',
    'part.size.recovery': 'Recovery partíció mérete (MB)',
    'part.size.desc': 'A méretek korábban be voltak égetve, ezért kisebb SSD-n a particionálás elhasalt.',

    // --- Wi-Fi ---
    'wifi.security': 'Biztonsági mód',
    'wifi.security.wpa2psk': 'WPA2-Personal (AES)',
    'wifi.security.wpa3sae': 'WPA3-Personal (SAE)',
    'wifi.security.open': 'Nyílt (jelszó nélkül)',
    'wifi.plaintext.warning': 'A jelszó nyílt szövegben kerül a generált XML-be.',

    // --- Személyre szabás / Fájlkezelő ---
    'pers.explorer': 'Fájlkezelő',
    'pers.explorer.fileExtensions': 'Fájlkiterjesztések megjelenítése',
    'pers.explorer.fileExtensions.desc': 'Az ismert fájltípusok kiterjesztése is látszik.',
    'pers.explorer.hiddenFiles': 'Rejtett fájlok megjelenítése',
    'pers.explorer.hiddenFiles.desc': 'A rejtett fájlok és mappák is megjelennek.',
    'pers.explorer.thisPC': 'Fájlkezelő indítása a Gépnél',
    'pers.explorer.thisPC.desc': 'A Kezdőlap helyett a "Ez a gép" nyílik meg.',

    // --- Adatvédelem ---
    'privacy.uac.warning': 'FIGYELEM: az UAC kikapcsolása Windows 11-en megbénítja a Store/UWP alkalmazásokat és a Beállítások appot. Csak akkor használd, ha pontosan tudod, mit vállalsz.',

    // --- Bloatware ---
    'bloat.legacyCapabilities': 'Örökölt Windows képességek eltávolítása',
    'bloat.legacyCapabilities.desc': 'Internet Explorer, WordPad, Fax és Szkennelés, Windows Media Player, Lépésrögzítő, Kézírás-felismerés.',
    'bloat.bingSearchNote': 'Megjegyzés: a Bing Hírek eltávolítása NEM érinti a Start menü keresést (a Microsoft.BingSearch csomag szándékosan megmarad).',
  },

  en: {
    'val.username.req': 'Username is required.',
    'val.username.max': 'Username must be 20 characters or fewer.',
    'val.username.invalidChars': 'Username contains invalid characters.',
    'val.computerName.prefixReq': 'Computer name is required.',
    'val.computerName.maxLength': 'Computer name too long (max 8 with random suffix, otherwise max 15).',
    'val.computerName.invalidChars': 'Computer name may only contain letters, digits and hyphens.',
    'val.productKey.format': 'Product key format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
    'val.autoLogin.usernameReq': 'Auto logon requires a username.',
    'val.autoLogin.noPassword': 'Auto logon without a password: anyone with physical access can use the machine.',
    'val.part.diskReq': 'Disk number is required.',
    'val.part.diskRange': 'Invalid disk number (0-63).',
    'val.part.efiTooSmall': 'The EFI partition should be at least 100 MB (300 MB recommended).',
    'val.part.windowsTooSmall': 'The Windows partition should be at least 32 GB (32768 MB).',
    'val.part.recoveryTooSmall': 'The Recovery partition should be at least 512 MB.',
    'val.part.sizeWarning': 'Make sure the target disk is large enough for the Windows + Data + Recovery layout, otherwise DISKPART will fail.',
    'val.part.fullWipeWarning': 'CLEAN ALL zeroes the entire disk. On an HDD this can take hours and it is IRREVERSIBLE.',
    'val.part.scriptReq': 'The custom DISKPART script cannot be empty.',
    'val.part.idReq': 'A valid install partition ID is required (>= 1).',
    'val.part.idOutOfRange': 'The custom script does not create the partition ID you selected.',
    'val.wifi.ssidReq': 'SSID is required.',
    'val.wifi.passReq': 'Wi-Fi password is required (switch security mode for open networks).',
    'val.wifi.plaintextWarning': 'The Wi-Fi password is stored in PLAIN TEXT in the XML. That is inherent to the unattend format.',
    'val.domain.nameReq': 'Domain name is required.',
    'val.domain.userReq': 'Domain user is required.',
    'val.domain.passReq': 'Domain password is required.',
    'val.domain.plaintextWarning': 'The domain password is stored in PLAIN TEXT in the XML. Use a least-privilege join account.',
    'val.password.plaintextWarning': 'The local account password is stored in PLAIN TEXT in the XML. Delete C:\\Windows\\Panther\\unattend.xml after setup.',
    'val.officeKey.format': 'Office key format: XXXXX-XXXXX-XXXXX-XXXXX-XXXXX',
    'val.winget.noDriveD': 'You picked an app that installs to D:, but the "C: only" layout does not create a D: drive.',
    'val.uac.warning': 'Disabling UAC (EnableLUA=0) breaks Store/UWP apps and the Settings app on Windows 11.',

    'app.status.warnings': 'Warnings',

    'sysinfo.timeZone': 'Time zone',
    'sysinfo.timeZone.desc': 'Previously the XML always hardcoded Central European time, regardless of language.',
    'sysinfo.productKey.emptyHint': 'Leave empty to use the edition on the installation media. Providing a key forces a specific edition (e.g. Pro).',

    'part.size.efi': 'EFI partition size (MB)',
    'part.size.windows': 'Windows partition size (MB)',
    'part.size.recovery': 'Recovery partition size (MB)',
    'part.size.desc': 'These sizes used to be hardcoded, which made partitioning fail on smaller SSDs.',

    'wifi.security': 'Security mode',
    'wifi.security.wpa2psk': 'WPA2-Personal (AES)',
    'wifi.security.wpa3sae': 'WPA3-Personal (SAE)',
    'wifi.security.open': 'Open (no password)',
    'wifi.plaintext.warning': 'The password is stored in plain text in the generated XML.',

    'pers.explorer': 'File Explorer',
    'pers.explorer.fileExtensions': 'Show file extensions',
    'pers.explorer.fileExtensions.desc': 'Extensions of known file types are shown.',
    'pers.explorer.hiddenFiles': 'Show hidden files',
    'pers.explorer.hiddenFiles.desc': 'Hidden files and folders become visible.',
    'pers.explorer.thisPC': 'Open Explorer at This PC',
    'pers.explorer.thisPC.desc': 'Opens "This PC" instead of Home.',

    'privacy.uac.warning': 'WARNING: disabling UAC breaks Store/UWP apps and the Settings app on Windows 11. Only use it if you know exactly what you are giving up.',

    'bloat.legacyCapabilities': 'Remove legacy Windows capabilities',
    'bloat.legacyCapabilities.desc': 'Internet Explorer, WordPad, Fax and Scan, Windows Media Player, Steps Recorder, Math Recognizer.',
    'bloat.bingSearchNote': 'Note: removing Bing News does NOT affect Start menu search (the Microsoft.BingSearch package is deliberately kept).',
  },
};
