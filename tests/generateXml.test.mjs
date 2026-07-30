import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateXml,
  escapeXml,
  psQuote,
  normalizeConfig,
  resolveLocale,
  buildDiskpartCommands,
  buildWingetCustomList,
} from '../src/utils/generateXml.js';
import { getDefaultConfig } from '../src/data/defaultConfig.js';
import { decodeBase64ToUtf8, decodeBase64ToUtf16Le } from '../src/utils/base64.js';

// --- Segédek ----------------------------------------------------------------

/**
 * Egyszerű tag-nesting ellenőrzés. Nem teljes XML validátor, de elkapja a
 * rosszul zárt / lezáratlan elemeket, ami a kézzel épített kimenet fő rizikója.
 */
function assertWellFormed(xml) {
  const body = xml.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z_][\w.:-]*)([^>]*?)(\/?)>/g;
  let m;
  while ((m = tagRe.exec(body)) !== null) {
    const closing = m[1];
    const name = m[2];
    const selfClose = m[4];
    if (selfClose) continue;
    if (closing) {
      const top = stack.pop();
      assert.equal(top, name, `Rosszul zárt tag: </${name}>, a stack tetején: <${top}>`);
    } else {
      stack.push(name);
    }
  }
  assert.deepEqual(stack, [], `Le nem zárt tagek: ${stack.join(', ')}`);
}

/** A <File path="...">base64</File> elemek kinyerése. */
function extractFiles(xml) {
  const files = new Map();
  const re = /<File path="([^"]+)">([^<]*)<\/File>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    files.set(m[1], m[2]);
  }
  return files;
}

function decodeFile(path, b64) {
  return /\.(vbs|reg)$/i.test(path) ? decodeBase64ToUtf16Le(b64) : decodeBase64ToUtf8(b64);
}

function fullConfig(overrides = {}) {
  return { ...getDefaultConfig(), ...overrides };
}

// --- Alapok -----------------------------------------------------------------

test('a generálás lefut és jól formált XML-t ad (böngésző-kompatibilis base64)', () => {
  const xml = generateXml(getDefaultConfig());
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
  assert.ok(xml.includes('<unattend'));
  assert.ok(xml.trimEnd().endsWith('</unattend>'));
  assertWellFormed(xml);
});

test('a kimenetben nincs "undefined" vagy "[object Object]"', () => {
  const xml = generateXml(
    fullConfig({
      username: 'Teszt',
      password: 'Titok123',
      autoLogin: true,
      hideTaskbarIcons: true,
      showAllTrayIcons: true,
      cleanStartPins: true,
      removeLegacyCapabilities: true,
      bloatware: { ...getDefaultConfig().bloatware, terminal: true, bingNews: true },
      wifi: { mode: 'auto', ssid: 'Otthon & Co', password: 'wifiPass', security: 'wpa2psk' },
      customScripts: {
        ...getDefaultConfig().customScripts,
        wingetApps: 'versionA',
        office: 'versionB',
        officeKey: 'AAAAA-BBBBB-CCCCC-DDDDD-EEEEE',
        pcManager: true,
        windowsUpdate: true,
        domainJoin: true,
        domainName: 'corp.local',
        domainUser: 'corp\\join',
        domainPass: 'JoinPass1',
      },
    })
  );
  assert.ok(!xml.includes('undefined'), 'undefined szivárgott a kimenetbe');
  assert.ok(!xml.includes('[object Object]'));
  assertWellFormed(xml);
});

// --- Base64 / ExtractScript -------------------------------------------------

test('a <File> tartalma base64, és visszafejtve az eredeti szkriptet adja', () => {
  const xml = generateXml(fullConfig({ hideTaskbarIcons: true }));
  const files = extractFiles(xml);
  assert.ok(files.size > 0, 'nem generálódott egyetlen File elem sem');

  for (const [path, b64] of files) {
    assert.match(b64, /^[A-Za-z0-9+/]+=*$/, `nem valid base64: ${path}`);
    const decoded = decodeFile(path, b64);
    assert.ok(decoded.length > 0, `üres tartalom: ${path}`);
    // Ha a base64 nem lenne dekódolva a kicsomagolásnál, a fájlokba a base64
    // sztring kerülne – ezt fogja meg ez az assert.
    assert.ok(!/^[A-Za-z0-9+/]{80,}=*$/.test(decoded.trim()), `a tartalom base64 maradt: ${path}`);
  }

  const specialize = [...files.entries()].find(([p]) => p.endsWith('Specialize.ps1'));
  assert.ok(specialize, 'nincs Specialize.ps1');
  assert.match(decodeFile(...specialize), /Write-SetupLog/);
});

