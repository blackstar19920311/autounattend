import { SCRIPTS } from './customScripts.js';
import { WINGET_APPS } from '../data/wingetAppsList.js';
import { SCHNEEGANS_SCRIPTS } from '../data/schneegansScripts.js';
import { encodeUtf8Base64, encodeUtf16LeBase64 } from './base64.js';

/**
 * Windows 11 autounattend.xml generátor – hibrid Schneegans módszer.
 *
 * Fontos alapelvek:
 *  - Minden szkript a `<Extensions>` blokkba kerül base64-ként, és az
 *    ExtractScript csomagolja ki (lásd schneegansScripts.js).
 *  - A szkripteket KÖZVETLENÜL indítjuk (`-NoProfile -ExecutionPolicy Bypass -File`),
 *    így nincs szükség a régi, System32-be írt globális `profile.ps1`-re.
 *  - A registry írásokhoz PowerShell cmdleteket használunk, nem `reg.exe` +
 *    idézőjel-zsonglőrködést: az utóbbi bármilyen szóközös vagy idézőjeles
 *    értéknél (pl. a Start pinek JSON-ja) elhasal.
 *  - Az elemek sorrendje az unattend sémát követi (a WSIM/Microsoft példák szerint).
 */

// --- Állandók ---------------------------------------------------------------

/** Futásidőben kell, a FirstLogon végén törlődik. */
const SCRIPTS_DIR = 'C:\\Windows\\Setup\\Scripts';
/** TARTÓSAN megmarad – az ütemezett feladatok innen futnak. */
const FILES_DIR = 'C:\\Windows\\Setup\\Files';
const LOG_DIR = 'C:\\Windows\\Temp';
const DISKPART_FILE = 'X:\\diskpart.txt';
const EVENT_SOURCE = 'UnattendGenerator';
const DEFAULT_USER_HIVE = 'C:\\Users\\Default\\NTUSER.DAT';
/** A betöltött Default User hive PowerShell-provider útvonala. */
const DEFAULT_USER_ROOT = 'Registry::HKEY_USERS\\DefaultUser';
const LAYOUT_MODIFICATION_PATH =
  'C:\\Users\\Default\\AppData\\Local\\Microsoft\\Windows\\Shell\\LayoutModification.xml';

/** Az auto/autocd elrendezésben a Windows mindig a 3. partíció (EFI, MSR, Windows). */
const AUTO_WINDOWS_PARTITION_ID = 3;
const MSR_SIZE_MB = 16;
const DEFAULT_EFI_SIZE_MB = 300;
const DEFAULT_WINDOWS_SIZE_MB = 153600;
const DEFAULT_RECOVERY_SIZE_MB = 1024;
const RECOVERY_TYPE_GUID = 'de94bba4-06d1-4d40-a16a-bfd50179d6ac';

const PS_RUN = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File';

/** Közös PowerShell segédfüggvények, amiket a generált szkriptek használnak. */
const PS_HELPERS = `function Write-SetupLog {
  param([string]$Message)
  "$(Get-Date -Format o) $Message" | Out-File -FilePath $script:LogFile -Append -Encoding utf8
}

function Set-RegistryValue {
  param(
    [Parameter(Mandatory)][string]$Path,
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Type,
    [Parameter(Mandatory)]$Value
  )
  try {
    if (-not (Test-Path -LiteralPath $Path)) {
      New-Item -Path $Path -Force -ErrorAction Stop | Out-Null
    }
    New-ItemProperty -LiteralPath $Path -Name $Name -PropertyType $Type -Value $Value -Force -ErrorAction Stop | Out-Null
  } catch {
    Write-SetupLog "Registry write failed ($Path\\$Name): $($_.Exception.Message)"
  }
}`;

// --- Segédfüggvények --------------------------------------------------------

export function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    // XML 1.0-ban tiltott vezérlőkarakterek kiszűrése (tab/CR/LF megmarad)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Biztonságos PowerShell single-quoted literál. */
export function psQuote(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

const LOCALES = {
  hu: {
    locale: 'hu-HU',
    keyboard: '040e:0000040e',
    fallback: 'en-US',
    timeZone: 'Central Europe Standard Time',
    officeLang: 'hu-hu',
  },
  en: {
    locale: 'en-US',
    keyboard: '0409:00000409',
    fallback: '',
    timeZone: 'UTC',
    officeLang: 'en-us',
  },
};

/**
 * EGYETLEN nyelvi forrás. Korábban a windowsPE a `config.installLanguage`-et,
 * a generateXml pedig a külön `uiLanguage` paramétert használta, az oobeSystem
 * meg fixen hu-HU-t – ezek széttarthattak.
 */
export function resolveLocale(config) {
  const lang = config.installLanguage === 'en' ? 'en' : 'hu';
  const base = LOCALES[lang];
  const inputLocale =
    lang === 'hu' && config.addEnglishKeyboard
      ? `${base.keyboard};${LOCALES.en.keyboard}`
      : base.keyboard;
  return {
    lang,
    locale: base.locale,
    fallback: base.fallback,
    officeLang: base.officeLang,
    inputLocale,
    timeZone: String(config.timeZone || base.timeZone),
  };
}

/**
 * A UI és a generátor kulcsnevei szétcsúsztak. Itt hozzuk össze őket, a régi
 * neveket is elfogadva, hogy a mentett konfigurációk ne törjenek el.
 */
export function normalizeConfig(raw) {
  const c = raw || {};
  const cs = c.customScripts || {};
  const legacyUser = c.localUser || {};

  const rawWinget = cs.wingetApps ?? cs.winget ?? 'none';
  const wingetMap = {
    versionA: 'presetA',
    versionB: 'presetB',
    presetA: 'presetA',
    presetB: 'presetB',
    custom: 'custom',
  };

  const username = String(c.username ?? legacyUser.username ?? '').trim();

  return {
    ...c,
    account: {
      username: username || 'Rendszergazda',
      // A jelszót NEM trimmeljük – a szóköz is érvényes karakter benne.
      password: String(c.password ?? legacyUser.password ?? ''),
      autoLogon: !!(c.autoLogin ?? c.autoLogon),
    },
    wingetMode: wingetMap[rawWinget] || 'none',
  };
}

/** Microsoft docs sorrend: Description, Order, Path. */
function runSync(order, path, description) {
  const out = ['        <RunSynchronousCommand wcm:action="add">'];
  if (description) {
    out.push(`          <Description>${escapeXml(description)}</Description>`);
  }
  out.push(`          <Order>${order}</Order>`);
  out.push(`          <Path>${escapeXml(path)}</Path>`);
  out.push('        </RunSynchronousCommand>');
  return out;
}

/** Microsoft docs sorrend: CommandLine, Description, Order, RequiresUserInput. */
function syncCommand(order, commandLine, description) {
  const out = ['        <SynchronousCommand wcm:action="add">'];
  out.push(`          <CommandLine>${escapeXml(commandLine)}</CommandLine>`);
  if (description) {
    out.push(`          <Description>${escapeXml(description)}</Description>`);
  }
  out.push(`          <Order>${order}</Order>`);
  out.push('          <RequiresUserInput>false</RequiresUserInput>');
  out.push('        </SynchronousCommand>');
  return out;
}

/** `Start-Process`-alapú szkriptindítás, ami megvárja a végét. */
function psInvokeScript(path) {
  return `Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',${psQuote(
    path
  )}) -Wait -WindowStyle Hidden | Out-Null;`;
}

/**
 * DISKPART szkript kiírása WinPE-ben.
 *
 * WinPE-ben (a gyári telepítőlemezen) NINCS PowerShell, ezért `echo`-val kell
 * fájlba írni. Korábban ez soronként egy-egy RunSynchronousCommand volt (~15 db);
 * most egyetlen zárójelezett cmd blokk, így sokkal átláthatóbb és tesztelhető.
 */
export function buildDiskpartCommands(scriptLines, description, startOrder) {
  const lines = scriptLines.map((l) => String(l).trim()).filter((l) => l.length > 0);
  const esc = (l) => l.replace(/[&|<>^]/g, '^$&');
  const cmds = [];
  let order = startOrder;

  // Zárójel a tartalomban felrúgná a cmd blokkot – ilyenkor soronkénti fallback.
  const risky = lines.some((l) => /[()]/.test(l));
  if (!risky && lines.length > 0) {
    const joined = lines.map((l) => `echo ${esc(l)}`).join('&');
    cmds.push(
      ...runSync(order++, `cmd /c (${joined})>${DISKPART_FILE}`, `${description}: DISKPART szkript kiírása`)
    );
  } else {
    lines.forEach((l, i) => {
      cmds.push(
        ...runSync(
          order++,
          `cmd /c ${i === 0 ? '>' : '>>'}${DISKPART_FILE} echo ${esc(l)}`,
          i === 0 ? `${description}: DISKPART szkript kiírása` : null
        )
      );
    });
  }
  cmds.push(...runSync(order++, `diskpart /s ${DISKPART_FILE}`, `${description}: DISKPART futtatása`));
  return { cmds, order };
}

function partitionSizes(part) {
  const toInt = (v, fallback) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    efi: toInt(part.efiSizeMb, DEFAULT_EFI_SIZE_MB),
    windows: toInt(part.windowsSizeMb, DEFAULT_WINDOWS_SIZE_MB),
    recovery: toInt(part.recoverySizeMb, DEFAULT_RECOVERY_SIZE_MB),
  };
}

