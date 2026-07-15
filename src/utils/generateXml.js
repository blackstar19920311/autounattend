import { SCRIPTS } from './customScripts';
import { WINGET_APPS } from '../data/wingetAppsList';

/**
 * Windows 11 autounattend.xml generátor.
 * Érvényes unattend XML-t állít elő a megadott konfiguráció alapján.
 */

/**
 * Escapes XML special characters in a string.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Encodes a PowerShell script string to a UTF-16LE Base64 string for -EncodedCommand
 */
function encodePowerShellBase64(script) {
  const charCodes = [0xff, 0xfe]; // BOM for UTF-16LE so PowerShell -File parses it correctly
  for (let i = 0; i < script.length; i++) {
    const code = script.charCodeAt(i);
    charCodes.push(code & 0xff);
    charCodes.push((code >> 8) & 0xff);
  }
  let binary = '';
  for (let i = 0; i < charCodes.length; i++) {
    binary += String.fromCharCode(charCodes[i]);
  }
  return btoa(binary);
}

/**
 * Szétbont egy Base64 kódolt szkriptet kis darabokra (chunkokra), és a RunSynchronous
 * szekcióhoz adja őket cmd.exe echo segítségével. Így megkerülhető a 259 karakteres XML limit.
 */
function addBase64ScriptToSyncCmds(runSyncCmds, orderRef, scriptContent, tempB64Path, destPs1Path, runScript = true) {
  const base64 = encodePowerShellBase64(scriptContent);
  const chunkSize = 200; // Biztonságosan a 259 karakteres Path limit alatt

  for (let i = 0; i < base64.length; i += chunkSize) {
    const chunk = base64.substring(i, i + chunkSize);
    const redir = i === 0 ? '>' : '>>';
    runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
    runSyncCmds.push(`          <Order>${orderRef.val++}</Order>`);
    runSyncCmds.push(`          <Path>cmd.exe /c ${redir === '>' ? '&gt;' : '&gt;&gt;'}${tempB64Path} echo ${chunk}</Path>`);
    runSyncCmds.push('        </RunSynchronousCommand>');
  }

  runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
  runSyncCmds.push(`          <Order>${orderRef.val++}</Order>`);
  runSyncCmds.push(`          <Path>certutil.exe -decode -f ${tempB64Path} ${destPs1Path}</Path>`);
  runSyncCmds.push('        </RunSynchronousCommand>');

  runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
  runSyncCmds.push(`          <Order>${orderRef.val++}</Order>`);
  runSyncCmds.push(`          <Path>powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File ${destPs1Path}</Path>`);
  runSyncCmds.push('        </RunSynchronousCommand>');
}

/**
 * Szétbont egy Base64 kódolt szkriptet FirstLogonCommands formátumban.
 */
function addBase64ScriptToFirstLogon(commands, scriptContent, tempB64Path, destPs1Path, description) {
  const wrappedScript = `$ShortLog = "C:\\InstallSummary.log"
$FullLog = "C:\\InstallFull.log"
$ScriptName = '${description.replace(/'/g, "''")}'

Add-Content -Path $FullLog -Value "" -Encoding utf8
Add-Content -Path $FullLog -Value "------------------------------------------------------------" -Encoding utf8
Add-Content -Path $FullLog -Value "# $ScriptName" -Encoding utf8
Add-Content -Path $FullLog -Value "------------------------------------------------------------" -Encoding utf8

try {
${scriptContent}
    Add-Content -Path $ShortLog -Value "[$((Get-Date).ToString('HH:mm:ss'))] SIKERES: $ScriptName" -Encoding utf8
    Add-Content -Path $FullLog -Value "" -Encoding utf8
    Add-Content -Path $FullLog -Value "[SIKERES] A szegmens hibátlanul lefutott." -Encoding utf8
} catch {
    Add-Content -Path $ShortLog -Value "[$((Get-Date).ToString('HH:mm:ss'))] HIBÁS: $ScriptName" -Encoding utf8
    Add-Content -Path $FullLog -Value "" -Encoding utf8
    Add-Content -Path $FullLog -Value "[HIBA] $($_.Exception.Message)" -Encoding utf8
    exit 1
}`;

  const base64 = encodePowerShellBase64(wrappedScript);
  const chunkSize = 200;

  for (let i = 0; i < base64.length; i += chunkSize) {
    const chunk = base64.substring(i, i + chunkSize);
    const redir = i === 0 ? '>' : '>>';
    commands.push({
      command: `cmd.exe /c ${redir}${tempB64Path} echo ${chunk}`,
      description: `${description} (adatok írása ${i + 1}. rész)`
    });
  }

  commands.push({
    command: `certutil.exe -decode -f ${tempB64Path} ${destPs1Path}`,
    description: `${description} (dekódolás)`
  });

  commands.push({
    command: `powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File ${destPs1Path}`,
    description: `${description} (futtatás)`
  });
}

/**
 * Generates a valid Windows 11 autounattend.xml string from the given config.
 * @param {Object} config - The full configuration object.
 * @param {string} uiLanguage - The current UI language.
 * @returns {string} The generated XML string.
 */