test('az ExtractScript base64-et dekódol, nem nyers szöveget ír ki', () => {
  const xml = generateXml(getDefaultConfig());
  assert.match(xml, /FromBase64String/, 'az ExtractScript nem dekódol base64-et');
  // A régi, hibás megoldás jellemzője: encoding-találgatás + GetPreamble.
  assert.ok(!xml.includes('GetPreamble'), 'maradt a dupla BOM-ot okozó GetPreamble');
});

test('a .vbs fájlok UTF-16LE BOM-mal, pontosan egyszer', () => {
  const xml = generateXml(fullConfig({ hideTaskbarIcons: true }));
  const files = extractFiles(xml);
  const vbs = [...files.entries()].filter(([p]) => p.endsWith('.vbs'));
  assert.ok(vbs.length > 0, 'nem generálódott .vbs fájl');
  for (const [path, b64] of vbs) {
    const decoded = decodeBase64ToUtf16Le(b64);
    assert.ok(!decoded.startsWith('\uFEFF'), `dupla BOM: ${path}`);
    assert.match(decoded, /StdRegProv/);
  }
});

// --- Config kulcsok (a UI és a generátor összhangja) ------------------------

test('a UI felhasználóneve és jelszava eljut az XML-be', () => {
  const xml = generateXml(fullConfig({ username: 'DaNi', password: 'Pw12345', autoLogin: true }));
  assert.match(xml, /<Name>DaNi<\/Name>/);
  assert.match(xml, /<Value>Pw12345<\/Value>/);
  assert.match(xml, /<AutoLogon>/);
  assert.match(xml, /<Username>DaNi<\/Username>/);
  // A régi generátor a config.localUser-t olvasta, ezért mindig ez ment ki:
  assert.ok(!xml.includes('<Name>Rendszergazda</Name>'));
});

test('a wingetApps=versionA tényleg legenerálja a winget szkriptet', () => {
  const cfg = fullConfig();
  cfg.customScripts = { ...cfg.customScripts, wingetApps: 'versionA' };
  const xml = generateXml(cfg);
  const files = extractFiles(xml);
  const winget = [...files.entries()].find(([p]) => p.endsWith('App-Winget.ps1'));
  assert.ok(winget, 'a winget szkript nem generálódott le');
  const script = decodeFile(...winget);
  assert.match(script, /qBittorrent/);
  // #5: a $FullLog korábban definiálatlan volt.
  assert.match(script, /\$FullLog = /, 'a $FullLog nincs definiálva');
});

test('a régi kulcsnevek is működnek (visszamenős kompatibilitás)', () => {
  const normalized = normalizeConfig({
    localUser: { username: 'Old', password: 'OldPw' },
    autoLogon: true,
    customScripts: { winget: 'presetB' },
  });
  assert.equal(normalized.account.username, 'Old');
  assert.equal(normalized.account.password, 'OldPw');
  assert.equal(normalized.account.autoLogon, true);
  assert.equal(normalized.wingetMode, 'presetB');
});

// --- Séma / tiltott elemek --------------------------------------------------

test('nincs beégetett generic Pro termékkulcs', () => {
  const xml = generateXml(getDefaultConfig());
  assert.ok(!xml.includes('VK7JG-NPHTM'), 'beégetett generic Pro kulcs');
  assert.ok(!xml.includes('<ProductKey>'), 'üres kulcs esetén nem kellene ProductKey elem');
});

test('megadott termékkulcs bekerül', () => {
  const xml = generateXml(fullConfig({ productKey: 'AAAAA-BBBBB-CCCCC-DDDDD-EEEEE' }));
  assert.match(xml, /<Key>AAAAA-BBBBB-CCCCC-DDDDD-EEEEE<\/Key>/);
});

test('nincs invalid PasswordExpires a LocalAccount alatt', () => {
  const xml = generateXml(fullConfig({ disablePasswordExpiration: true, password: 'x' }));
  assert.ok(!xml.includes('<PasswordExpires>'), 'PasswordExpires nem valid a LocalAccount alatt');
});