// --- windowsPE pass ---------------------------------------------------------

function buildWindowsPE(config, componentAttrs, locale) {
  const out = [];
  out.push('  <!-- windowsPE: nyelvi és telepítési beállítások -->');
  out.push('  <settings pass="windowsPE">');

  // A komponensek ABC sorrendben jönnek (a WSIM is így generálja).
  out.push(`    <component ${componentAttrs('Microsoft-Windows-International-Core-WinPE')}>`);
  out.push('      <SetupUILanguage>');
  out.push(`        <UILanguage>${locale.locale}</UILanguage>`);
  out.push('      </SetupUILanguage>');
  out.push(`      <InputLocale>${locale.inputLocale}</InputLocale>`);
  out.push(`      <SystemLocale>${locale.locale}</SystemLocale>`);
  out.push(`      <UILanguage>${locale.locale}</UILanguage>`);
  if (locale.fallback) {
    out.push(`      <UILanguageFallback>${locale.fallback}</UILanguageFallback>`);
  }
  out.push(`      <UserLocale>${locale.locale}</UserLocale>`);
  out.push('    </component>');
  out.push('');

  // --- Microsoft-Windows-Setup ---
  // A gyerekelemek sorrendje: DiskConfiguration, ImageInstall, RunSynchronous, UserData.
  const diskConfiguration = [];
  const imageInstall = [];
  let runSyncCmds = [];
  let order = 1;

  // Hardverkövetelmények megkerülése – ennek MÉG a windowsPE fázisban kell futnia.
  if (config.bypassHardware) {
    const bypassChecks = [
      'BypassTPMCheck',
      'BypassSecureBootCheck',
      'BypassRAMCheck',
      'BypassStorageCheck',
      'BypassCPUCheck',
    ];
    bypassChecks.forEach((key, i) => {
      runSyncCmds.push(
        ...runSync(
          order++,
          `reg add HKLM\\SYSTEM\\Setup\\LabConfig /v ${key} /t REG_DWORD /d 1 /f`,
          i === 0 ? 'Hardverkövetelmények megkerülése' : null
        )
      );
    });
  }

  const part = config.partitioning || {};
  const partEnabled = part.enabled && part.mode && part.mode !== 'manual';

  if (partEnabled) {
    const diskId = Math.max(0, parseInt(part.diskNumber, 10) || 0);
    const sizes = partitionSizes(part);
    const cleanCmd = part.fullWipe ? 'CLEAN ALL' : 'CLEAN';

    const emitInstallTo = (partitionId) => {
      imageInstall.push('      <ImageInstall>');
      imageInstall.push('        <OSImage>');
      imageInstall.push('          <InstallTo>');
      imageInstall.push(`            <DiskID>${diskId}</DiskID>`);
      imageInstall.push(`            <PartitionID>${partitionId}</PartitionID>`);
      imageInstall.push('          </InstallTo>');
      imageInstall.push('        </OSImage>');
      imageInstall.push('      </ImageInstall>');
    };

    if (part.mode === 'auto' && part.fullWipe) {
      // A CLEAN ALL (teljes nullázás) nem fejezhető ki DiskConfiguration-nal,
      // ezért itt DISKPART kell. A rá következő QUICK formázás szándékos: a
      // lemez már nullázott, a lassú formázásnak nincs értelme.
      const script = [
        `SELECT DISK=${diskId}`,
        cleanCmd,
        'CONVERT GPT',
        `CREATE PARTITION EFI SIZE=${sizes.efi}`,
        'FORMAT QUICK FS=FAT32 LABEL="System"',
        `CREATE PARTITION MSR SIZE=${MSR_SIZE_MB}`,
        'CREATE PARTITION PRIMARY',
        'FORMAT QUICK FS=NTFS LABEL="Windows"',
      ];
      const built = buildDiskpartCommands(script, 'Csak C: (teljes törlés)', order);
      runSyncCmds = runSyncCmds.concat(built.cmds);
      order = built.order;
      emitInstallTo(AUTO_WINDOWS_PARTITION_ID);
    } else if (part.mode === 'auto') {
      // Natív, séma szerinti particionálás – nem kell DISKPART hack.
      diskConfiguration.push('      <DiskConfiguration>');
      diskConfiguration.push('        <WillShowUI>OnError</WillShowUI>');
      diskConfiguration.push('        <Disk wcm:action="add">');
      diskConfiguration.push(`          <DiskID>${diskId}</DiskID>`);
      diskConfiguration.push('          <WillWipeDisk>true</WillWipeDisk>');
      diskConfiguration.push('          <CreatePartitions>');
      diskConfiguration.push('            <CreatePartition wcm:action="add">');
      diskConfiguration.push('              <Order>1</Order>');
      diskConfiguration.push(`              <Size>${sizes.efi}</Size>`);
      diskConfiguration.push('              <Type>EFI</Type>');
      diskConfiguration.push('            </CreatePartition>');
      diskConfiguration.push('            <CreatePartition wcm:action="add">');
      diskConfiguration.push('              <Order>2</Order>');
      diskConfiguration.push(`              <Size>${MSR_SIZE_MB}</Size>`);
      diskConfiguration.push('              <Type>MSR</Type>');
      diskConfiguration.push('            </CreatePartition>');
      diskConfiguration.push('            <CreatePartition wcm:action="add">');
      diskConfiguration.push('              <Extend>true</Extend>');
      diskConfiguration.push('              <Order>3</Order>');
      diskConfiguration.push('              <Type>Primary</Type>');
      diskConfiguration.push('            </CreatePartition>');
      diskConfiguration.push('          </CreatePartitions>');
      diskConfiguration.push('          <ModifyPartitions>');
      diskConfiguration.push('            <ModifyPartition wcm:action="add">');
      diskConfiguration.push('              <Format>FAT32</Format>');
      diskConfiguration.push('              <Label>System</Label>');
      diskConfiguration.push('              <Order>1</Order>');
      diskConfiguration.push('              <PartitionID>1</PartitionID>');
      diskConfiguration.push('            </ModifyPartition>');
      diskConfiguration.push('            <ModifyPartition wcm:action="add">');
      diskConfiguration.push('              <Order>2</Order>');
      diskConfiguration.push('              <PartitionID>2</PartitionID>');
      diskConfiguration.push('            </ModifyPartition>');
      diskConfiguration.push('            <ModifyPartition wcm:action="add">');
      diskConfiguration.push('              <Format>NTFS</Format>');
      diskConfiguration.push('              <Label>Windows</Label>');
      diskConfiguration.push('              <Letter>C</Letter>');
      diskConfiguration.push('              <Order>3</Order>');
      diskConfiguration.push('              <PartitionID>3</PartitionID>');
      diskConfiguration.push('            </ModifyPartition>');
      diskConfiguration.push('          </ModifyPartitions>');
      diskConfiguration.push('        </Disk>');
      diskConfiguration.push('      </DiskConfiguration>');
      emitInstallTo(AUTO_WINDOWS_PARTITION_ID);
    } else if (part.mode === 'autocd') {
      // JAVÍTVA: a SHRINK csak MÁR MEGFORMÁZOTT NTFS köteten működik, ezért a
      // sorrend CREATE -> FORMAT -> SHRINK. Korábban CREATE -> SHRINK -> FORMAT
      // volt, ami garantáltan elhasalt, és vele a Recovery partíció is.
      // Az ASSIGN LETTER sor is visszakerült (a D: enélkül nem kapott betűt).
      const script = [
        `SELECT DISK=${diskId}`,
        cleanCmd,
        'CONVERT GPT',
        `CREATE PARTITION EFI SIZE=${sizes.efi}`,
        'FORMAT QUICK FS=FAT32 LABEL="System"',
        `CREATE PARTITION MSR SIZE=${MSR_SIZE_MB}`,
        `CREATE PARTITION PRIMARY SIZE=${sizes.windows}`,
        'FORMAT QUICK FS=NTFS LABEL="Windows"',
        'CREATE PARTITION PRIMARY',
        'FORMAT QUICK FS=NTFS LABEL="Adatok"',
        'ASSIGN LETTER=D',
        `SHRINK MINIMUM=${sizes.recovery}`,
        'CREATE PARTITION PRIMARY',
        'FORMAT QUICK FS=NTFS LABEL="Recovery"',
        `SET ID="${RECOVERY_TYPE_GUID}"`,
        'GPT ATTRIBUTES=0x8000000000000001',
      ];
      const built = buildDiskpartCommands(script, 'C: és D:', order);
      runSyncCmds = runSyncCmds.concat(built.cmds);
      order = built.order;
      emitInstallTo(AUTO_WINDOWS_PARTITION_ID);
    } else if (part.mode === 'custom') {
      const raw = String(part.customDiskpartScript || '').trim();
      if (raw) {
        const built = buildDiskpartCommands(raw.split('\n'), 'Egyéni elrendezés', order);
        runSyncCmds = runSyncCmds.concat(built.cmds);
        order = built.order;
      }
      const installPartition = Math.max(
        1,
        parseInt(part.installPartitionId, 10) || AUTO_WINDOWS_PARTITION_ID
      );
      emitInstallTo(installPartition);
    }
  }

  const productKey = String(config.productKey || '').trim();
  const userData = ['      <UserData>'];
  // JAVÍTVA: nincs többé beégetett generic Pro kulcs. Ha a felhasználó nem ad
  // kulcsot, a ProductKey elem KIMARAD, így a telepítő nem kényszeríti Pro-ra
  // (Home/Education image-nél a beégetett kulcs elhasalt vagy rossz kiadást adott).
  if (productKey) {
    userData.push('        <ProductKey>');
    userData.push(`          <Key>${escapeXml(productKey)}</Key>`);
    userData.push('        </ProductKey>');
  }
  userData.push(`        <AcceptEula>${config.autoAcceptEula ? 'true' : 'false'}</AcceptEula>`);
  userData.push('      </UserData>');

  out.push(`    <component ${componentAttrs('Microsoft-Windows-Setup')}>`);
  if (diskConfiguration.length) out.push(...diskConfiguration);
  if (imageInstall.length) out.push(...imageInstall);
  if (runSyncCmds.length) {
    out.push('      <RunSynchronous>');
    out.push(...runSyncCmds);
    out.push('      </RunSynchronous>');
  }
  out.push(...userData);
  out.push('    </component>');
  out.push('  </settings>');
  return out.join('\n');
}