export function generateXml(config, uiLanguage = 'hu') {
  const arch = config.architecture || 'amd64';
  const componentAttrs = (name) =>
    `name="${name}" processorArchitecture="${arch}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS"`;

  // --- Billentyűzetkiosztás ---
  let inputLocale = '040e:0000040e';
  if (uiLanguage === 'en') {
    inputLocale = '0409:00000409';
  } else if (config.addEnglishKeyboard) {
    inputLocale = '040e:0000040e;0409:00000409';
  }

  // --- windowsPE pass ---
  const windowsPE = buildWindowsPE(config, componentAttrs, inputLocale);

  // --- specialize pass ---
  const specialize = buildSpecialize(config, componentAttrs);

  // --- oobeSystem pass ---
  const oobe = buildOobeSystem(config, componentAttrs, inputLocale, uiLanguage);

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<unattend xmlns="urn:schemas-microsoft-com:unattend"',
    '          xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">',
    '',
    windowsPE,
    '',
    specialize,
    '',
    oobe,
    '',
    '</unattend>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// windowsPE pass
// ---------------------------------------------------------------------------
function buildWindowsPE(config, componentAttrs, inputLocale) {
  const lines = [];
  lines.push('  <!-- windowsPE – Nyelvi és telepítési beállítások -->');
  lines.push('  <settings pass="windowsPE">');

  // International-Core-WinPE
  const setupUiLang = config.installLanguage === 'en' ? 'en-US' : 'hu-HU';
  const sysLocale = config.installLanguage === 'en' ? 'en-US' : 'hu-HU';
  const uiLang = config.installLanguage === 'en' ? 'en-US' : 'hu-HU';
  const userLocale = config.installLanguage === 'en' ? 'en-US' : 'hu-HU';
  const uiLangFallback = config.installLanguage === 'en' ? '' : 'en-US';

  lines.push(`    <component ${componentAttrs('Microsoft-Windows-International-Core-WinPE')}>`);
  lines.push(`      <SetupUILanguage>`);
  lines.push(`        <UILanguage>${setupUiLang}</UILanguage>`);
  lines.push(`      </SetupUILanguage>`);
  lines.push(`      <InputLocale>${inputLocale}</InputLocale>`);
  lines.push(`      <SystemLocale>${sysLocale}</SystemLocale>`);
  lines.push(`      <UILanguage>${uiLang}</UILanguage>`);
  if (uiLangFallback) {
    lines.push(`      <UILanguageFallback>${uiLangFallback}</UILanguageFallback>`);
  }
  lines.push(`      <UserLocale>${userLocale}</UserLocale>`);
  lines.push('    </component>');

  // Microsoft-Windows-Setup
  lines.push('');
  lines.push(`    <component ${componentAttrs('Microsoft-Windows-Setup')}>`);
  lines.push('      <UserData>');

  if (config.productKey && config.productKey.trim() !== '') {
    lines.push('        <ProductKey>');
    lines.push(`          <Key>${escapeXml(config.productKey.trim())}</Key>`);
    lines.push('        </ProductKey>');
  } else {
    lines.push('        <ProductKey>');
    lines.push('          <Key>VK7JG-NPHTM-C97JM-9MPGT-3V66T</Key>');
    lines.push('        </ProductKey>');
  }

  lines.push(`        <AcceptEula>${config.autoAcceptEula ? 'true' : 'false'}</AcceptEula>`);
  lines.push('      </UserData>');

  // --- Particionálás ---
  if (config.partitioning && config.partitioning.enabled) {
    const diskId = config.partitioning.diskNumber || 0;

    if (config.partitioning.mode === 'auto') {
      if (config.partitioning.fullWipe) {
        const cleanCmd = 'CLEAN ALL';
        const formatQuick = 'QUICK ';
        const script = `SELECT DISK=${diskId}
${cleanCmd}
CONVERT GPT
CREATE PARTITION EFI SIZE=100
FORMAT ${formatQuick}FS=FAT32 LABEL="System"
CREATE PARTITION MSR SIZE=16
CREATE PARTITION PRIMARY
FORMAT ${formatQuick}FS=NTFS LABEL="Windows"`;

        const scriptLines = script.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        lines.push('');
        lines.push('      <!-- Csak C meghajtó (auto) DISKPART parancsok végrehajtása (Teljes formázás) -->');
        lines.push('      <RunSynchronous>');
        
        let order = 1;
        for (let i = 0; i < scriptLines.length; i++) {
          const redirect = i === 0 ? '>' : '>>';
          const cmd = `cmd /c ${redirect}X:\\diskpart.txt echo ${scriptLines[i]}`;
          lines.push('        <RunSynchronousCommand wcm:action="add">');
          lines.push(`          <Order>${order++}</Order>`);
          lines.push(`          <Path>${escapeXml(cmd)}</Path>`);
          lines.push('        </RunSynchronousCommand>');
        }
        
        lines.push('        <RunSynchronousCommand wcm:action="add">');
        lines.push(`          <Order>${order++}</Order>`);
        lines.push('          <Description>DISKPART szkript futtatása (Csak C:)</Description>');
        lines.push('          <Path>diskpart /s X:\\diskpart.txt</Path>');
        lines.push('        </RunSynchronousCommand>');
        lines.push('      </RunSynchronous>');

        lines.push('');
        lines.push('      <ImageInstall>');
        lines.push('        <OSImage>');
        lines.push('          <InstallTo>');
        lines.push(`            <DiskID>${diskId}</DiskID>`);
        lines.push('            <PartitionID>3</PartitionID>');
        lines.push('          </InstallTo>');
        lines.push('        </OSImage>');
        lines.push('      </ImageInstall>');
      } else {
        // Eredeti (láthatatlan) automatikus GPT partíciók: EFI (100 MB) + MSR (16 MB) + Windows (maradék)
        lines.push('');
        lines.push('      <!-- Lemez particionálás (automatikus GPT) -->');
        lines.push('      <DiskConfiguration>');
        lines.push('        <WillShowUI>OnError</WillShowUI>');
        lines.push('        <Disk wcm:action="add">');
        lines.push(`          <DiskID>${diskId}</DiskID>`);
        lines.push('          <WillWipeDisk>true</WillWipeDisk>');
        lines.push('          <CreatePartitions>');
        lines.push('            <CreatePartition wcm:action="add">');
        lines.push('              <Order>1</Order>');
        lines.push('              <Size>100</Size>');
        lines.push('              <Type>EFI</Type>');
        lines.push('            </CreatePartition>');
        lines.push('            <CreatePartition wcm:action="add">');
        lines.push('              <Order>2</Order>');
        lines.push('              <Size>16</Size>');
        lines.push('              <Type>MSR</Type>');
        lines.push('            </CreatePartition>');
        lines.push('            <CreatePartition wcm:action="add">');
        lines.push('              <Order>3</Order>');
        lines.push('              <Extend>true</Extend>');
        lines.push('              <Type>Primary</Type>');
        lines.push('            </CreatePartition>');
        lines.push('          </CreatePartitions>');
        lines.push('          <ModifyPartitions>');
        lines.push('            <ModifyPartition wcm:action="add">');
        lines.push('              <Order>1</Order>');
        lines.push('              <PartitionID>1</PartitionID>');
        lines.push('              <Format>FAT32</Format>');
        lines.push('              <Label>System</Label>');
        lines.push('            </ModifyPartition>');
        lines.push('            <ModifyPartition wcm:action="add">');
        lines.push('              <Order>2</Order>');
        lines.push('              <PartitionID>2</PartitionID>');
        lines.push('            </ModifyPartition>');
        lines.push('            <ModifyPartition wcm:action="add">');
        lines.push('              <Order>3</Order>');
        lines.push('              <PartitionID>3</PartitionID>');
        lines.push('              <Format>NTFS</Format>');
        lines.push('              <Label>Windows</Label>');
        lines.push('              <Letter>C</Letter>');
        lines.push('            </ModifyPartition>');
        lines.push('          </ModifyPartitions>');
        lines.push('        </Disk>');
        lines.push('      </DiskConfiguration>');
        lines.push('');
        lines.push('      <ImageInstall>');
        lines.push('        <OSImage>');
        lines.push('          <InstallTo>');
        lines.push(`            <DiskID>${diskId}</DiskID>`);
        lines.push('            <PartitionID>3</PartitionID>');
        lines.push('          </InstallTo>');
        lines.push('        </OSImage>');
        lines.push('      </ImageInstall>');
      }
    } else if (config.partitioning.mode === 'autocd') {
      const cleanCmd = config.partitioning.fullWipe ? 'CLEAN ALL' : 'CLEAN';
      const formatQuick = 'QUICK ';
      const script = `SELECT DISK=${diskId}
${cleanCmd}
CONVERT GPT
CREATE PARTITION EFI SIZE=300
FORMAT ${formatQuick}FS=FAT32 LABEL="System"
CREATE PARTITION MSR SIZE=16
CREATE PARTITION PRIMARY SIZE=153600
FORMAT ${formatQuick}FS=NTFS LABEL="Windows"
CREATE PARTITION PRIMARY
SHRINK MINIMUM=1000
FORMAT ${formatQuick}FS=NTFS LABEL="Adatok"
CREATE PARTITION PRIMARY
FORMAT ${formatQuick}FS=NTFS LABEL="Recovery"
SET ID="de94bba4-06d1-4d40-a16a-bfd50179d6ac"
GPT ATTRIBUTES=0x8000000000000001`;

      const scriptLines = script.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      lines.push('');
      lines.push('      <!-- C és D meghajtó (autocd) DISKPART parancsok végrehajtása -->');
      lines.push('      <RunSynchronous>');
      
      let order = 1;
      for (let i = 0; i < scriptLines.length; i++) {
        const redirect = i === 0 ? '>' : '>>';
        const cmd = `cmd /c ${redirect}X:\\diskpart.txt echo ${scriptLines[i]}`;
        lines.push('        <RunSynchronousCommand wcm:action="add">');
        lines.push(`          <Order>${order++}</Order>`);
        lines.push(`          <Path>${escapeXml(cmd)}</Path>`);
        lines.push('        </RunSynchronousCommand>');
      }
      
      lines.push('        <RunSynchronousCommand wcm:action="add">');
      lines.push(`          <Order>${order++}</Order>`);
      lines.push('          <Description>DISKPART szkript futtatása (C: és D:)</Description>');
      lines.push('          <Path>diskpart /s X:\\diskpart.txt</Path>');
      lines.push('        </RunSynchronousCommand>');
      lines.push('      </RunSynchronous>');

      lines.push('');
      lines.push('      <ImageInstall>');
      lines.push('        <OSImage>');
      lines.push('          <InstallTo>');
      lines.push(`            <DiskID>${diskId}</DiskID>`);
      lines.push(`            <PartitionID>3</PartitionID>`);
      lines.push('          </InstallTo>');
      lines.push('        </OSImage>');
      lines.push('      </ImageInstall>');

    } else if (config.partitioning.mode === 'custom') {
      const script = (config.partitioning.customDiskpartScript || '').trim();

      if (script) {
        const scriptLines = script.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        lines.push('');
        lines.push('      <!-- Egyéni DISKPART parancsok végrehajtása -->');
        lines.push('      <RunSynchronous>');
        
        let order = 1;
        for (let i = 0; i < scriptLines.length; i++) {
          const redirect = i === 0 ? '>' : '>>';
          // Itt nincsenek zárójelek, ezért a cmd /c probléma nélkül kezeli az idézőjeleket
          const cmd = `cmd /c ${redirect}X:\\diskpart.txt echo ${scriptLines[i]}`;
          lines.push('        <RunSynchronousCommand wcm:action="add">');
          lines.push(`          <Order>${order++}</Order>`);
          lines.push(`          <Path>${escapeXml(cmd)}</Path>`);
          lines.push('        </RunSynchronousCommand>');
        }
        
        lines.push('        <RunSynchronousCommand wcm:action="add">');
        lines.push(`          <Order>${order++}</Order>`);
        lines.push('          <Description>DISKPART szkript futtatása</Description>');
        lines.push('          <Path>diskpart /s X:\\diskpart.txt</Path>');
        lines.push('        </RunSynchronousCommand>');
        lines.push('      </RunSynchronous>');
      }

      const installPartition = config.partitioning.installPartitionId || 3;
      lines.push('');
      lines.push('      <ImageInstall>');
      lines.push('        <OSImage>');
      lines.push('          <InstallTo>');
      lines.push(`            <DiskID>${diskId}</DiskID>`);
      lines.push(`            <PartitionID>${installPartition}</PartitionID>`);
      lines.push('          </InstallTo>');
      lines.push('        </OSImage>');
      lines.push('      </ImageInstall>');
    }
  }

  lines.push('    </component>');

  lines.push('  </settings>');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// specialize pass
// ---------------------------------------------------------------------------
function buildSpecialize(config, componentAttrs) {
  const lines = [];
  lines.push('  <!-- specialize – Számítógépnév és hardver-megkerülés -->');
  lines.push('  <settings pass="specialize">');

  const prefix = (config.computerName || 'PC').trim();
  const useRandom = config.randomSuffix !== false;

  // Shell-Setup — ComputerName
  lines.push(`    <component ${componentAttrs('Microsoft-Windows-Shell-Setup')}>`);
  if (useRandom) {
    // Ideiglenes név — a végleges nevet a PowerShell szkript állítja be
    lines.push('      <ComputerName>TEMPNAME</ComputerName>');
  } else {
    // Fix név, nincs random utótag
    lines.push(`      <ComputerName>${escapeXml(prefix)}</ComputerName>`);
  }
  lines.push('    </component>');

  // Deployment komponens: random számítógépnév + bypass
  let order = 1;
  const runSyncCmds = [];

  // Random számítógépnév generálás telepítéskor
  // Minta: PREFIX-AB12 (2 nagybetű + 2 számjegy, fix hosszúságú)
  if (useRandom) {
    // PowerShell szkript: generál egy nevet és egy háttérfolyamatban (loop) folyamatosan
    // beírja a registry-be, mert a Windows specialize fázis felülírhatja.
    const psScript = `
$letters = -join (1..2 | ForEach-Object { [char](Get-Random -Minimum 65 -Maximum 91) })
$digits = '{0:D2}' -f (Get-Random -Minimum 0 -Maximum 100)
$newName = '${prefix.replace(/'/g, "''")}-' + $letters + $digits
$script = "while(\`$true){ Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ComputerName' 'ComputerName' '$newName' -Force; Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ActiveComputerName' 'ComputerName' '$newName' -Force; Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters' 'Hostname' '$newName' -Force; Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters' 'NV Hostname' '$newName' -Force; Start-Sleep -Milliseconds 50 }"
$script | Out-File -FilePath 'C:\\Windows\\Temp\\rename_loop.ps1' -Encoding ascii
Start-Process -FilePath 'powershell.exe' -ArgumentList '-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File C:\\Windows\\Temp\\rename_loop.ps1'
`;
    
    runSyncCmds.push('        <!-- Egyedi számítógépnév generálása telepítéskor (háttérfolyamattal) -->');
    const orderRef = { val: order };
    addBase64ScriptToSyncCmds(runSyncCmds, orderRef, psScript, 'C:\\Windows\\Temp\\rn.b64', 'C:\\Windows\\Temp\\rn.ps1');
    order = orderRef.val;
  }

  // Hardware bypass
  if (config.bypassHardware) {
    runSyncCmds.push('');
    runSyncCmds.push('        <!-- Hardverkövetelmények megkerülése -->');
    const bypassChecks = [
      'BypassTPMCheck', 'BypassSecureBootCheck', 'BypassRAMCheck',
      'BypassStorageCheck', 'BypassCPUCheck',
    ];
    for (const key of bypassChecks) {
      runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
      runSyncCmds.push(`          <Order>${order}</Order>`);
      runSyncCmds.push(`          <Path>reg add HKLM\\SYSTEM\\Setup\\LabConfig /v ${key} /t REG_DWORD /d 1 /f</Path>`);
      runSyncCmds.push('        </RunSynchronousCommand>');
      order++;
    }
  }

  // --- Start menü takarítás (ConfigureStartPins registry GPO + MDM) ---
  if (config.cleanStartPins) {
    runSyncCmds.push('');
    runSyncCmds.push('        <!-- Start menü kitűzött elemeinek törlése (csak Gépház) -->');
    const layoutScript = `
$json = '{"pinnedList":[{"packagedAppId":"windows.immersivecontrolpanel_cw5n1h2txyewy!microsoft.windows.immersivecontrolpanel"}]}'

$mdmKey = 'HKLM:\\SOFTWARE\\Microsoft\\PolicyManager\\current\\device\\Start'
New-Item $mdmKey -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
Set-ItemProperty $mdmKey 'ConfigureStartPins' $json -Type String -Force

$gpoKey = 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer'
New-Item $gpoKey -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
Set-ItemProperty $gpoKey 'ConfigureStartPins' $json -Type String -Force
`;
    const orderRef = { val: order };
    addBase64ScriptToSyncCmds(runSyncCmds, orderRef, layoutScript.trim(), 'C:\\Windows\\Temp\\layout.b64', 'C:\\Windows\\Temp\\layout.ps1');
    order = orderRef.val;
  }

  // --- Egérgyorsulás kikapcsolása (Default User profil módosítása) ---
  if (config.disableMouseAcceleration) {
    runSyncCmds.push('');
    runSyncCmds.push('        <!-- Egérgyorsítás kikapcsolása az alapértelmezett profilban -->');
    const mouseScript = `
reg load "HKU\\DefaultUser" "C:\\Users\\Default\\NTUSER.DAT"
reg add "HKU\\DefaultUser\\Control Panel\\Mouse" /v MouseSpeed /t REG_SZ /d 0 /f
reg add "HKU\\DefaultUser\\Control Panel\\Mouse" /v MouseThreshold1 /t REG_SZ /d 0 /f
reg add "HKU\\DefaultUser\\Control Panel\\Mouse" /v MouseThreshold2 /t REG_SZ /d 0 /f
reg unload "HKU\\DefaultUser"
`;
    const orderRef = { val: order };
    addBase64ScriptToSyncCmds(runSyncCmds, orderRef, mouseScript.trim(), 'C:\\Windows\\Temp\\mouse.b64', 'C:\\Windows\\Temp\\mouse.ps1');
    order = orderRef.val;
  }

  // --- Alvás letiltása és Maximális teljesítmény energiaséma (Specialize fázis) ---
  if (config.disableSleep) {
    runSyncCmds.push('');
    runSyncCmds.push('        <!-- Alvás letiltása és Maximális teljesítmény energiaséma -->');
    const powerScript = `
$out = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
if ($out -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
    powercfg -setactive $matches[1]
}
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change monitor-timeout-ac 0
powercfg /change monitor-timeout-dc 0
`;
    const orderRef = { val: order };
    addBase64ScriptToSyncCmds(runSyncCmds, orderRef, powerScript.trim(), 'C:\\Windows\\Temp\\power.b64', 'C:\\Windows\\Temp\\power.ps1');
    order = orderRef.val;
  }

  // --- Tálca ikonok (HKLM Házirendek a Specialize fázisban) ---
  if (config.hideTaskbarIcons) {
    runSyncCmds.push('');
    runSyncCmds.push('        <!-- Tálca Widgets és Chat kikapcsolása (HKLM Házirendek) -->');
    let taskbarPolicyScript = `
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /t REG_DWORD /d 0 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Chat" /v ChatIcon /t REG_DWORD /d 3 /f
reg add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" /v NoPinningStoreToTaskbar /t REG_DWORD /d 1 /f

$xml = '<?xml version="1.0" encoding="utf-8"?>
<LayoutModificationTemplate xmlns="http://schemas.microsoft.com/Start/2014/LayoutModification" xmlns:taskbar="http://schemas.microsoft.com/Start/2014/TaskbarLayout" Version="1">
  <CustomTaskbarLayoutCollection PinListPlacement="Replace">
    <defaultlayout:TaskbarLayout xmlns:defaultlayout="http://schemas.microsoft.com/Start/2014/FullDefaultLayout">
      <taskbar:TaskbarPinList>
        <taskbar:DesktopApp DesktopApplicationLinkPath="%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\System Tools\\File Explorer.lnk" />
      </taskbar:TaskbarPinList>
    </defaultlayout:TaskbarLayout>
  </CustomTaskbarLayoutCollection>
</LayoutModificationTemplate>'

$mdmKey = 'HKLM:\\SOFTWARE\\Microsoft\\PolicyManager\\current\\device\\Start'
New-Item $mdmKey -ItemType Directory -Force -ErrorAction SilentlyContinue | Out-Null
Set-ItemProperty $mdmKey 'ConfigureTaskbar' $xml -Type String -Force
`;
    const orderRef = { val: order };
    addBase64ScriptToSyncCmds(runSyncCmds, orderRef, taskbarPolicyScript.trim(), 'C:\\Windows\\Temp\\tbpolicy.b64', 'C:\\Windows\\Temp\\tbpolicy.ps1');
    order = orderRef.val;
  }

  // --- Windows 11 Tálcaikonok Scheduled Task (specialize fázis) ---
  if (config.showAllTrayIcons) {
    runSyncCmds.push('');
    runSyncCmds.push('        <!-- Windows 11: Scheduled Task – percenként promote-olja az összes tray ikont (Schneegans módszer) -->');
    const trayTaskScript = [
      "$taskXml = @'",
      '<?xml version="1.0" encoding="UTF-16"?>',
      '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">',
      '<Triggers><LogonTrigger><Repetition><Interval>PT1M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition><Enabled>true</Enabled></LogonTrigger></Triggers>',
      '<Principals><Principal id="Author"><GroupId>S-1-5-32-545</GroupId><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>',
      '<Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries><StopIfGoingOnBatteries>false</StopIfGoingOnBatteries><AllowHardTerminate>true</AllowHardTerminate><StartWhenAvailable>false</StartWhenAvailable><RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable><IdleSettings><StopOnIdleEnd>true</StopOnIdleEnd><RestartOnIdle>false</RestartOnIdle></IdleSettings><AllowStartOnDemand>true</AllowStartOnDemand><Enabled>true</Enabled><Hidden>false</Hidden><RunOnlyIfIdle>false</RunOnlyIfIdle><WakeToRun>false</WakeToRun><ExecutionTimeLimit>PT72H</ExecutionTimeLimit><Priority>7</Priority></Settings>',
      "<Actions Context=\"Author\"><Exec><Command>%windir%\\System32\\conhost.exe</Command><Arguments>--headless %windir%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -WindowStyle Hidden -NoProfile -NonInteractive -Command \"Set-ItemProperty -Path 'Registry::HKCU\\Control Panel\\NotifyIconSettings\\*' -Name 'IsPromoted' -Value 1 -Type 'DWord' -ErrorAction SilentlyContinue;\"</Arguments></Exec></Actions>",
      '</Task>',
      "'@",
      "Register-ScheduledTask -TaskName 'ShowAllTrayIcons' -Xml $taskXml -Force | Out-Null"
    ].join('\r\n');
    const orderRef = { val: order };
    addBase64ScriptToSyncCmds(runSyncCmds, orderRef, trayTaskScript, 'C:\\Windows\\Temp\\tray_task.b64', 'C:\\Windows\\Temp\\tray_task.ps1');
    order = orderRef.val;
  }

  lines.push('');
  lines.push(`    <component ${componentAttrs('Microsoft-Windows-Deployment')}>`);
  if (runSyncCmds.length > 0) {
    lines.push('      <RunSynchronous>');
    lines.push(...runSyncCmds);
    lines.push('      </RunSynchronous>');
  }
  lines.push('    </component>');
  lines.push('  </settings>');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// oobeSystem pass
// ---------------------------------------------------------------------------
function buildOobeSystem(config, componentAttrs, inputLocale, uiLanguage) {
  const lines = [];
  lines.push('  <!-- oobeSystem – Felhasználói fiók, OOBE és testreszabás -->');
  lines.push('  <settings pass="oobeSystem">');

  // International-Core
  const sysLocale = config.installLanguage === 'en' ? 'en-US' : 'hu-HU';
  const uiLang = config.installLanguage === 'en' ? 'en-US' : 'hu-HU';
  const userLocale = config.installLanguage === 'en' ? 'en-US' : 'hu-HU';

  lines.push(`    <component ${componentAttrs('Microsoft-Windows-International-Core')}>`);
  lines.push(`      <InputLocale>${inputLocale}</InputLocale>`);
  lines.push(`      <SystemLocale>${sysLocale}</SystemLocale>`);
  lines.push(`      <UILanguage>${uiLang}</UILanguage>`);
  lines.push(`      <UserLocale>${userLocale}</UserLocale>`);
  lines.push('    </component>');

  // Shell-Setup
  lines.push('');
  lines.push(`    <component ${componentAttrs('Microsoft-Windows-Shell-Setup')}>`);

  // OOBE
  lines.push('      <OOBE>');
  if (config.autoAcceptEula) {
    lines.push('        <HideEULAPage>true</HideEULAPage>');
  }
  if (config.bypassNetwork) {
    lines.push('        <HideOnlineAccountScreens>true</HideOnlineAccountScreens>');
  }
  lines.push('        <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>');
  lines.push('        <ProtectYourPC>3</ProtectYourPC>');
  lines.push('      </OOBE>');

  // UserAccounts
  if (config.username && config.username.trim() !== '') {
    lines.push('');
    lines.push('      <!-- Felhasználói fiók -->');
    lines.push('      <UserAccounts>');
    lines.push('        <LocalAccounts>');
    lines.push('          <LocalAccount wcm:action="add">');
    lines.push(`            <Name>${escapeXml(config.username.trim())}</Name>`);
    lines.push('            <Group>Administrators</Group>');

    lines.push('            <Password>');
    lines.push(`              <Value>${escapeXml(config.password || '')}</Value>`);
    lines.push('              <PlainText>true</PlainText>');
    lines.push('            </Password>');

    lines.push('          </LocalAccount>');
    lines.push('        </LocalAccounts>');
    lines.push('      </UserAccounts>');
  }

  // AutoLogon
  if (config.autoLogin && config.username && config.username.trim() !== '') {
    lines.push('');
    lines.push('      <!-- Automatikus bejelentkezés -->');
    lines.push('      <AutoLogon>');
    lines.push('        <Enabled>true</Enabled>');
    lines.push(`        <Username>${escapeXml(config.username.trim())}</Username>`);
    lines.push('        <Password>');
    lines.push(`          <Value>${escapeXml(config.password || '')}</Value>`);
    lines.push('          <PlainText>true</PlainText>');
    lines.push('        </Password>');
    lines.push('        <LogonCount>1</LogonCount>');
    lines.push('      </AutoLogon>');
  }

  // FirstLogonCommands
  const commands = buildFirstLogonCommands(config, uiLanguage);
  if (commands.length > 0) {
    lines.push('');
    lines.push('      <!-- Első bejelentkezéskor futó parancsok -->');
    lines.push('      <FirstLogonCommands>');
    commands.forEach((cmd, index) => {
      lines.push('        <SynchronousCommand wcm:action="add">');
      lines.push(`          <Order>${index + 1}</Order>`);
      lines.push(`          <CommandLine>${escapeXml(cmd.command)}</CommandLine>`);
      if (cmd.description) {
        lines.push(`          <Description>${escapeXml(cmd.description)}</Description>`);
      }
      lines.push('        </SynchronousCommand>');
    });
    lines.push('      </FirstLogonCommands>');
  }

  lines.push('    </component>');
  lines.push('  </settings>');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// FirstLogonCommands összeállítása
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Master FirstLogon.ps1 szkript összeállítása (Schneegans-féle módszer)
// Egyetlen PowerShell szkriptet ad vissza string-ként, vagy null-t ha nincs mit futtatni.
// ---------------------------------------------------------------------------
function buildFirstLogonScript(config, uiLanguage) {
  const sections = [];

  // --- Header: naplózás és segédfüggvények ---
  sections.push(`$ErrorActionPreference = "Continue"
$ShortLog = "C:\\InstallSummary.log"
$FullLog = "C:\\InstallFull.log"

function Write-Section($name) {
  Add-Content -Path $FullLog -Value "" -Encoding utf8
  Add-Content -Path $FullLog -Value "------------------------------------------------------------" -Encoding utf8
  Add-Content -Path $FullLog -Value "# $name" -Encoding utf8
  Add-Content -Path $FullLog -Value "------------------------------------------------------------" -Encoding utf8
}

function Write-Ok($name) {
  Add-Content -Path $ShortLog -Value "[$((Get-Date).ToString('HH:mm:ss'))] SIKERES: $name" -Encoding utf8
  Add-Content -Path $FullLog -Value "[SIKERES] $name" -Encoding utf8
}

function Write-Fail($name, $err) {
  Add-Content -Path $ShortLog -Value "[$((Get-Date).ToString('HH:mm:ss'))] HIBÁS: $name" -Encoding utf8
  Add-Content -Path $FullLog -Value "[HIBA] $name - $err" -Encoding utf8
}

function Show-PopupAsync($text,$title=""){
  $t=$text.Replace("'","''")
  $ti=$title.Replace("'","''")
  $cmd="Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList "-NoProfile -EncodedCommand $enc" | Out-Null
}

Add-Content -Path $FullLog -Value "============================================================" -Encoding utf8
Add-Content -Path $FullLog -Value "FirstLogon Master Script - $(Get-Date)" -Encoding utf8
Add-Content -Path $FullLog -Value "============================================================" -Encoding utf8
`);

  let hasAnything = false;

  // --- 1 perces globális várakozás ---
  const cs = config.customScripts || {};
  const needsWait = cs.windowsUpdate || (cs.wingetApps && cs.wingetApps !== 'none') || (cs.office && cs.office !== 'none') || cs.pcManager || cs.domainJoin;
  if (needsWait) {
    hasAnything = true;
    sections.push(`
# --- 1 perces várakozás a hálózat felállására ---
Write-Section "Várakozás (60 másodperc)"
Start-Sleep -Seconds 60
Write-Ok "Várakozás befejezve"
`);
  }

  // --- Jelszó lejáratának letiltása ---
  if (config.username) {
    hasAnything = true;
    const safeUser = config.username.trim().replace(/'/g, "''");
    sections.push(`
# --- Jelszó lejáratának letiltása ---
Write-Section "Jelszó lejáratának letiltása"
try {
  Set-LocalUser -Name '${safeUser}' -PasswordNeverExpires $true
  Write-Ok "Jelszó lejáratának letiltása"
} catch {
  Write-Fail "Jelszó lejáratának letiltása" $_.Exception.Message
}
`);
  }

  // --- Hálózat megkerülése ---
  if (config.bypassNetwork) {
    hasAnything = true;
    sections.push(`
# --- Hálózati követelmény megkerülése ---
Write-Section "Hálózati követelmény megkerülése"
try {
  reg.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\OOBE" /v BypassNRO /t REG_DWORD /d 1 /f | Out-Null
  Write-Ok "Hálózati követelmény megkerülése"
} catch {
  Write-Fail "Hálózati követelmény megkerülése" $_.Exception.Message
}
`);
  }

  // --- Wi-Fi beállítások ---
  if (config.wifi) {
    if (config.wifi.mode === 'auto' && config.wifi.ssid) {
      hasAnything = true;
      const ssid = config.wifi.ssid;
      const password = config.wifi.password;
      const utf8Encode = new TextEncoder();
      const hexSsid = Array.from(utf8Encode.encode(ssid)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
      const safeSsid = ssid.replace(/'/g, "''");
      const safePassword = (password || '').replace(/'/g, "''");

      sections.push(`
# --- Automatikus Wi-Fi csatlakozás ---
Write-Section "Wi-Fi csatlakozás: ${safeSsid}"
try {
  $wifiXml = @'
<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
    <name>${safeSsid}</name>
    <SSIDConfig>
        <SSID>
            <hex>${hexSsid}</hex>
            <name>${safeSsid}</name>
        </SSID>
    </SSIDConfig>
    <connectionType>ESS</connectionType>
    <connectionMode>auto</connectionMode>
    <MSM>
        <security>
            <authEncryption>
                <authentication>WPA2PSK</authentication>
                <encryption>AES</encryption>
                <useOneX>false</useOneX>
            </authEncryption>
            <sharedKey>
                <keyType>passPhrase</keyType>
                <protected>false</protected>
                <keyMaterial>${safePassword}</keyMaterial>
            </sharedKey>
        </security>
    </MSM>
</WLANProfile>
'@
  $wifiXml | Out-File -FilePath "$env:TEMP\\wifi_profile.xml" -Encoding utf8
  netsh wlan add profile filename="$env:TEMP\\wifi_profile.xml"
  netsh wlan connect name='${safeSsid}'
  Write-Ok "Wi-Fi csatlakozás: ${safeSsid}"
} catch {
  Write-Fail "Wi-Fi csatlakozás" $_.Exception.Message
}
`);
    } else if (config.wifi.mode === 'manual') {
      hasAnything = true;
      sections.push(`
# --- Wi-Fi hálózatok megjelenítése ---
Write-Section "Wi-Fi hálózatok listája"
Start-Process "ms-availablenetworks:" | Out-Null
Write-Ok "Wi-Fi hálózatok listája megnyitva"
`);
    }
  }

  // --- Asztali ikonok ---
  const iconMap = {
    computer:     '{20D04FE0-3AEA-1069-A2D8-08002B30309D}',
    recycleBin:   '{645FF040-5081-101B-9F08-00AA002F954E}',
    userFiles:    '{59031a47-3f72-44a7-89c5-5595fe6b30ee}',
    controlPanel: '{5399E694-6CE5-4D6C-8FCE-1D8870FDCBA0}',
    network:      '{F02C1A0D-BE21-4350-88B0-7367FC96EF3C}',
  };

  if (config.desktopIcons) {
    const iconEntries = [];
    for (const [key, clsid] of Object.entries(iconMap)) {
      if (config.desktopIcons[key]) {
        iconEntries.push(`  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel" /v ${clsid} /t REG_DWORD /d 0 /f | Out-Null`);
      }
    }
    if (iconEntries.length > 0) {
      hasAnything = true;
      sections.push(`
# --- Asztali ikonok megjelenítése ---
Write-Section "Asztali ikonok"
try {
${iconEntries.join('\n')}
  Write-Ok "Asztali ikonok beállítva"
} catch {
  Write-Fail "Asztali ikonok" $_.Exception.Message
}
`);
    }
  }

  // --- Keresőmező mód ---
  if (config.searchBoxMode && config.searchBoxMode !== 'full') {
    hasAnything = true;
    const searchModeValues = { full: 2, iconLabel: 3, iconOnly: 1, hidden: 0 };
    const value = searchModeValues[config.searchBoxMode];
    if (value !== undefined) {
      sections.push(`
# --- Keresőmező mód ---
Write-Section "Keresőmező mód"
try {
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v SearchboxTaskbarMode /t REG_DWORD /d ${value} /f | Out-Null
  Write-Ok "Keresőmező mód beállítva"
} catch {
  Write-Fail "Keresőmező mód" $_.Exception.Message
}
`);
    }
  }

  // --- Tálca ikonok elrejtése (TaskView) ---
  if (config.hideTaskbarIcons) {
    hasAnything = true;
    sections.push(`
# --- Feladatnézet gomb elrejtése ---
Write-Section "Feladatnézet gomb"
try {
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v ShowTaskViewButton /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "Feladatnézet gomb elrejtve"
} catch {
  Write-Fail "Feladatnézet gomb" $_.Exception.Message
}
`);
  }

  // --- Minden tálcaikon megjelenítése ---
  if (config.showAllTrayIcons) {
    hasAnything = true;
    sections.push(`
# --- Minden tálcaikon megjelenítése (Windows 10 kompatibilitás) ---
Write-Section "Tálca ikonok"
try {
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer" /v EnableAutoTray /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "Tálca ikonok beállítva"
} catch {
  Write-Fail "Tálca ikonok" $_.Exception.Message
}
`);
  }

  // --- Explorer újraindítása ---
  if (config.hideTaskbarIcons || (config.searchBoxMode && config.searchBoxMode !== 'full') || config.showAllTrayIcons) {
    sections.push(`
# --- Explorer újraindítása a tálca frissítéséhez ---
try {
  Get-Process -Name "explorer" -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq (Get-Process -Id $PID).SessionId } | Stop-Process -Force
  Start-Sleep -Seconds 2
  Start-Process "explorer.exe"
  Write-Ok "Explorer újraindítva"
} catch {
  Write-Fail "Explorer újraindítás" $_.Exception.Message
}
`);
  }

  // --- Átlátszóság kikapcsolása ---
  if (config.disableTransparency) {
    hasAnything = true;
    sections.push(`
# --- Átlátszóság kikapcsolása ---
Write-Section "Átlátszóság"
try {
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v EnableTransparency /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "Átlátszóság kikapcsolva"
} catch {
  Write-Fail "Átlátszóság" $_.Exception.Message
}
`);
  }

  // --- Start menü: legutóbbi alkalmazások elrejtése ---
  if (config.hideRecentApps) {
    hasAnything = true;
    sections.push(`
# --- Legutóbbi alkalmazások elrejtése ---
Write-Section "Legutóbbi alkalmazások"
try {
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Start" /v ShowRecentList /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "Legutóbbi alkalmazások elrejtve"
} catch {
  Write-Fail "Legutóbbi alkalmazások" $_.Exception.Message
}
`);
  }

  // --- Start menü: leggyakrabban használt alkalmazások elrejtése ---
  if (config.hideMostUsedApps) {
    hasAnything = true;
    sections.push(`
# --- Leggyakrabban használt alkalmazások elrejtése ---
Write-Section "Leggyakrabban használt alkalmazások"
try {
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Start" /v ShowFrequentList /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "Leggyakrabban használt alkalmazások elrejtve"
} catch {
  Write-Fail "Leggyakrabban használt alkalmazások" $_.Exception.Message
}
`);
  }

  // --- Start menü: ajánlott fájlok elrejtése ---
  if (config.hideRecommendedFiles) {
    hasAnything = true;
    sections.push(`
# --- Ajánlott fájlok elrejtése ---
Write-Section "Ajánlott fájlok"
try {
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v Start_TrackDocs /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "Ajánlott fájlok elrejtve"
} catch {
  Write-Fail "Ajánlott fájlok" $_.Exception.Message
}
`);
  }

  // --- Tippek és javaslatok kikapcsolása ---
  if (config.hideTipsAndSuggestions) {
    hasAnything = true;
    sections.push(`
# --- Tippek és javaslatok kikapcsolása ---
Write-Section "Tippek és javaslatok"
try {
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338388Enabled /t REG_DWORD /d 0 /f | Out-Null
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338389Enabled /t REG_DWORD /d 0 /f | Out-Null
  reg.exe add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338393Enabled /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "Tippek és javaslatok kikapcsolva"
} catch {
  Write-Fail "Tippek és javaslatok" $_.Exception.Message
}
`);
  }

  // --- Webes keresés letiltása ---
  if (config.disableWebSearch) {
    hasAnything = true;
    sections.push(`
# --- Webes keresés letiltása ---
Write-Section "Webes keresés"
try {
  reg.exe add "HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableSearchBoxSuggestions /t REG_DWORD /d 1 /f | Out-Null
  Write-Ok "Webes keresés letiltva"
} catch {
  Write-Fail "Webes keresés" $_.Exception.Message
}
`);
  }

  // --- Telemetria letiltása ---
  if (config.disableTelemetry) {
    hasAnything = true;
    sections.push(`
# --- Telemetria letiltása ---
Write-Section "Telemetria"
try {
  reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f | Out-Null
  reg.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "Telemetria letiltva"
} catch {
  Write-Fail "Telemetria" $_.Exception.Message
}
`);
  }

  // --- UAC Kikapcsolása ---
  if (config.disableUAC) {
    hasAnything = true;
    sections.push(`
# --- UAC kikapcsolása ---
Write-Section "UAC"
try {
  reg.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v ConsentPromptBehaviorAdmin /t REG_DWORD /d 0 /f | Out-Null
  reg.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v PromptOnSecureDesktop /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "UAC kikapcsolva"
} catch {
  Write-Fail "UAC" $_.Exception.Message
}
`);
  }

  // --- Edge első indítás letiltása ---
  if (config.disableEdgeFirstRun) {
    hasAnything = true;
    sections.push(`
# --- Edge első indítási képernyő letiltása ---
Write-Section "Edge FirstRun"
try {
  reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HideFirstRunExperience /t REG_DWORD /d 1 /f | Out-Null
  Write-Ok "Edge FirstRun letiltva"
} catch {
  Write-Fail "Edge FirstRun" $_.Exception.Message
}
`);
  }

  // --- Gyorsindítás kikapcsolása ---
  if (config.disableFastStartup) {
    hasAnything = true;
    sections.push(`
# --- Gyorsindítás kikapcsolása ---
Write-Section "Gyorsindítás"
try {
  reg.exe add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f | Out-Null
  Write-Ok "Gyorsindítás kikapcsolva"
} catch {
  Write-Fail "Gyorsindítás" $_.Exception.Message
}
`);
  }

  // --- Bloatware eltávolítása ---
  const bloatwarePackages = {
    todo: 'Microsoft.Todos',
    experiencesApp: 'MicrosoftWindows.CrossDevice',
    stickyNotes: 'Microsoft.MicrosoftStickyNotes',
    quickAssist: 'MicrosoftCorporationII.QuickAssist',
    weather: 'Microsoft.BingWeather',
    camera: 'Microsoft.WindowsCamera',
    bingNews: 'Microsoft.BingNews Microsoft.BingSearch',
    clipchamp: 'Clipchamp.Clipchamp',
    clock: 'Microsoft.WindowsAlarms',
    outlook: 'Microsoft.OutlookForWindows',
    powerAutomate: 'Microsoft.PowerAutomateDesktop',
    solitaire: 'Microsoft.MicrosoftSolitaireCollection',
    terminal: 'Microsoft.WindowsTerminal',
    feedbackHub: 'Microsoft.WindowsFeedbackHub',
  };

  if (config.bloatware) {
    const pkgList = [];
    for (const [key, packageName] of Object.entries(bloatwarePackages)) {
      if (config.bloatware[key]) {
        const packages = packageName.split(' ');
        for (const pkg of packages) {
          pkgList.push(pkg);
        }
      }
    }
    if (pkgList.length > 0) {
      hasAnything = true;
      const pkgArray = pkgList.map(p => `  '${p}'`).join(',\n');
      sections.push(`
# --- Bloatware eltávolítása ---
Write-Section "Bloatware eltávolítása"
$bloatPackages = @(
${pkgArray}
)
foreach ($pkg in $bloatPackages) {
  try {
    Get-AppxPackage -AllUsers "*$pkg*" -ErrorAction SilentlyContinue | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue
    Get-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue | Where-Object { $_.PackageName -like "*$pkg*" } | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue
    Add-Content -Path $FullLog -Value "  Eltávolítva: $pkg" -Encoding utf8
  } catch {
    Add-Content -Path $FullLog -Value "  Hiba: $pkg - $($_.Exception.Message)" -Encoding utf8
  }
}
Write-Ok "Bloatware eltávolítás kész"
`);
    }
  }

  // --- Egyéni Szkriptek ---
  if (config.customScripts) {
    // Winget Apps
    if (config.customScripts.wingetApps === 'versionA') {
      hasAnything = true;
      let scriptA = SCRIPTS.wingetAppsA;
      if (config.partitioning?.mode !== 'auto') {
        scriptA = scriptA.replace(
          '@{Id="Ghisler.TotalCommander";Source="winget"}',
          '@{Id="Ghisler.TotalCommander";Source="winget";Override="/A D:\\\\Apps\\\\TotalCommander"}'
        ).replace(
          '$apps=@(',
          'if(-not (Test-Path "D:\\\\Apps\\\\TotalCommander")){ New-Item -ItemType Directory -Path "D:\\\\Apps\\\\TotalCommander" -Force | Out-Null }\n$apps=@('
        );
      }
      sections.push(`
# --- Winget Appok (A verzió) ---
Write-Section "Winget Appok telepítése (A verzió)"
try {
${scriptA}
  Write-Ok "Winget Appok telepítése (A verzió)"
} catch {
  Write-Fail "Winget Appok telepítése (A verzió)" $_.Exception.Message
}
`);
    } else if (config.customScripts.wingetApps === 'versionB') {
      hasAnything = true;
      let scriptB = SCRIPTS.wingetAppsB;
      if (config.partitioning?.mode !== 'auto') {
        scriptB = scriptB.replace(
          '$apps=@(',
          'if(-not (Test-Path "D:\\\\Apps\\\\VLC")){ New-Item -ItemType Directory -Path "D:\\\\Apps\\\\VLC" -Force | Out-Null }\nNew-Item -Path "HKLM:\\\\SOFTWARE\\\\VideoLAN\\\\VLC" -Force | Out-Null\nSet-ItemProperty -Path "HKLM:\\\\SOFTWARE\\\\VideoLAN\\\\VLC" -Name "InstallDir" -Value "D:\\\\Apps\\\\VLC" -Force | Out-Null\nNew-Item -Path "HKLM:\\\\SOFTWARE\\\\WOW6432Node\\\\VideoLAN\\\\VLC" -Force | Out-Null\nSet-ItemProperty -Path "HKLM:\\\\SOFTWARE\\\\WOW6432Node\\\\VideoLAN\\\\VLC" -Name "InstallDir" -Value "D:\\\\Apps\\\\VLC" -Force | Out-Null\n$apps=@('
        );
      }
      sections.push(`
# --- Winget Appok (B verzió) ---
Write-Section "Winget Appok telepítése (B verzió)"
try {
${scriptB}
  Write-Ok "Winget Appok telepítése (B verzió)"
} catch {
  Write-Fail "Winget Appok telepítése (B verzió)" $_.Exception.Message
}
`);
    } else if (config.customScripts.wingetApps === 'custom' && Array.isArray(config.customScripts.wingetCustomApps) && config.customScripts.wingetCustomApps.length > 0) {
      hasAnything = true;
      const selectedApps = config.customScripts.wingetCustomApps;
      
      const appsScriptList = selectedApps.map(userApp => {
        const appInfo = WINGET_APPS.find(a => a.id === userApp.id) || { source: 'winget' };
        let parts = [`@{Id='${userApp.id}';Source='${appInfo.source}'`];
        
        let overrideParts = [];
        if (appInfo.override) {
          overrideParts.push(appInfo.override);
        }
        
        if (config.partitioning?.mode !== 'auto' && userApp.location && userApp.location.trim() !== '') {
          const safeLoc = userApp.location.trim();
          if (appInfo.useOverride) {
            const sep = appInfo.useOverride.endsWith(' ') ? '' : '=';
            overrideParts.push(`${appInfo.useOverride}${sep}${safeLoc}`);
          } else {
            parts.push(`Location='${safeLoc.replace(/'/g, "''")}'`);
          }
        }
        
        if (overrideParts.length > 0) {
          parts.push(`Override='${overrideParts.join(' ').replace(/'/g, "''")}'`);
        }
        
        parts.push(`}`);
        return parts.join(';');
      }).join(',\n  ');

      const hasSteam = selectedApps.some(a => a.id === 'Valve.Steam');
      const hasDiscord = selectedApps.some(a => a.id === 'Discord.Discord');
      const hasVlc = selectedApps.some(a => a.id === 'VideoLAN.VLC');

      const customDirsList = selectedApps
        .filter(a => config.partitioning?.mode !== 'auto' && a.location && a.location.trim() !== '')
        .map(a => `'${a.location.trim().replace(/'/g, "''")}'`)
        .join(',\n  ');

      let vlcHook = '';
      if (config.partitioning?.mode !== 'auto' && hasVlc) {
        vlcHook = `
if(-not (Test-Path "D:\\\\Apps\\\\VLC")){ New-Item -ItemType Directory -Path "D:\\\\Apps\\\\VLC" -Force | Out-Null }
New-Item -Path "HKLM:\\\\SOFTWARE\\\\VideoLAN\\\\VLC" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\\\\SOFTWARE\\\\VideoLAN\\\\VLC" -Name "InstallDir" -Value "D:\\\\Apps\\\\VLC" -Force | Out-Null
New-Item -Path "HKLM:\\\\SOFTWARE\\\\WOW6432Node\\\\VideoLAN\\\\VLC" -Force | Out-Null
Set-ItemProperty -Path "HKLM:\\\\SOFTWARE\\\\WOW6432Node\\\\VideoLAN\\\\VLC" -Name "InstallDir" -Value "D:\\\\Apps\\\\VLC" -Force | Out-Null
`;
      }

      const wingetScript = `$ErrorActionPreference="Stop"
$ProgressPreference="SilentlyContinue"

function Wait-ForWinget {
  $maxAttempts = 60
  $attempt = 0
  while (-not (Get-Command winget.exe -ErrorAction SilentlyContinue) -and $attempt -lt $maxAttempts) {
    try { Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction SilentlyContinue } catch {}
    Start-Sleep -Seconds 5
    $attempt++
  }
  if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    Show-PopupAsync "Az Appok telepítése során hiba lépett fel (Winget nem található)!" "Telepítés"
    throw "Winget nem található!"
  }
}

Wait-ForWinget

$customDirs=@(
  ${customDirsList}
)
foreach($dir in $customDirs){
  if(-not (Test-Path $dir)){
    New-Item -ItemType Directory -Path $dir | Out-Null
  }
}
${vlcHook}
$apps=@(
  ${appsScriptList}
)

$ok=$true
$timeoutSec=600
foreach($a in $apps){
  $installArgs=@("install","-e","--id",$a.Id,"-h","--accept-package-agreements","--accept-source-agreements","--source",$a.Source)
  if($a.Location){
    $installArgs+=("--location",$a.Location)
  }
  if($a.Override){
    $installArgs+=("--override", ('"' + $a.Override + '"'))
  }
  $logLine = "Installing $($a.Id)... "
  $p=Start-Process -FilePath "winget.exe" -ArgumentList $installArgs -PassThru -WindowStyle Hidden
  if(-not $p.WaitForExit($timeoutSec*1000)){
    try{$p.Kill()}catch{}
    $ok=$false
    $logLine += "TIMEOUT!"
    Add-Content -Path $FullLog -Value "    $logLine" -Encoding utf8
    continue
  }
  $logLine += "ExitCode: $($p.ExitCode)"
  Add-Content -Path $FullLog -Value "    $logLine" -Encoding utf8
  $validExitCodes = @(0, 3010, 1641, 1638, -1978335228, -1978335215, -1978335231, -1978335189)
  if($validExitCodes -notcontains $p.ExitCode){
    $ok=$false
  }
}

${hasSteam ? 'Remove-ItemProperty -Path "HKCU:\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run" -Name "Steam" -ErrorAction SilentlyContinue' : ''}
${hasDiscord ? 'Remove-ItemProperty -Path "HKCU:\\\\SOFTWARE\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Run" -Name "Discord" -ErrorAction SilentlyContinue' : ''}

if($ok){
  Show-PopupAsync "Az Appok telepítése sikeresen megtörtént!" "Telepítés"
}else{
  Show-PopupAsync "Az Appok telepítése során hiba lépett fel!\`nRészletek: C:\\\\InstallFull.log" "Telepítés"
  throw "Winget telepítési hiba!"
}`;

      sections.push(`
# --- Winget Appok (Egyéni) ---
Write-Section "Winget Appok telepítése (Egyéni)"
try {
${wingetScript}
  Write-Ok "Winget Appok telepítése (Egyéni)"
} catch {
  Write-Fail "Winget Appok telepítése (Egyéni)" $_.Exception.Message
}
`);
    }

    // Office
    if (config.customScripts.office === 'versionA') {
      hasAnything = true;
      const officeScript = SCRIPTS.officeA.replace('##OFFICE_LANG##', uiLanguage === 'en' ? 'en-us' : 'hu-hu');
      sections.push(`
# --- Office telepítése (A verzió) ---
Write-Section "Office telepítése (A verzió)"
try {
${officeScript}
  Write-Ok "Office telepítése (A verzió)"
} catch {
  Write-Fail "Office telepítése (A verzió)" $_.Exception.Message
}
`);
    } else if (config.customScripts.office === 'versionB') {
      hasAnything = true;
      const officeScript = SCRIPTS.officeB
        .replace('##OFFICE_MAK_KEY##', config.customScripts.officeKey || '')
        .replace('##OFFICE_LANG##', uiLanguage === 'en' ? 'en-us' : 'hu-hu');
      sections.push(`
# --- Office telepítése (B verzió) ---
Write-Section "Office telepítése (B verzió)"
try {
${officeScript}
  Write-Ok "Office telepítése (B verzió)"
} catch {
  Write-Fail "Office telepítése (B verzió)" $_.Exception.Message
}
`);
    }

    // PC Manager
    if (config.customScripts.pcManager) {
      hasAnything = true;
      sections.push(`
# --- PC Manager telepítése ---
Write-Section "PC Manager telepítése"
try {
${SCRIPTS.pcManager}
  Write-Ok "PC Manager telepítése"
} catch {
  Write-Fail "PC Manager telepítése" $_.Exception.Message
}
`);
    }

    // Domain Join
    if (config.customScripts.domainJoin) {
      hasAnything = true;
      const djScript = SCRIPTS.domainJoin
        .replace('##DOMAIN_NAME##', (config.customScripts.domainName || '').replace(/'/g, "''"))
        .replace('##DOMAIN_USER##', (config.customScripts.domainUser || '').replace(/'/g, "''"))
        .replace('##DOMAIN_PASS##', (config.customScripts.domainPass || '').replace(/'/g, "''"));
      sections.push(`
# --- Tartományba léptetés ---
Write-Section "Active Directory Tartományba léptetés"
try {
${djScript}
  Write-Ok "Active Directory Tartományba léptetés"
} catch {
  Write-Fail "Active Directory Tartományba léptetés" $_.Exception.Message
}
`);
    }

    // Windows Update (Utolsóként a takarítás előtt)
    if (config.customScripts.windowsUpdate) {
      hasAnything = true;
      sections.push(`
# --- Windows Update ---
Write-Section "Windows Update interaktív keresés"
try {
${SCRIPTS.windowsUpdate}
  Write-Ok "Windows Update interaktív keresés"
} catch {
  Write-Fail "Windows Update" $_.Exception.Message
}
`);
    }
  }

  // --- Végső takarítás ---
  sections.push(`
# --- Végső takarítás ---
Write-Section "Végső takarítás"
try {
  Remove-Item -Path C:\\Windows\\Temp\\* -Recurse -Force -ErrorAction SilentlyContinue
  Write-Ok "Végső takarítás kész"
} catch {
  Write-Fail "Végső takarítás" $_.Exception.Message
}

Add-Content -Path $FullLog -Value "" -Encoding utf8
Add-Content -Path $FullLog -Value "============================================================" -Encoding utf8
Add-Content -Path $FullLog -Value "FirstLogon Master Script BEFEJEZVE - $(Get-Date)" -Encoding utf8
Add-Content -Path $FullLog -Value "============================================================" -Encoding utf8
`);

  // Ha semmilyen értelmes tartalom nem volt (csak header + takarítás), ne generáljuk
  if (!hasAnything) return null;

  return sections.join('\n');
}