test('nincs SkipMachineOOBE / SkipUserOOBE', () => {
  const xml = generateXml(fullConfig({ silentOOBEBlueScreens: true }));
  assert.ok(!xml.includes('SkipMachineOOBE'));
  assert.ok(!xml.includes('SkipUserOOBE'));
  assert.match(xml, /<HideOnlineAccountScreens>true<\/HideOnlineAccountScreens>/);
});

test('nem írunk globális profile.ps1-et a System32-be', () => {
  const xml = generateXml(getDefaultConfig());
  assert.ok(!xml.includes('profile.ps1'), 'a System32 profile.ps1 hack visszakerült');
  assert.ok(!xml.includes('Invoke-ExecutionPolicyBypass'), 'a -NoProfile miatt sosem működő függvény');
});

test('a specialize RunSynchronous a Deployment komponensben van', () => {
  const xml = generateXml(getDefaultConfig());
  const specializeBlock = xml.slice(
    xml.indexOf('<settings pass="specialize">'),
    xml.indexOf('<settings pass="oobeSystem">')
  );
  const deploymentIdx = specializeBlock.indexOf('Microsoft-Windows-Deployment');
  const runSyncIdx = specializeBlock.indexOf('<RunSynchronous>');
  const shellIdx = specializeBlock.indexOf('Microsoft-Windows-Shell-Setup');
  assert.ok(deploymentIdx > -1, 'nincs Deployment komponens');
  assert.ok(runSyncIdx > deploymentIdx && runSyncIdx < shellIdx, 'a RunSynchronous rossz komponensben van');
});

test('a Setup komponens gyerekelemei sorrendben: DiskConfiguration, ImageInstall, RunSynchronous, UserData', () => {
  const cfg = fullConfig({ bypassHardware: true });
  const xml = generateXml(cfg);
  const peBlock = xml.slice(xml.indexOf('<settings pass="windowsPE">'), xml.indexOf('<settings pass="specialize">'));
  const order = ['<DiskConfiguration>', '<ImageInstall>', '<RunSynchronous>', '<UserData>']
    .map((tag) => peBlock.indexOf(tag))
    .filter((i) => i > -1);
  const sorted = [...order].sort((a, b) => a - b);
  assert.deepEqual(order, sorted, 'a Microsoft-Windows-Setup gyerekelemei nem séma szerinti sorrendben vannak');
});

test('a területi beállítások az International-Core komponensben vannak az oobeSystemben', () => {
  const xml = generateXml(getDefaultConfig());
  const oobeBlock = xml.slice(xml.indexOf('<settings pass="oobeSystem">'));
  const intlIdx = oobeBlock.indexOf('Microsoft-Windows-International-Core');
  const inputIdx = oobeBlock.indexOf('<InputLocale>');
  const shellIdx = oobeBlock.indexOf('Microsoft-Windows-Shell-Setup');
  assert.ok(intlIdx > -1 && inputIdx > intlIdx && inputIdx < shellIdx, 'az InputLocale rossz komponensben van');
});

// --- Nyelv / időzóna -------------------------------------------------------

test('angol telepítés nem kap magyar területi beállítást és időzónát', () => {
  const xml = generateXml(fullConfig({ installLanguage: 'en', timeZone: 'UTC' }));
  assert.ok(!xml.includes('hu-HU'), 'magyar locale szivárgott angol telepítésbe');
  assert.match(xml, /<TimeZone>UTC<\/TimeZone>/);
  assert.ok(!xml.includes('Central Europe Standard Time'));
});

test('a magyar telepítés a beállított időzónát használja', () => {
  const xml = generateXml(fullConfig({ installLanguage: 'hu', timeZone: 'W. Europe Standard Time' }));
  assert.match(xml, /<TimeZone>W\. Europe Standard Time<\/TimeZone>/);
});

test('az angol kiosztás hozzáadása egyetlen helyről jön', () => {
  const locale = resolveLocale({ installLanguage: 'hu', addEnglishKeyboard: true });
  assert.equal(locale.inputLocale, '040e:0000040e;0409:00000409');
  const xml = generateXml(fullConfig({ addEnglishKeyboard: true }));
  const occurrences = xml.split('040e:0000040e;0409:00000409').length - 1;
  assert.equal(occurrences, 2, 'windowsPE + oobeSystem, mindkettő ugyanabból a forrásból');
});