// --- specialize pass --------------------------------------------------------

function buildSpecializeScript(config, addFile) {
  const s = [];

  // Ezek best-effort tweak-ek: egyetlen elszálló registry írás NE bukjon
  // a teljes telepítéssel. Minden lépés naplózva van.
  s.push("$ErrorActionPreference = 'Continue';");
  s.push(`$script:LogFile = ${psQuote(`${LOG_DIR}\\Specialize.log`)};`);
  s.push(PS_HELPERS);
  s.push('');
  s.push("Write-SetupLog 'Specialize start.';");

  const hklm = (subKey) => `HKLM:\\${subKey}`;
  const reg = (subKey, name, type, value) =>
    `Set-RegistryValue -Path ${psQuote(hklm(subKey))} -Name ${psQuote(name)} -Type ${type} -Value ${value};`;

  const prefix = String(config.computerName || 'PC').trim();
  if (config.randomSuffix) {
    s.push('try {');
    s.push('  $letters = -join (1..2 | ForEach-Object { [char](Get-Random -Minimum 65 -Maximum 91) });');
    s.push("  $digits = '{0:D2}' -f (Get-Random -Minimum 0 -Maximum 100);");
    s.push(`  $safePrefix = ${psQuote(prefix.replace(/\r?\n|\r/g, ''))};`);
    s.push("  $newName = $safePrefix + '-' + $letters + $digits;");
    s.push(
      "  Set-ItemProperty -LiteralPath 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ComputerName' -Name 'ComputerName' -Value $newName -Force;"
    );
    s.push(
      "  Set-ItemProperty -LiteralPath 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ActiveComputerName' -Name 'ComputerName' -Value $newName -Force;"
    );
    s.push(
      "  Set-ItemProperty -LiteralPath 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters' -Name 'Hostname' -Value $newName -Force;"
    );
    s.push(
      "  Set-ItemProperty -LiteralPath 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters' -Name 'NV Hostname' -Value $newName -Force;"
    );
    s.push('  Write-SetupLog "Computer name set to $newName.";');
    s.push('} catch { Write-SetupLog "Computer rename failed: $($_.Exception.Message)"; }');
  }

  // JAVÍTVA: korábban a jelszó-lejárat tiltása feltétel nélkül kimeitt, a
  // `disablePasswordExpiration` kapcsolót figyelmen kívül hagyva.
  if (config.disablePasswordExpiration) {
    s.push('net.exe accounts /maxpwage:UNLIMITED | Out-Null;');
  }

  // Event source regisztrálása – enélkül az UnlockStartLayout trigger sosem sült el.
  s.push('try {');
  s.push(`  if (-not [System.Diagnostics.EventLog]::SourceExists(${psQuote(EVENT_SOURCE)})) {`);
  s.push(`    New-EventLog -LogName 'Application' -Source ${psQuote(EVENT_SOURCE)};`);
  s.push('  }');
  s.push('} catch { Write-SetupLog "Event source registration failed: $($_.Exception.Message)"; }');

  if (config.preventDeviceEncryption) {
    s.push(reg('SYSTEM\\CurrentControlSet\\Control\\BitLocker', 'PreventDeviceEncryption', 'DWord', '1'));
  }
  if (config.enableLongPaths) {
    s.push(reg('SYSTEM\\CurrentControlSet\\Control\\FileSystem', 'LongPathsEnabled', 'DWord', '1'));
  }
  if (config.disableUAC) {
    s.push(
      "Write-SetupLog 'WARNING: disabling UAC (EnableLUA=0) breaks Store/UWP apps and the Settings app on Windows 11.';"
    );
    s.push(reg('SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System', 'EnableLUA', 'DWord', '0'));
  }
  if (config.disableSleep) {
    s.push('$out = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61;');
    s.push(
      "if ($out -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { powercfg -setactive $matches[1]; }"
    );
    s.push('powercfg /change standby-timeout-ac 0;');
    s.push('powercfg /change standby-timeout-dc 0;');
    s.push('powercfg /change monitor-timeout-ac 0;');
    s.push('powercfg /change monitor-timeout-dc 0;');
  }
  if (config.bypassNetwork) {
    // A BypassNRO-t a Microsoft kivezette a friss buildekből, ezért csak
    // örökölt kompatibilitásként megy ki. A tényleges, támogatott megoldás a
    // helyi fiók unattendből + HideOnlineAccountScreens (lásd oobeSystem).
    s.push(reg('SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\OOBE', 'BypassNRO', 'DWord', '1'));
  }
  if (config.disableTelemetry) {
    s.push(reg('SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry', 'DWord', '0'));
    s.push(
      reg('SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection', 'AllowTelemetry', 'DWord', '0')
    );
  }
  if (config.disableFastStartup) {
    s.push(reg('SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled', 'DWord', '0'));
  }
  if (config.disableNewsAndInterests) {
    s.push(reg('SOFTWARE\\Policies\\Microsoft\\Dsh', 'AllowNewsAndInterests', 'DWord', '0'));
  }
  if (config.disableEdgeDesktopShortcut) {
    s.push(
      reg(
        'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer',
        'DisableEdgeDesktopShortcutCreation',
        'DWord',
        '1'
      )
    );
  }
  if (config.disableConsumerFeatures) {
    s.push(
      reg('SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent', 'DisableWindowsConsumerFeatures', 'DWord', '1')
    );
  }
  if (config.disableBackgroundApps) {
    s.push(reg('SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy', 'LetAppsRunInBackground', 'DWord', '2'));
  }
  if (config.disableEdgeFirstRun) {
    s.push(reg('SOFTWARE\\Policies\\Microsoft\\Edge', 'HideFirstRunExperience', 'DWord', '1'));
  }
  // JAVÍTVA: a "nemrég hozzáadott appok" és a "javasolt" szekció gépszintű
  // házirend, nem HKCU kulcs.
  if (config.hideRecentApps) {
    s.push(reg('SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'HideRecentlyAddedApps', 'DWord', '1'));
  }
  if (config.hideRecommendedFiles) {
    s.push(reg('SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'HideRecommendedSection', 'DWord', '1'));
  }

  // --- Bloatware ---
  const bloatwarePackages = {
    todo: ['Microsoft.Todos'],
    experiencesApp: ['MicrosoftWindows.CrossDevice'],
    stickyNotes: ['Microsoft.MicrosoftStickyNotes'],
    quickAssist: ['MicrosoftCorporationII.QuickAssist'],
    weather: ['Microsoft.BingWeather'],
    camera: ['Microsoft.WindowsCamera'],
    // JAVÍTVA: a Microsoft.BingSearch KIVÉVE innen – az eltávolítása kilövi a
    // Start menü keresést 24H2-n. Csak a hírek app megy.
    bingNews: ['Microsoft.BingNews'],
    clipchamp: ['Clipchamp.Clipchamp'],
    clock: ['Microsoft.WindowsAlarms'],
    outlook: ['Microsoft.OutlookForWindows'],
    powerAutomate: ['Microsoft.PowerAutomateDesktop'],
    solitaire: ['Microsoft.MicrosoftSolitaireCollection'],
    terminal: ['Microsoft.WindowsTerminal'],
    feedbackHub: ['Microsoft.WindowsFeedbackHub'],
  };

  const selectors = [];
  if (config.bloatware) {
    for (const [key, packages] of Object.entries(bloatwarePackages)) {
      if (config.bloatware[key]) selectors.push(...packages);
    }
  }
  if (selectors.length > 0) {
    // A rendes, naplózó, PONTOS egyezésű Schneegans szkript – korábban ez halott
    // kód volt, helyette egy néma SilentlyContinue wildcard-os verzió futott.
    const path = `${SCRIPTS_DIR}\\RemovePackages.ps1`;
    addFile(
      path,
      SCHNEEGANS_SCRIPTS.removePackages.replace(
        '##SELECTORS##',
        selectors.map((sel) => `  ${psQuote(sel)};`).join('\n')
      )
    );
    s.push(psInvokeScript(path));
    s.push("Write-SetupLog 'RemovePackages done.';");
  }

  if (config.removeLegacyCapabilities) {
    const path = `${SCRIPTS_DIR}\\RemoveCapabilities.ps1`;
    addFile(
      path,
      SCHNEEGANS_SCRIPTS.removeCapabilities.replace(
        '##SELECTORS##',
        SCHNEEGANS_SCRIPTS.legacyCapabilities.map((sel) => `  ${psQuote(sel)};`).join('\n')
      )
    );
    s.push(psInvokeScript(path));
    s.push("Write-SetupLog 'RemoveCapabilities done.';");
  }

  // --- Wi-Fi ---
  const wifi = config.wifi || {};
  if (wifi.mode === 'auto' && String(wifi.ssid || '').trim()) {
    const ssid = String(wifi.ssid).trim();
    const password = String(wifi.password || '');
    const security = wifi.security || 'wpa2psk';
    const hexSsid = Array.from(new TextEncoder().encode(ssid))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');

    let securityBlock;
    if (security === 'open') {
      securityBlock = [
        '\t\t\t<authEncryption>',
        '\t\t\t\t<authentication>open</authentication>',
        '\t\t\t\t<encryption>none</encryption>',
        '\t\t\t\t<useOneX>false</useOneX>',
        '\t\t\t</authEncryption>',
      ].join('\n');
    } else {
      const auth = security === 'wpa3sae' ? 'WPA3SAE' : 'WPA2PSK';
      securityBlock = [
        '\t\t\t<authEncryption>',
        `\t\t\t\t<authentication>${auth}</authentication>`,
        '\t\t\t\t<encryption>AES</encryption>',
        '\t\t\t\t<useOneX>false</useOneX>',
        '\t\t\t</authEncryption>',
        '\t\t\t<sharedKey>',
        '\t\t\t\t<keyType>passPhrase</keyType>',
        '\t\t\t\t<protected>false</protected>',
        `\t\t\t\t<keyMaterial>${escapeXml(password)}</keyMaterial>`,
        '\t\t\t</sharedKey>',
      ].join('\n');
    }

    const wifiXml = `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
	<name>${escapeXml(ssid)}</name>
	<SSIDConfig>
		<SSID>
			<hex>${hexSsid}</hex>
			<name>${escapeXml(ssid)}</name>
		</SSID>
	</SSIDConfig>
	<connectionType>ESS</connectionType>
	<connectionMode>auto</connectionMode>
	<MSM>
		<security>
${securityBlock}
		</security>
	</MSM>
</WLANProfile>`;
    const wifiPath = `${FILES_DIR}\\Wifi.xml`;
    addFile(wifiPath, wifiXml);
    // JAVÍTVA: az SSID-t PowerShell változóba tesszük (single-quote escape),
    // nem az XML-escape-elt sztringet toljuk a netsh-be. Korábban egy `&`-et
    // tartalmazó SSID-nél literál "&amp;" ment ki.
    s.push(`$wifiSsid = ${psQuote(ssid)};`);
    s.push(`$wifiProfile = ${psQuote(wifiPath)};`);
    s.push('netsh.exe wlan add profile filename="$wifiProfile" user=all | Out-Null;');
    s.push('Start-Sleep -Seconds 2;');
    s.push('netsh.exe wlan connect name="$wifiSsid" | Out-Null;');
  }

  // --- Start menü / tálca ---
  const registerTask = (name, xmlPath) =>
    `try { Register-ScheduledTask -TaskName ${psQuote(name)} -Xml (Get-Content -Raw -LiteralPath ${psQuote(
      xmlPath
    )}) -Force | Out-Null; } catch { Write-SetupLog "Task ${name} registration failed: $($_.Exception.Message)"; }`;

  if (config.cleanStartPins) {
    // A JSON értéket PowerShell cmdlettel írjuk: a `reg.exe /d "{\"...\"}"`
    // forma a PowerShell parseren nem jut át épségben.
    s.push(
      `Set-RegistryValue -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer' -Name 'ConfigureStartPins' -Type String -Value ${psQuote(
        '{"pinnedList":[]}'
      )};`
    );
    // A korábban halott taskbarLayoutModificationXml végre használatban.
    addFile(LAYOUT_MODIFICATION_PATH, SCHNEEGANS_SCRIPTS.taskbarLayoutModificationXml);
  }

  if (config.hideTaskbarIcons) {
    s.push(reg('SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer', 'NoPinningStoreToTaskbar', 'DWord', '1'));
    // A VBS és a task XML a TARTÓS mappába kerül, mert a FirstLogon a végén
    // kitörli a Scripts mappát – korábban ezzel a saját lábát vágta le.
    const vbsPath = `${FILES_DIR}\\UnlockStartLayout.vbs`;
    const xmlPath = `${FILES_DIR}\\UnlockStartLayout.xml`;
    addFile(vbsPath, SCHNEEGANS_SCRIPTS.unlockStartLayoutVbs);
    addFile(xmlPath, SCHNEEGANS_SCRIPTS.unlockStartLayoutXml.replace('##VBS_PATH##', vbsPath));
    s.push(registerTask('UnlockStartLayout', xmlPath));
  }

  if (config.showAllTrayIcons) {
    const vbsPath = `${FILES_DIR}\\ShowAllTrayIcons.vbs`;
    const xmlPath = `${FILES_DIR}\\ShowAllTrayIcons.xml`;
    addFile(vbsPath, SCHNEEGANS_SCRIPTS.showAllTrayIconsVbs);
    addFile(xmlPath, SCHNEEGANS_SCRIPTS.showAllTrayIconsXml.replace('##VBS_PATH##', vbsPath));
    s.push(registerTask('ShowAllTrayIcons', xmlPath));
  }

  s.push("Write-SetupLog 'Specialize done.';");
  s.push('exit 0;');
  return s.join('\n') + '\n';
}

function buildDefaultUserScript(config) {
  const body = [];
  const reg = (subKey, name, type, value) =>
    `  Set-RegistryValue -Path ${psQuote(`${DEFAULT_USER_ROOT}\\${subKey}`)} -Name ${psQuote(
      name
    )} -Type ${type} -Value ${value};`;

  if (config.disableCopilot) {
    body.push(reg('Software\\Policies\\Microsoft\\Windows\\WindowsCopilot', 'TurnOffWindowsCopilot', 'DWord', '1'));
  }
  if (config.disableWebSearch) {
    body.push(reg('Software\\Policies\\Microsoft\\Windows\\Explorer', 'DisableSearchBoxSuggestions', 'DWord', '1'));
  }
  if (config.disableGameDVR) {
    body.push(reg('System\\GameConfigStore', 'GameDVR_Enabled', 'DWord', '0'));
  }
  if (config.disableMouseAcceleration) {
    // JAVÍTVA: a MouseSpeed egyedül nem kapcsolja ki a gyorsítást, a két
    // threshold érték is kell hozzá.
    body.push(reg('Control Panel\\Mouse', 'MouseSpeed', 'String', psQuote('0')));
    body.push(reg('Control Panel\\Mouse', 'MouseThreshold1', 'String', psQuote('0')));
    body.push(reg('Control Panel\\Mouse', 'MouseThreshold2', 'String', psQuote('0')));
  }
  if (config.explorerToThisPC) {
    body.push(reg('Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'LaunchTo', 'DWord', '1'));
  }
  if (config.showHiddenFiles) {
    body.push(reg('Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Hidden', 'DWord', '1'));
  }
  if (config.showFileExtensions) {
    body.push(reg('Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'HideFileExt', 'DWord', '0'));
  }
  // JAVÍTVA: Win11-en a Start_TrackProgs / Start_TrackDocs a helyes kulcs az
  // Explorer\Advanced alatt, nem a ShowRecentList / ShowFrequentList a Start alatt.
  if (config.hideMostUsedApps) {
    body.push(
      reg('Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Start_TrackProgs', 'DWord', '0')
    );
  }
  if (config.hideRecommendedFiles) {
    body.push(
      reg('Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', 'Start_TrackDocs', 'DWord', '0')
    );
  }
  if (config.searchBoxMode) {
    const searchModeValues = { full: 2, iconLabel: 3, iconOnly: 1, hidden: 0 };
    const value = searchModeValues[config.searchBoxMode];
    if (value !== undefined) {
      body.push(
        reg(
          'Software\\Microsoft\\Windows\\CurrentVersion\\Search',
          'SearchboxTaskbarMode',
          'DWord',
          String(value)
        )
      );
    }
  }
  if (config.disableTransparency) {
    body.push(
      reg('Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize', 'EnableTransparency', 'DWord', '0')
    );
  }
  if (config.hideTipsAndSuggestions) {
    for (const id of ['338388', '338389', '338393']) {
      body.push(
        reg(
          'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
          `SubscribedContent-${id}Enabled`,
          'DWord',
          '0'
        )
      );
    }
    body.push(reg('Software\\Policies\\Microsoft\\Windows\\CloudContent', 'DisableSoftLanding', 'DWord', '1'));
  }
  if (config.desktopIcons) {
    const iconMap = {
      computer: '{20D04FE0-3AEA-1069-A2D8-08002B30309D}',
      userFiles: '{59031a47-3f72-44a7-89c5-5595fe6b30ee}',
      network: '{F02C1A0D-BE21-4350-88B0-7367FC96EF3C}',
      recycleBin: '{645FF040-5081-101B-9F08-00AA002F954E}',
      controlPanel: '{5399E694-6CE5-4D6C-8FCE-1D8870FDCBA0}',
    };
    for (const [key, clsid] of Object.entries(iconMap)) {
      if (config.desktopIcons[key]) {
        // 0 = látszik. Mindkét panel kulcsát írjuk.
        body.push(
          reg(
            'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel',
            clsid,
            'DWord',
            '0'
          )
        );
        body.push(
          reg(
            'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\ClassicStartMenu',
            clsid,
            'DWord',
            '0'
          )
        );
      }
    }
  }

  if (body.length === 0) return null;

  // A hive be- és kicsatolása EGY szkriptben, try/finally-vel: így akkor sem
  // marad betöltve, ha közben elhasal valami. Korábban ez 3 külön
  // RunSynchronousCommand volt, hiba esetén bent maradó hive-val.
  const lines = [];
  lines.push("$ErrorActionPreference = 'Continue';");
  lines.push(`$script:LogFile = ${psQuote(`${LOG_DIR}\\DefaultUser.log`)};`);
  lines.push(PS_HELPERS);
  lines.push('');
  lines.push(`reg.exe load "HKU\\DefaultUser" ${psQuote(DEFAULT_USER_HIVE)} | Out-Null;`);
  lines.push('try {');
  lines.push(...body);
  lines.push('} finally {');
  lines.push('  [System.GC]::Collect();');
  lines.push('  [System.GC]::WaitForPendingFinalizers();');
  lines.push('  Start-Sleep -Milliseconds 500;');
  lines.push('  reg.exe unload "HKU\\DefaultUser" | Out-Null;');
  lines.push("  Write-SetupLog 'Default user hive unloaded.';");
  lines.push('}');
  lines.push('exit 0;');
  return lines.join('\n') + '\n';
}

function buildSpecialize(config, componentAttrs, addFile) {
  const out = [];
  out.push('  <!-- specialize: gépnév, fájlkicsomagolás, rendszerszintű beállítások -->');
  out.push('  <settings pass="specialize">');

  addFile(`${SCRIPTS_DIR}\\Specialize.ps1`, buildSpecializeScript(config, addFile));

  const defaultUserScript = buildDefaultUserScript(config);
  if (defaultUserScript) {
    addFile(`${SCRIPTS_DIR}\\DefaultUser.ps1`, defaultUserScript);
  }

  let order = 1;
  const cmds = [];

  // JAVÍTVA: a leíró szöveg dupla idézőjelben van, így a \W és \S nem esik ki
  // (korábban a kimeneti XML-ben "C:WindowsSetupScripts" szerepelt).
  cmds.push(
    ...runSync(
      order++,
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command \"$xml = [xml]::new(); $xml.Load('C:\\Windows\\Panther\\unattend.xml'); $sb = [scriptblock]::Create( $xml.unattend.Extensions.ExtractScript ); Invoke-Command -ScriptBlock $sb -ArgumentList $xml;\"",
      `Beágyazott fájlok kicsomagolása a ${SCRIPTS_DIR} és ${FILES_DIR} mappákba`
    )
  );
  cmds.push(...runSync(order++, `${PS_RUN} "${SCRIPTS_DIR}\\Specialize.ps1"`, 'Specialize szkript futtatása'));
  if (defaultUserScript) {
    cmds.push(
      ...runSync(order++, `${PS_RUN} "${SCRIPTS_DIR}\\DefaultUser.ps1"`, 'Default User profil beállítása')
    );
  }

  // A RunSynchronous a Microsoft-Windows-Deployment komponens eleme, NEM a
  // Shell-Setup-é. Korábban rossz komponensben volt.
  out.push(`    <component ${componentAttrs('Microsoft-Windows-Deployment')}>`);
  out.push('      <RunSynchronous>');
  out.push(...cmds);
  out.push('      </RunSynchronous>');
  out.push('    </component>');
  out.push('');

  out.push(`    <component ${componentAttrs('Microsoft-Windows-Shell-Setup')}>`);
  if (config.randomSuffix) {
    // A végleges nevet a Specialize.ps1 állítja be (prefix + véletlen utótag).
    out.push('      <ComputerName>TEMPNAME</ComputerName>');
  } else {
    out.push(
      `      <ComputerName>${escapeXml(String(config.computerName || 'PC').trim() || 'PC')}</ComputerName>`
    );
  }
  out.push('    </component>');
  out.push('  </settings>');
  return out.join('\n');
}

// --- oobeSystem pass --------------------------------------------------------

export function buildWingetCustomList(config) {
  const entries = ((config.customScripts && config.customScripts.wingetCustomApps) || [])
    .map((entry) => {
      const meta = WINGET_APPS.find((a) => a.id === entry.id);
      if (!meta) return null;

      const wanted = String(entry.location ?? '').trim();
      const location = meta.forceDefaultLocation ? '' : wanted;
      const parts = [`Id=${psQuote(meta.id)}`, `Source=${psQuote(meta.source || 'winget')}`];
      let ensureDir = '';

      // A winget FIGYELMEN KÍVÜL HAGYJA a --location-t, ha --override is van,
      // ezért a kettő kizárja egymást. Korábban a generátor mindkét Override
      // kulcsot egymás után hozzáfűzte, ami duplikált hashtable kulcsot
      // (parse error) okozott, és az Epic sablon érték nélkül maradt.
      if (location && meta.overrideTemplate) {
        parts.push(`Override=${psQuote(meta.overrideTemplate.replace('{location}', location))}`);
        ensureDir = location;
      } else if (location) {
        parts.push(`Location=${psQuote(location)}`);
        ensureDir = location;
      } else if (meta.override) {
        parts.push(`Override=${psQuote(meta.override)}`);
      }
      if (ensureDir) parts.push(`EnsureDir=${psQuote(ensureDir)}`);
      return `  @{${parts.join(';')}}`;
    })
    .filter(Boolean);
  return entries.join(',\n');
}

function buildOobeSystem(config, componentAttrs, locale, addFile) {
  const out = [];
  const account = config.account;
  const hasPass = account.password.length > 0;

  out.push('  <!-- oobeSystem: területi beállítások, felhasználók, első bejelentkezés -->');
  out.push('  <settings pass="oobeSystem">');

  // JAVÍTVA: az InputLocale/SystemLocale/UILanguage/UserLocale a
  // Microsoft-Windows-International-Core komponens elemei, NEM a Shell-Setup-é.
  // Ezek korábban a Shell-Setup alatt voltak, ráadásul fixen hu-HU-ra égetve.
  out.push(`    <component ${componentAttrs('Microsoft-Windows-International-Core')}>`);
  out.push(`      <InputLocale>${locale.inputLocale}</InputLocale>`);
  out.push(`      <SystemLocale>${locale.locale}</SystemLocale>`);
  out.push(`      <UILanguage>${locale.locale}</UILanguage>`);
  if (locale.fallback) {
    out.push(`      <UILanguageFallback>${locale.fallback}</UILanguageFallback>`);
  }
  out.push(`      <UserLocale>${locale.locale}</UserLocale>`);
  out.push('    </component>');
  out.push('');

  out.push(`    <component ${componentAttrs('Microsoft-Windows-Shell-Setup')}>`);

  // Gyerekelemek ABC sorrendben: AutoLogon, FirstLogonCommands, OOBE, TimeZone, UserAccounts.
  if (account.autoLogon) {
    out.push('      <AutoLogon>');
    if (hasPass) {
      out.push('        <Password>');
      out.push(`          <Value>${escapeXml(account.password)}</Value>`);
      out.push('          <PlainText>true</PlainText>');
      out.push('        </Password>');
    }
    out.push('        <Enabled>true</Enabled>');
    out.push('        <LogonCount>1</LogonCount>');
    out.push(`        <Username>${escapeXml(account.username)}</Username>`);
    out.push('      </AutoLogon>');
  }

  out.push('      <FirstLogonCommands>');
  out.push(
    ...syncCommand(
      1,
      `C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "[System.Diagnostics.EventLog]::WriteEntry( '${EVENT_SOURCE}', \\"User $env:USERNAME has logged on.\\", [System.Diagnostics.EventLogEntryType]::Information, 1 );"`,
      'Bejelentkezési esemény kiírása (UnlockStartLayout trigger)'
    )
  );
  out.push(
    ...syncCommand(
      2,
      `C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${SCRIPTS_DIR}\\FirstLogon.ps1"`,
      'Alkalmazások telepítése és takarítás'
    )
  );
  out.push('      </FirstLogonCommands>');

  // OOBE gyerekelemek ABC sorrendben.
  out.push('      <OOBE>');
  if (config.silentOOBEPrivacy || config.silentOOBEBlueScreens) {
    out.push('        <HideEULAPage>true</HideEULAPage>');
    out.push('        <HideLocalAccountScreen>true</HideLocalAccountScreen>');
    out.push('        <HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>');
  }
  // A HideOnlineAccountScreens a TÁMOGATOTT módja annak, hogy ne kérjen
  // Microsoft-fiókot – a kivezetett BypassNRO helyett erre támaszkodunk.
  if (config.silentOOBEPrivacy || config.bypassNetwork || config.silentOOBEBlueScreens) {
    out.push('        <HideOnlineAccountScreens>true</HideOnlineAccountScreens>');
  }
  if (config.silentOOBENetwork) {
    out.push('        <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>');
    out.push('        <NetworkLocation>Home</NetworkLocation>');
  }
  if (config.silentOOBEPrivacy) {
    out.push('        <ProtectYourPC>3</ProtectYourPC>');
  }
  // MEGJEGYZÉS: a SkipMachineOOBE / SkipUserOOBE szándékosan KIMARAD. A
  // Microsoft nem támogatja Windows 11-en, és ismerten hibás profil-létrehozást
  // meg félbehagyott OOBE-t okoz. A fenti Hide* elemek + a helyi fiók +
  // AutoLogon együtt így is végigviszik az OOBE-t interakció nélkül.
  out.push('      </OOBE>');

  out.push(`      <TimeZone>${escapeXml(locale.timeZone)}</TimeZone>`);

  out.push('      <UserAccounts>');
  out.push('        <LocalAccounts>');
  out.push('          <LocalAccount wcm:action="add">');
  // Séma szerinti sorrend: Password, Description, DisplayName, Group, Name.
  if (hasPass) {
    out.push('            <Password>');
    out.push(`              <Value>${escapeXml(account.password)}</Value>`);
    out.push('              <PlainText>true</PlainText>');
    out.push('            </Password>');
  }
  out.push('            <Group>Administrators</Group>');
  out.push(`            <Name>${escapeXml(account.username)}</Name>`);
  // MEGJEGYZÉS: a <PasswordExpires> NEM valid elem a LocalAccount alatt
  // (csak Name, Group, Description, DisplayName, Password). A jelszó
  // lejáratának tiltását a Specialize.ps1 végzi `net accounts`-szal.
  out.push('          </LocalAccount>');
  out.push('        </LocalAccounts>');
  out.push('      </UserAccounts>');

  out.push('    </component>');
  out.push('  </settings>');

  // --- FirstLogon szkriptek ---
  const installers = [];
  const cs = config.customScripts || {};

  if (config.wingetMode !== 'none') {
    let wingetCode = '';
    if (config.wingetMode === 'presetA') wingetCode = SCRIPTS.wingetAppsA;
    else if (config.wingetMode === 'presetB') wingetCode = SCRIPTS.wingetAppsB;
    else if (config.wingetMode === 'custom') {
      const list = buildWingetCustomList(config);
      if (list) wingetCode = SCRIPTS.wingetCustomBase.replace('##APPS##', list);
    }
    if (wingetCode) {
      const path = `${SCRIPTS_DIR}\\App-Winget.ps1`;
      addFile(path, wingetCode);
      installers.push({ name: 'Winget alkalmazasok', path });
    }
  }

  if (cs.office === 'versionA') {
    const path = `${SCRIPTS_DIR}\\App-Office.ps1`;
    addFile(path, SCRIPTS.officeA.replace(/##OFFICE_LANG##/g, locale.officeLang));
    installers.push({ name: 'Microsoft 365', path });
  } else if (cs.office === 'versionB') {
    const path = `${SCRIPTS_DIR}\\App-Office.ps1`;
    addFile(
      path,
      SCRIPTS.officeB
        .replace('##OFFICE_MAK_KEY##', String(cs.officeKey || '').replace(/'/g, "''"))
        .replace(/##OFFICE_LANG##/g, locale.officeLang)
    );
    installers.push({ name: 'Office 2021', path });
  }

  if (cs.pcManager) {
    const path = `${SCRIPTS_DIR}\\App-PCManager.ps1`;
    addFile(path, SCRIPTS.pcManager);
    installers.push({ name: 'PC Manager', path });
  }

  if (cs.windowsUpdate) {
    const path = `${SCRIPTS_DIR}\\App-WindowsUpdate.ps1`;
    addFile(path, SCRIPTS.windowsUpdate);
    installers.push({ name: 'Windows Update', path });
  }

  // A tartományba léptetés MINDIG utolsó: újraindítást kér.
  if (cs.domainJoin) {
    const path = `${SCRIPTS_DIR}\\App-DomainJoin.ps1`;
    addFile(
      path,
      SCRIPTS.domainJoin
        .replace('##DOMAIN_NAME##', String(cs.domainName || '').replace(/'/g, "''"))
        .replace('##DOMAIN_USER##', String(cs.domainUser || '').replace(/'/g, "''"))
        .replace('##DOMAIN_PASS##', String(cs.domainPass || '').replace(/'/g, "''"))
    );
    installers.push({ name: 'Tartomanyba leptetes', path });
  }

  const first = [];
  // JAVÍTVA: 'Continue', nem 'Stop'. Korábban az első hibás telepítő megölte az
  // összes továbbit ÉS a takarítást is. Most minden telepítő külön try/catch-ben
  // fut, a hibákat összegyűjtjük, a takarítás pedig finally-ben mindig lefut.
  first.push("$ErrorActionPreference = 'Continue';");
  first.push(`$script:LogFile = ${psQuote(`${LOG_DIR}\\FirstLogon.log`)};`);
  first.push('function Write-SetupLog { param([string]$Message) ; "$(Get-Date -Format o) $Message" | Out-File -FilePath $script:LogFile -Append -Encoding utf8 }');
  first.push('$failed = @();');
  first.push('');
  first.push('function Invoke-SetupScript {');
  first.push('  param([string]$Name, [string]$Path)');
  first.push('  if (-not (Test-Path -LiteralPath $Path)) {');
  first.push('    Write-SetupLog "$Name: script missing ($Path).";');
  first.push('    return $false;');
  first.push('  }');
  first.push('  Write-SetupLog "$Name: start.";');
  first.push('  try {');
  first.push(
    "    $p = Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',$Path) -PassThru -Wait -WindowStyle Maximized;"
  );
  first.push('    if ($p.ExitCode -ne 0) {');
  first.push('      Write-SetupLog "$Name: FAILED with exit code $($p.ExitCode).";');
  first.push('      return $false;');
  first.push('    }');
  first.push('    Write-SetupLog "$Name: ok.";');
  first.push('    return $true;');
  first.push('  } catch {');
  first.push('    Write-SetupLog "$Name: EXCEPTION $($_.Exception.Message)";');
  first.push('    return $false;');
  first.push('  }');
  first.push('}');
  first.push('');
  first.push('try {');

  const wifi = config.wifi || {};
  if (wifi.mode === 'manual') {
    first.push("  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c start ms-availablenetworks:' -WindowStyle Hidden;");
    first.push('  Start-Sleep -Seconds 3;');
  }

  for (const inst of installers) {
    first.push(
      `  if (-not (Invoke-SetupScript -Name ${psQuote(inst.name)} -Path ${psQuote(
        inst.path
      )})) { $failed += ${psQuote(inst.name)}; }`
    );
  }

  first.push(`  Invoke-SetupScript -Name 'UserOnce' -Path ${psQuote(`${SCRIPTS_DIR}\\UserOnce.ps1`)} | Out-Null;`);
  first.push('} finally {');
  first.push('  if ($failed.Count -gt 0) {');
  first.push("    Write-SetupLog \"Failed steps: $($failed -join ', ')\";");
  first.push('  } else {');
  first.push("    Write-SetupLog 'All steps completed.';");
  first.push('  }');
  // Csak a Scripts mappát töröljük. A Files mappa TARTÓSAN megmarad, mert az
  // ütemezett feladatok onnan futnak – korábban a törlés a saját lábát vágta le.
  first.push(`  Remove-Item -LiteralPath ${psQuote(SCRIPTS_DIR)} -Recurse -Force -ErrorAction SilentlyContinue;`);
  first.push('}');
  addFile(`${SCRIPTS_DIR}\\FirstLogon.ps1`, first.join('\n') + '\n');

  const userOnce = ["$ErrorActionPreference = 'Continue';"];
  if (config.disableCopilot) {
    userOnce.push(
      "Get-AppxPackage -Name 'Microsoft.Windows.Ai.Copilot.Provider' | Remove-AppxPackage -ErrorAction SilentlyContinue;"
    );
    userOnce.push("Get-AppxPackage -Name 'Microsoft.Copilot' | Remove-AppxPackage -ErrorAction SilentlyContinue;");
  }
  userOnce.push('exit 0;');
  addFile(`${SCRIPTS_DIR}\\UserOnce.ps1`, userOnce.join('\n') + '\n');

  // MEGJEGYZÉS: nincs többé profile.ps1 a System32-ben. A régi megoldás egy
  // globális AllUsers PowerShell profilt hagyott ott ÖRÖKRE, ráadásul a
  // -NoProfile miatt a benne definiált függvény sosem töltődött be.

  return out.join('\n');
}

// --- Belépési pont ----------------------------------------------------------

export function generateXml(rawConfig, uiLanguage = null) {
  const config = normalizeConfig(rawConfig);
  // Ha a hívó ad UI nyelvet és a configban nincs, azt használjuk – de innentől
  // EGYETLEN forrás van, nincs többé szétcsúszás.
  if (uiLanguage && !config.installLanguage) {
    config.installLanguage = uiLanguage;
  }
  const locale = resolveLocale(config);

  const files = [];
  const seen = new Set();
  function addFile(path, content) {
    if (seen.has(path)) return;
    seen.add(path);
    // .vbs és .reg fájloknak UTF-16LE + BOM kell, minden másnak UTF-8 BOM nélkül.
    // A base64 a PONTOS byte-folyamot tartalmazza, az ExtractScript csak kiírja.
    const isUtf16 = /\.(vbs|reg)$/i.test(path);
    const b64 = isUtf16 ? encodeUtf16LeBase64(content) : encodeUtf8Base64(content);
    files.push(`    <File path="${escapeXml(path)}">${b64}</File>`);
  }

  const arch = config.architecture === 'arm64' ? 'arm64' : 'amd64';
  const componentAttrs = (name) =>
    `name="${name}" processorArchitecture="${arch}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS"`;

  const windowsPE = buildWindowsPE(config, componentAttrs, locale);
  const specialize = buildSpecialize(config, componentAttrs, addFile);
  const oobe = buildOobeSystem(config, componentAttrs, locale, addFile);

  let extensions = '';
  if (files.length > 0) {
    extensions = [
      '  <Extensions xmlns="https://schneegans.de/windows/unattend-generator/">',
      '    <ExtractScript>',
      escapeXml(SCHNEEGANS_SCRIPTS.extractScript),
      '    </ExtractScript>',
      ...files,
      '  </Extensions>',
    ].join('\n');
  }

  // Figyelmeztetés, ha titok kerül a fájlba (nyílt szövegben, ez az unattend
  // formátum sajátja – ezért fontos, hogy a felhasználó tudjon róla).
  const hasSecrets =
    config.account.password.length > 0 ||
    !!(config.wifi && config.wifi.mode === 'auto' && config.wifi.password) ||
    !!(config.customScripts && config.customScripts.domainJoin && config.customScripts.domainPass) ||
    !!(config.customScripts && config.customScripts.officeKey);

  const header = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<!--',
    '  Windows 11 autounattend.xml',
    '  Generálva az Autounattend Generátorral.',
  ];
  if (hasSecrets) {
    header.push('');
    header.push('  FIGYELEM: ez a fájl NYÍLT SZÖVEGBEN tartalmaz jelszót és/vagy licenckulcsot');
    header.push('  (helyi fiók, Wi-Fi, tartomány, Office). Ezt az unattend formátum követeli meg.');
    header.push('  Ne töltsd fel verziókezelőbe, ne oszd meg, és a telepítés után töröld a');
    header.push('  C:\\Windows\\Panther\\unattend.xml fájlt.');
  }
  header.push('-->');

  const parts = [
    ...header,
    '<unattend xmlns="urn:schemas-microsoft-com:unattend"',
    '          xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">',
    '',
    windowsPE,
    '',
    specialize,
    '',
    oobe,
  ];
  if (extensions) {
    parts.push('');
    parts.push(extensions);
  }
  parts.push('</unattend>');
  return parts.join('\n');
}