// --- Diskpart ---------------------------------------------------------------

test('autocd: a SHRINK a FORMAT UTÁN van (a fordítottja garantáltan elhasal)', () => {
  const cfg = fullConfig();
  cfg.partitioning = { ...cfg.partitioning, mode: 'autocd' };
  const xml = generateXml(cfg);
  const shrinkIdx = xml.indexOf('SHRINK MINIMUM');
  const dataFormatIdx = xml.indexOf('FORMAT QUICK FS=NTFS LABEL=&quot;Adatok&quot;');
  assert.ok(dataFormatIdx > -1, 'nincs Adatok partíció formázás');
  assert.ok(shrinkIdx > dataFormatIdx, 'a SHRINK a FORMAT ELŐTT van');
});

test('autocd: a D: kap betűjelet', () => {
  const cfg = fullConfig();
  cfg.partitioning = { ...cfg.partitioning, mode: 'autocd' };
  const xml = generateXml(cfg);
  assert.match(xml, /ASSIGN LETTER=D/);
});

test('a particióméretek konfigurálhatók', () => {
  const cfg = fullConfig();
  cfg.partitioning = { ...cfg.partitioning, mode: 'autocd', windowsSizeMb: 65536, efiSizeMb: 512, recoverySizeMb: 2048 };
  const xml = generateXml(cfg);
  assert.match(xml, /CREATE PARTITION PRIMARY SIZE=65536/);
  assert.match(xml, /CREATE PARTITION EFI SIZE=512/);
  assert.match(xml, /SHRINK MINIMUM=2048/);
  assert.ok(!xml.includes('SIZE=153600'), 'a beégetett 150 GB még ott van');
});

test('az EFI méret egységes az auto és autocd módban', () => {
  const auto = fullConfig();
  auto.partitioning = { ...auto.partitioning, mode: 'auto' };
  const autoXml = generateXml(auto);
  assert.match(autoXml, /<Size>300<\/Size>/);
  assert.ok(!autoXml.includes('<Size>100</Size>'), 'auto módban maradt a 100 MB-os EFI');
});

test('fullWipe nélkül CLEAN, fullWipe-pal CLEAN ALL', () => {
  const base = fullConfig();
  base.partitioning = { ...base.partitioning, mode: 'autocd', fullWipe: false };
  assert.ok(generateXml(base).includes('echo CLEAN&'), 'sima CLEAN kellene');

  const wipe = fullConfig();
  wipe.partitioning = { ...wipe.partitioning, mode: 'autocd', fullWipe: true };
  assert.match(generateXml(wipe), /echo CLEAN ALL/);
});

test('a diskpart sorok egyetlen cmd blokkba kerülnek', () => {
  const { cmds, order } = buildDiskpartCommands(['SELECT DISK=0', 'CLEAN', 'CONVERT GPT'], 'Teszt', 1);
  const paths = cmds.filter((l) => l.includes('<Path>'));
  assert.equal(paths.length, 2, 'egy echo blokk + egy diskpart futtatás');
  assert.equal(order, 3);
  assert.match(paths[0], /cmd \/c \(echo SELECT DISK=0&amp;echo CLEAN&amp;echo CONVERT GPT\)&gt;X:\\diskpart\.txt/);
});

test('a diskpart escapeli a cmd metakaraktereket', () => {
  const { cmds } = buildDiskpartCommands(['LABEL="A&B"'], 'Teszt', 1);
  assert.match(cmds.find((l) => l.includes('<Path>')), /\^&amp;/);
});

// --- Takarítás / ütemezett feladatok ---------------------------------------

test('a FirstLogon nem törli az ütemezett feladatok fájljait', () => {
  const xml = generateXml(fullConfig({ hideTaskbarIcons: true, showAllTrayIcons: true }));
  const files = extractFiles(xml);

  // A task XML és VBS a TARTÓS mappában van.
  for (const path of files.keys()) {
    if (path.endsWith('UnlockStartLayout.vbs') || path.endsWith('ShowAllTrayIcons.vbs')) {
      assert.match(path, /Setup\\Files\\/, `${path} a törölt Scripts mappában van`);
    }
  }

  const firstLogon = [...files.entries()].find(([p]) => p.endsWith('FirstLogon.ps1'));
  const script = decodeFile(...firstLogon);
  assert.match(script, /Remove-Item -LiteralPath 'C:\\Windows\\Setup\\Scripts'/);
  assert.ok(!script.includes("Remove-Item -LiteralPath 'C:\\Windows\\Setup'"), 'túl sokat töröl');
});

test('az UnattendGenerator event source regisztrálva van', () => {
  const xml = generateXml(fullConfig({ hideTaskbarIcons: true }));
  const files = extractFiles(xml);
  const specialize = [...files.entries()].find(([p]) => p.endsWith('Specialize.ps1'));
  const script = decodeFile(...specialize);
  assert.match(script, /New-EventLog -LogName 'Application' -Source 'UnattendGenerator'/);
});

test('a Default User hive kicsatolása finally blokkban van', () => {
  const xml = generateXml(fullConfig({ showFileExtensions: true }));
  const files = extractFiles(xml);
  const du = [...files.entries()].find(([p]) => p.endsWith('DefaultUser.ps1'));
  assert.ok(du, 'nincs DefaultUser.ps1');
  const script = decodeFile(...du);
  assert.match(script, /} finally \{[\s\S]*reg\.exe unload/);
});

// --- Bloatware / tweak-ek ---------------------------------------------------

test('a Bing Hírek eltávolítása nem lövi ki a Start keresést', () => {
  const cfg = fullConfig();
  cfg.bloatware = { ...cfg.bloatware, bingNews: true };
  const xml = generateXml(cfg);
  const files = extractFiles(xml);
  const rp = [...files.entries()].find(([p]) => p.endsWith('RemovePackages.ps1'));
  const script = decodeFile(...rp);
  assert.match(script, /Microsoft\.BingNews/);
  assert.ok(!script.includes('Microsoft.BingSearch'), 'a BingSearch eltávolítása kilövi a Start keresést');
  // Pontos egyezés, nem wildcard.
  assert.match(script, /\$_\.DisplayName -eq \$selector/);
  assert.ok(!script.includes('-like'), 'wildcard matching maradt');
});

test('a jelszó-lejárat tiltása a kapcsolót követi', () => {
  const on = generateXml(fullConfig({ disablePasswordExpiration: true }));
  const off = generateXml(fullConfig({ disablePasswordExpiration: false }));
  const scriptOf = (xml) => {
    const files = extractFiles(xml);
    const s = [...files.entries()].find(([p]) => p.endsWith('Specialize.ps1'));
    return decodeFile(...s);
  };
  assert.match(scriptOf(on), /maxpwage:UNLIMITED/);
  assert.ok(!scriptOf(off).includes('maxpwage'), 'a kapcsolót figyelmen kívül hagyja');
});

test('az egérgyorsítás kikapcsolása a threshold értékeket is állítja', () => {
  const xml = generateXml(fullConfig({ disableMouseAcceleration: true }));
  const files = extractFiles(xml);
  const du = [...files.entries()].find(([p]) => p.endsWith('DefaultUser.ps1'));
  const script = decodeFile(...du);
  assert.match(script, /MouseThreshold1/);
  assert.match(script, /MouseThreshold2/);
});

test('a Start menü tweak-ek a Win11-es registry kulcsokat használják', () => {
  const xml = generateXml(fullConfig({ hideMostUsedApps: true, hideRecommendedFiles: true }));
  const files = extractFiles(xml);
  const du = [...files.entries()].find(([p]) => p.endsWith('DefaultUser.ps1'));
  const script = decodeFile(...du);
  assert.match(script, /Start_TrackProgs/);
  assert.match(script, /Start_TrackDocs/);
  assert.ok(!script.includes('ShowRecentList'), 'a hatástalan Win10-es kulcs maradt');
  assert.ok(!script.includes('ShowFrequentList'));
});

test('a cleanStartPins hatásos és kiírja a LayoutModification.xml-t', () => {
  const xml = generateXml(fullConfig({ cleanStartPins: true }));
  const files = extractFiles(xml);
  assert.ok([...files.keys()].some((p) => p.endsWith('LayoutModification.xml')), 'a layout fájl nem íródott ki');
  const specialize = [...files.entries()].find(([p]) => p.endsWith('Specialize.ps1'));
  assert.match(decodeFile(...specialize), /ConfigureStartPins/);
});

// --- Wi-Fi ------------------------------------------------------------------

test('a & jeles SSID nem escape-elődik duplán a netsh parancsban', () => {
  const xml = generateXml(
    fullConfig({ wifi: { mode: 'auto', ssid: 'Otthon & Co', password: 'pw', security: 'wpa2psk' } })
  );
  const files = extractFiles(xml);
  const specialize = [...files.entries()].find(([p]) => p.endsWith('Specialize.ps1'));
  const script = decodeFile(...specialize);
  assert.match(script, /\$wifiSsid = 'Otthon & Co';/);
  assert.ok(!script.includes('&amp;'), 'XML escape szivárgott a PowerShell szkriptbe');
});

test('nyílt Wi-Fi hálózatnál nincs sharedKey', () => {
  const xml = generateXml(fullConfig({ wifi: { mode: 'auto', ssid: 'FreeWifi', password: '', security: 'open' } }));
  const files = extractFiles(xml);
  const wifiXml = [...files.entries()].find(([p]) => p.endsWith('Wifi.xml'));
  const profile = decodeFile(...wifiXml);
  assert.match(profile, /<authentication>open<\/authentication>/);
  assert.ok(!profile.includes('sharedKey'));
});

test('WPA3 támogatás', () => {
  const xml = generateXml(fullConfig({ wifi: { mode: 'auto', ssid: 'Uj', password: 'pw', security: 'wpa3sae' } }));
  const files = extractFiles(xml);
  const wifiXml = [...files.entries()].find(([p]) => p.endsWith('Wifi.xml'));
  assert.match(decodeFile(...wifiXml), /<authentication>WPA3SAE<\/authentication>/);
});

// --- Winget override -------------------------------------------------------

test('az Epic override sablon behelyettesíti az útvonalat', () => {
  const list = buildWingetCustomList({
    customScripts: { wingetCustomApps: [{ id: 'EpicGames.EpicGamesLauncher', location: 'E:\\Games\\Epic' }] },
  });
  assert.match(list, /Override='\/q INSTALLDIR=E:\\Games\\Epic'/);
  assert.match(list, /EnsureDir='E:\\Games\\Epic'/);
  // Az Override és a Location kizárja egymást.
  assert.ok(!list.includes('Location='), 'Override mellett nem mehet Location');
});

test('override nélküli app a --location-t használja', () => {
  const list = buildWingetCustomList({
    customScripts: { wingetCustomApps: [{ id: 'Valve.Steam', location: 'D:\\Games\\Steam' }] },
  });
  assert.match(list, /Location='D:\\Games\\Steam'/);
  assert.ok(!list.includes('Override='));
});

test('nincs duplikált Override kulcs a hashtable-ben', () => {
  const list = buildWingetCustomList({
    customScripts: {
      wingetCustomApps: [
        { id: 'EpicGames.EpicGamesLauncher', location: 'D:\\Apps\\EpicGames' },
        { id: 'VeyonSolutions.Veyon', location: '' },
      ],
    },
  });
  for (const line of list.split('\n')) {
    const overrides = (line.match(/Override=/g) || []).length;
    assert.ok(overrides <= 1, `duplikált Override kulcs: ${line}`);
  }
});

test('a user által megadott útvonal escape-elve kerül a PowerShellbe', () => {
  const list = buildWingetCustomList({
    customScripts: { wingetCustomApps: [{ id: 'Valve.Steam', location: "D:\\It's\\Steam" }] },
  });
  assert.match(list, /Location='D:\\It''s\\Steam'/);
});

// --- Segédfüggvények -------------------------------------------------------

test('escapeXml', () => {
  assert.equal(escapeXml('a & b < c > d " e \' f'), 'a &amp; b &lt; c &gt; d &quot; e &apos; f');
  assert.equal(escapeXml(null), '');
  // Tiltott vezérlőkarakterek kiszűrése, tab/newline megmarad.
  assert.equal(escapeXml('a\u0001b\tc\nd'), 'ab\tc\nd');
});

test('psQuote', () => {
  assert.equal(psQuote("it's"), "'it''s'");
  assert.equal(psQuote(null), "''");
});

test('a titok-figyelmeztetés csak akkor jelenik meg, ha van titok', () => {
  assert.ok(!generateXml(getDefaultConfig()).includes('FIGYELEM'));
  assert.match(generateXml(fullConfig({ password: 'x' })), /FIGYELEM/);
});
