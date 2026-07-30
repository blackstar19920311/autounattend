import { SCRIPTS } from './customScripts.js';
import { WINGET_APPS } from '../data/wingetAppsList.js';
import { SCHNEEGANS_SCRIPTS } from '../data/schneegansScripts.js';

/**
 * Windows 11 autounattend.xml generátor - HIBRID SCHNEEGANS MÓDSZER
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
 * Kódol egy stringet Base64-be (UTF-8) BOM nélkül
 */
function getBase64NoBom(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

/**
 * Kódol egy stringet Base64-be (UTF-16LE) BOM-al (Registry és VBScript számára)
 */
function getBase64Utf16(str) {
  const bom = Buffer.from([0xff, 0xfe]);
  const utf16le = Buffer.from(str, 'utf16le');
  return Buffer.concat([bom, utf16le]).toString('base64');
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

  if (config.productKey && String(config.productKey).trim() !== '') {
    lines.push('        <ProductKey>');
    lines.push(`          <Key>${escapeXml(String(config.productKey).trim())}</Key>`);
    lines.push('        </ProductKey>');
  } else {
    lines.push('        <ProductKey>');
    lines.push('          <Key>VK7JG-NPHTM-C97JM-9MPGT-3V66T</Key>');
    lines.push('        </ProductKey>');
  }

  lines.push(`        <AcceptEula>${config.autoAcceptEula ? 'true' : 'false'}</AcceptEula>`);
  lines.push('      </UserData>');

  const runSyncCmds = [];
  let order = 1;

  // --- Hardverkövetelmények megkerülése (winPE fázisban kell!) ---
  if (config.bypassHardware) {
    runSyncCmds.push('');
    runSyncCmds.push('        <!-- Hardverkövetelmények megkerülése -->');
    const bypassChecks = [
      'BypassTPMCheck', 'BypassSecureBootCheck', 'BypassRAMCheck',
      'BypassStorageCheck', 'BypassCPUCheck',
    ];
    for (const key of bypassChecks) {
      runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
      runSyncCmds.push(`          <Order>${order++}</Order>`);
      runSyncCmds.push(`          <Path>reg add HKLM\\SYSTEM\\Setup\\LabConfig /v ${key} /t REG_DWORD /d 1 /f</Path>`);
      runSyncCmds.push('        </RunSynchronousCommand>');
    }
  }

  // --- Particionálás ---
  if (config.partitioning && config.partitioning.enabled) {
    const diskId = parseInt(config.partitioning.diskNumber || 0, 10);

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

        runSyncCmds.push('');
        runSyncCmds.push('        <!-- Csak C meghajtó (auto) DISKPART parancsok végrehajtása (Teljes formázás) -->');
        
        for (let i = 0; i < scriptLines.length; i++) {
          const redirect = i === 0 ? '>' : '>>';
          const cmd = `cmd /c ${redirect}X:\\diskpart.txt echo ${scriptLines[i].replace(/[&|<>^]/g, '^$&')}`;
          runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
          runSyncCmds.push(`          <Order>${order++}</Order>`);
          runSyncCmds.push(`          <Path>${escapeXml(cmd)}</Path>`);
          runSyncCmds.push('        </RunSynchronousCommand>');
        }
        
        runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
        runSyncCmds.push(`          <Order>${order++}</Order>`);
        runSyncCmds.push('          <Description>DISKPART szkript futtatása (Csak C:)</Description>');
        runSyncCmds.push('          <Path>diskpart /s X:\\diskpart.txt</Path>');
        runSyncCmds.push('        </RunSynchronousCommand>');

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

      runSyncCmds.push('');
      runSyncCmds.push('        <!-- C és D meghajtó (autocd) DISKPART parancsok végrehajtása -->');
      
      for (let i = 0; i < scriptLines.length; i++) {
        const redirect = i === 0 ? '>' : '>>';
        const cmd = `cmd /c ${redirect}X:\\diskpart.txt echo ${scriptLines[i].replace(/[&|<>^]/g, '^$&')}`;
        runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
        runSyncCmds.push(`          <Order>${order++}</Order>`);
        runSyncCmds.push(`          <Path>${escapeXml(cmd)}</Path>`);
        runSyncCmds.push('        </RunSynchronousCommand>');
      }
      
      runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
      runSyncCmds.push(`          <Order>${order++}</Order>`);
      runSyncCmds.push('          <Description>DISKPART szkript futtatása (C: és D:)</Description>');
      runSyncCmds.push('          <Path>diskpart /s X:\\diskpart.txt</Path>');
      runSyncCmds.push('        </RunSynchronousCommand>');

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
      const script = String(config.partitioning.customDiskpartScript || '').trim();

      if (script) {
        const scriptLines = script.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        runSyncCmds.push('');
        runSyncCmds.push('        <!-- Egyéni DISKPART parancsok végrehajtása -->');
        
        for (let i = 0; i < scriptLines.length; i++) {
          const redirect = i === 0 ? '>' : '>>';
          // Itt nincsenek zárójelek, ezért a cmd /c probléma nélkül kezeli az idézőjeleket
          const cmd = `cmd /c ${redirect}X:\\diskpart.txt echo ${scriptLines[i].replace(/[&|<>^]/g, '^$&')}`;
          runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
          runSyncCmds.push(`          <Order>${order++}</Order>`);
          runSyncCmds.push(`          <Path>${escapeXml(cmd)}</Path>`);
          runSyncCmds.push('        </RunSynchronousCommand>');
        }
        
        runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
        runSyncCmds.push(`          <Order>${order++}</Order>`);
        runSyncCmds.push('          <Description>DISKPART szkript futtatása</Description>');
        runSyncCmds.push('          <Path>diskpart /s X:\\diskpart.txt</Path>');
        runSyncCmds.push('        </RunSynchronousCommand>');
      }

      const installPartition = parseInt(config.partitioning.installPartitionId || 3, 10);
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

  if (runSyncCmds.length > 0) {
    lines.push('');
    lines.push('      <RunSynchronous>');
    runSyncCmds.forEach(cmd => lines.push(cmd));
    lines.push('      </RunSynchronous>');
  }

  lines.push('    </component>');

  lines.push('  </settings>');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// specialize pass
// ---------------------------------------------------------------------------
function buildSpecialize(config, componentAttrs, addFile) {
  const lines = [];
  lines.push('  <!-- specialize – Számítógépnév, fájlkibontás és hardver-megkerülés -->');
  lines.push('  <settings pass="specialize">');

  const prefix = String(config.computerName || 'PC').trim();
  const useRandom = config.randomSuffix !== false;

  // Shell-Setup — ComputerName
  lines.push(`    <component ${componentAttrs('Microsoft-Windows-Shell-Setup')}>`);
  if (useRandom) {
    lines.push('      <ComputerName>TEMPNAME</ComputerName>');
  } else {
    lines.push(`      <ComputerName>${escapeXml(prefix)}</ComputerName>`);
  }
  lines.push('    </component>');

  let order = 1;
  const runSyncCmds = [];

  // 1. EXTRACT SCRIPTS (A Schneegans mágia)
  runSyncCmds.push('        <!-- Fájlok kicsomagolása a C:\Windows\Setup\Scripts mappába -->');
  runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
  runSyncCmds.push(`          <Order>${order++}</Order>`);
  runSyncCmds.push('          <Path>powershell.exe -WindowStyle Hidden -NoProfile -Command "$xml = [xml]::new(); $xml.Load(\'C:\\Windows\\Panther\\unattend.xml\'); $sb = [scriptblock]::Create( $xml.unattend.Extensions.ExtractScript ); Invoke-Command -ScriptBlock $sb -ArgumentList $xml;"</Path>');
  runSyncCmds.push('        </RunSynchronousCommand>');

  // 2. Specialize.ps1 futtatása
  let specializeScript = `$ErrorActionPreference = 'Stop';\n`;
  
  if (useRandom) {
    specializeScript += `
$letters = -join (1..2 | ForEach-Object { [char](Get-Random -Minimum 65 -Maximum 91) })
$digits = '{0:D2}' -f (Get-Random -Minimum 0 -Maximum 100)
$safePrefix = '${prefix.replace(/\r?\n|\r/g, '').replace(/'/g, "''")}'
$newName = $safePrefix + '-' + $letters + $digits
Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ComputerName' 'ComputerName' $newName -Force
Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ActiveComputerName' 'ComputerName' $newName -Force
Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters' 'Hostname' $newName -Force
Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters' 'NV Hostname' $newName -Force
`;
  }

  // Jelszó lejárati idő tiltása
  specializeScript += `net.exe accounts /maxpwage:UNLIMITED;\n`;

  // Bitlocker Device Encryption tiltása
  if (config.preventDeviceEncryption) {
    specializeScript += `reg.exe add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\BitLocker" /v "PreventDeviceEncryption" /t REG_DWORD /d 1 /f;\n`;
  }

  // Hosszú fájlnevek engedélyezése
  if (config.enableLongPaths) {
    specializeScript += `reg.exe add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f;\n`;
  }

  if (config.disableUAC) {
    specializeScript += `reg.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" /v EnableLUA /t REG_DWORD /d 0 /f;\n`;
  }

  if (config.disableSleep) {
    specializeScript += `
$out = powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
if ($out -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
    powercfg -setactive $matches[1]
}
powercfg /change standby-timeout-ac 0
powercfg /change standby-timeout-dc 0
powercfg /change monitor-timeout-ac 0
powercfg /change monitor-timeout-dc 0
`;
  }

  if (config.bypassNetwork) {
    specializeScript += `reg.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\OOBE" /v BypassNRO /t REG_DWORD /d 1 /f;\n`;
  }
  
  if (config.disableTelemetry) {
    specializeScript += `
reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f;
reg.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" /v AllowTelemetry /t REG_DWORD /d 0 /f;
`;
  }

  if (config.disableFastStartup) {
    specializeScript += `reg.exe add "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" /v HiberbootEnabled /t REG_DWORD /d 0 /f;\n`;
  }

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

  const bloatwareNames = {
    todo: 'Microsoft To Do',
    experiencesApp: 'Cross Device',
    stickyNotes: 'Sticky Notes',
    quickAssist: 'Quick Assist',
    weather: 'Időjárás',
    camera: 'Kamera',
    bingNews: 'Bing Hírek',
    clipchamp: 'Clipchamp',
    clock: 'Óra és ébresztők',
    outlook: 'Új Outlook',
    powerAutomate: 'Power Automate',
    solitaire: 'Solitaire Collection',
    terminal: 'Windows Terminal',
    feedbackHub: 'Visszajelzési központ',
  };

  // UWP Bloatware irtás a webes űrlap alapján
  let bloatScript = `$ErrorActionPreference = 'SilentlyContinue';\n`;
  let hasBloatware = false;
  
  if (config.bloatware) {
    for (const [key, packageName] of Object.entries(bloatwarePackages)) {
      if (config.bloatware[key]) {
        hasBloatware = true;
        const packages = packageName.split(' ');
        for (const pkg of packages) {
          bloatScript += `Write-Host "${bloatwareNames[key]} eltávolítása (${pkg})...";\n`;
          bloatScript += `Get-AppxProvisionedPackage -Online | Where-Object {$_.PackageName -like '*${pkg}*'} | Remove-AppxProvisionedPackage -Online -AllUsers;\n`;
        }
      }
    }
  }

  if (hasBloatware) {
    addFile('C:\\Windows\\Setup\\Scripts\\RemovePackages.ps1', bloatScript);
    specializeScript += `& 'C:\\Windows\\Setup\\Scripts\\RemovePackages.ps1';\n`;
  }

  // Lemaradt Registry beállítások pótlása
  if (config.disableNewsAndInterests) {
    specializeScript += `reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh" /v AllowNewsAndInterests /t REG_DWORD /d 0 /f;\n`;
  }
  if (config.disableEdgeDesktopShortcut) {
    specializeScript += `reg.exe add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer" /v DisableEdgeDesktopShortcutCreation /t REG_DWORD /d 1 /f;\n`;
  }
  if (config.disableConsumerFeatures) {
    specializeScript += `reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableWindowsConsumerFeatures /t REG_DWORD /d 1 /f;\n`;
  }
  if (config.disableBackgroundApps) {
    specializeScript += `reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy" /v LetAppsRunInBackground /t REG_DWORD /d 2 /f;\n`;
  }

  if (config.disableEdgeFirstRun) {
    specializeScript += `reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge" /v HideFirstRunExperience /t REG_DWORD /d 1 /f;\n`;
  }

  // Wi-Fi beállítása
  if (config.wifi && config.wifi.mode === 'auto' && config.wifi.ssid) {
    const ssid = config.wifi.ssid;
    const password = config.wifi.password;
    const utf8Encode = new TextEncoder();
    const hexSsid = Array.from(utf8Encode.encode(ssid)).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
    const safeSsid = escapeXml(ssid);
    const safePassword = escapeXml(password);
    
    const wifiXml = `<?xml version="1.0"?>
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
</WLANProfile>`;
    addFile('C:\\Windows\\Setup\\Scripts\\Wifi.xml', wifiXml);
    specializeScript += `netsh.exe wlan add profile filename="C:\\Windows\\Setup\\Scripts\\Wifi.xml" user=all;\n`;
    specializeScript += `Start-Sleep -Seconds 2;\n`;
    specializeScript += `netsh.exe wlan connect name="${safeSsid}";\n`;
  }

  // Start Menü ürítése házirenddel
  if (config.hideTaskbarIcons) {
    specializeScript += `reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" /v "ConfigureStartPins" /t REG_SZ /d '{"pinnedList":[]}' /f;\n`;
    specializeScript += `reg.exe add "HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Explorer" /v "NoPinningStoreToTaskbar" /t REG_DWORD /d 1 /f;\n`;
    
    // UnlockStartLayout Ütemezett feladat
    addFile('C:\\Windows\\Setup\\Scripts\\UnlockStartLayout.vbs', SCHNEEGANS_SCRIPTS.unlockStartLayoutVbs);
    addFile('C:\\Windows\\Setup\\Scripts\\UnlockStartLayout.xml', SCHNEEGANS_SCRIPTS.unlockStartLayoutXml);
    specializeScript += `schtasks.exe /create /tn "UnlockStartLayout" /xml "C:\\Windows\\Setup\\Scripts\\UnlockStartLayout.xml" /f;\n`;
  }

  if (config.showAllTrayIcons) {
    addFile('C:\\Windows\\Setup\\Scripts\\ShowAllTrayIcons.vbs', SCHNEEGANS_SCRIPTS.showAllTrayIconsVbs);
    addFile('C:\\Windows\\Setup\\Scripts\\ShowAllTrayIcons.xml', SCHNEEGANS_SCRIPTS.showAllTrayIconsXml);
    specializeScript += `schtasks.exe /create /tn "ShowAllTrayIcons" /xml "C:\\Windows\\Setup\\Scripts\\ShowAllTrayIcons.xml" /f;\n`;
  }

  addFile('C:\\Windows\\Setup\\Scripts\\Specialize.ps1', specializeScript);
  
  runSyncCmds.push('        <!-- Specialize szkript futtatása -->');
  runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
  runSyncCmds.push(`          <Order>${order++}</Order>`);
  runSyncCmds.push('          <Path>powershell.exe -WindowStyle Hidden -NoProfile -Command "Invoke-ExecutionPolicyBypass -CommandFile \'C:\\Windows\\Setup\\Scripts\\Specialize.ps1\'"</Path>');
  runSyncCmds.push('        </RunSynchronousCommand>');

  // 3. Default User Profil módosítása
  let defaultUserScript = `$ErrorActionPreference = 'Stop';\n`;
  if (config.disableCopilot) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" /v TurnOffWindowsCopilot /t REG_DWORD /d 1 /f;\n`;
  }
  if (config.disableWebSearch) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Policies\\Microsoft\\Windows\\Explorer" /v DisableSearchBoxSuggestions /t REG_DWORD /d 1 /f;\n`;
  }
  if (config.disableGameDVR) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\System\\GameConfigStore" /v GameDVR_Enabled /t REG_DWORD /d 0 /f;\n`;
  }

  if (config.disableMouseAcceleration) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Control Panel\\Mouse" /v MouseSpeed /t REG_SZ /d 0 /f;\n`;
  }
  if (config.explorerToThisPC) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v LaunchTo /t REG_DWORD /d 1 /f;\n`;
  }
  if (config.showHiddenFiles) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v Hidden /t REG_DWORD /d 1 /f;\n`;
  }
  if (config.showFileExtensions) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v HideFileExt /t REG_DWORD /d 0 /f;\n`;
  }

  // További Vizuális és Start menü Tweak-ek az eredeti kódból
  if (config.hideRecentApps) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\Start" /v ShowRecentList /t REG_DWORD /d 0 /f;\n`;
  }
  if (config.hideMostUsedApps) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\Start" /v ShowFrequentList /t REG_DWORD /d 0 /f;\n`;
  }
  if (config.hideRecommendedFiles) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" /v Start_TrackDocs /t REG_DWORD /d 0 /f;\n`;
  }
  if (config.searchBoxMode) {
    const searchModeValues = { full: 2, iconLabel: 3, iconOnly: 1, hidden: 0 };
    const value = searchModeValues[config.searchBoxMode];
    if (value !== undefined) {
      defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" /v SearchboxTaskbarMode /t REG_DWORD /d ${value} /f;\n`;
    }
  }
  if (config.disableTransparency) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v EnableTransparency /t REG_DWORD /d 0 /f;\n`;
  }
  if (config.hideTipsAndSuggestions) {
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338388Enabled /t REG_DWORD /d 0 /f;\n`;
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338389Enabled /t REG_DWORD /d 0 /f;\n`;
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" /v SubscribedContent-338393Enabled /t REG_DWORD /d 0 /f;\n`;
    defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Policies\\Microsoft\\Windows\\CloudContent" /v DisableSoftLanding /t REG_DWORD /d 1 /f;\n`;
  }
  if (config.desktopIcons) {
    const iconMap = {
      computer: '{20D04FE0-3AEA-1069-A2D8-08002B30309D}',
      userFiles: '{59031a47-3f72-44a7-89c5-5595fe6b30ee}',
      network: '{F02C1A0D-BE21-4350-88B0-7367FC96EF3C}',
      recycleBin: '{645FF040-5081-101B-9F08-00AA002F954E}',
      controlPanel: '{5399E694-6CE5-4D6C-8FCE-1D8870FDCBA0}'
    };
    for (const [key, clsid] of Object.entries(iconMap)) {
      if (config.desktopIcons[key]) {
        defaultUserScript += `reg.exe add "HKU\\DefaultUser\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel" /v "${clsid}" /t REG_DWORD /d 0 /f;\n`;
      }
    }
  }

  addFile('C:\\Windows\\Setup\\Scripts\\DefaultUser.ps1', defaultUserScript);

  runSyncCmds.push('        <!-- Default User betöltése és módosítása -->');
  runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
  runSyncCmds.push(`          <Order>${order++}</Order>`);
  runSyncCmds.push('          <Path>reg.exe load "HKU\\DefaultUser" "C:\\Users\\Default\\NTUSER.DAT"</Path>');
  runSyncCmds.push('        </RunSynchronousCommand>');
  
  runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
  runSyncCmds.push(`          <Order>${order++}</Order>`);
  runSyncCmds.push('          <Path>powershell.exe -WindowStyle Hidden -NoProfile -Command "Invoke-ExecutionPolicyBypass -CommandFile \'C:\\Windows\\Setup\\Scripts\\DefaultUser.ps1\'"</Path>');
  runSyncCmds.push('        </RunSynchronousCommand>');
  
  runSyncCmds.push('        <RunSynchronousCommand wcm:action="add">');
  runSyncCmds.push(`          <Order>${order++}</Order>`);
  runSyncCmds.push('          <Path>reg.exe unload "HKU\\DefaultUser"</Path>');
  runSyncCmds.push('        </RunSynchronousCommand>');

  lines.push('      <RunSynchronous>');
  runSyncCmds.forEach(cmd => lines.push(cmd));
  lines.push('      </RunSynchronous>');

  lines.push('    </component>');
  lines.push('  </settings>');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// oobeSystem pass
// ---------------------------------------------------------------------------
function buildOobeSystem(config, componentAttrs, inputLocale, uiLanguage, addFile) {
  const lines = [];
  lines.push('  <!-- oobeSystem – Felhasználók és első bejelentkezés -->');
  lines.push('  <settings pass="oobeSystem">');

  // Helyi fiók
  lines.push(`    <component ${componentAttrs('Microsoft-Windows-Shell-Setup')}>`);
  if (config.addEnglishKeyboard) {
    lines.push('      <InputLocale>040e:0000040e;0409:00000409</InputLocale>');
  } else {
    lines.push(`      <InputLocale>${inputLocale}</InputLocale>`);
  }
  lines.push('      <SystemLocale>hu-HU</SystemLocale>');
  lines.push('      <UILanguage>hu-HU</UILanguage>');
  lines.push('      <UserLocale>hu-HU</UserLocale>');
  lines.push('      <TimeZone>Central Europe Standard Time</TimeZone>');
  
  lines.push('      <OOBE>');
  if (config.silentOOBEPrivacy) {
    lines.push('        <HideEULAPage>true</HideEULAPage>');
    lines.push('        <HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>');
    lines.push('        <HideOnlineAccountScreens>true</HideOnlineAccountScreens>');
    lines.push('        <ProtectYourPC>3</ProtectYourPC>');
    lines.push('        <HideLocalAccountScreen>true</HideLocalAccountScreen>');
  }
  if (config.silentOOBENetwork) {
    lines.push('        <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>');
    lines.push('        <NetworkLocation>Home</NetworkLocation>');
  }
  if (config.silentOOBEBlueScreens) {
    lines.push('        <SkipMachineOOBE>true</SkipMachineOOBE>');
    lines.push('        <SkipUserOOBE>true</SkipUserOOBE>');
  }
  lines.push('      </OOBE>');

  const locUser = config.localUser || {};
  const user = String(locUser.username || 'Rendszergazda').trim();
  const pass = String(locUser.password || '').trim();
  const hasPass = pass.length > 0;

  lines.push('      <UserAccounts>');
  lines.push('        <LocalAccounts>');
  lines.push('          <LocalAccount wcm:action="add">');
  lines.push(`            <Name>${escapeXml(user)}</Name>`);
  lines.push('            <Group>Administrators</Group>');
  if (config.disablePasswordExpiration) {
    lines.push('            <PasswordExpires>false</PasswordExpires>');
  }
  if (hasPass) {
    lines.push('            <Password>');
    lines.push(`              <Value>${escapeXml(pass)}</Value>`);
    lines.push('              <PlainText>true</PlainText>');
    lines.push('            </Password>');
  }
  lines.push('          </LocalAccount>');
  lines.push('        </LocalAccounts>');
  lines.push('      </UserAccounts>');
  
  if (config.autoLogon) {
    lines.push('      <AutoLogon>');
    lines.push(`        <Username>${escapeXml(user)}</Username>`);
    lines.push('        <Enabled>true</Enabled>');
    lines.push('        <LogonCount>1</LogonCount>');
    if (hasPass) {
      lines.push('        <Password>');
      lines.push(`          <Value>${escapeXml(pass)}</Value>`);
      lines.push('          <PlainText>true</PlainText>');
      lines.push('        </Password>');
    }
    lines.push('      </AutoLogon>');
  }

  // First Logon Commands
  lines.push('      <FirstLogonCommands>');
  // Schneegans VBScript to trigger UnlockStartLayout event
  lines.push('        <SynchronousCommand wcm:action="add">');
  lines.push('          <Order>1</Order>');
  lines.push('          <CommandLine>C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -WindowStyle Hidden -Command "[System.Diagnostics.EventLog]::WriteEntry( \'UnattendGenerator\', \\\"User $env:USERNAME has logged on.\\\", [System.Diagnostics.EventLogEntryType]::Information, 1 );"</CommandLine>');
  lines.push('        </SynchronousCommand>');

  // Run FirstLogon.ps1
  lines.push('        <SynchronousCommand wcm:action="add">');
  lines.push('          <Order>2</Order>');
  lines.push('          <CommandLine>C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoProfile -WindowStyle Maximized -Command "Invoke-ExecutionPolicyBypass -CommandFile \'C:\\Windows\\Setup\\Scripts\\FirstLogon.ps1\'"</CommandLine>');
  lines.push('        </SynchronousCommand>');
  lines.push('      </FirstLogonCommands>');

  lines.push('    </component>');
  lines.push('  </settings>');

  // -------------------------------------------------------------
  // Alkalmazás telepítő szkriptek legenerálása a FirstLogon-hoz
  // -------------------------------------------------------------
  let firstLogonScript = `$ErrorActionPreference = 'Stop';\n`;
  
  if (config.wifi && config.wifi.mode === 'manual') {
    firstLogonScript += `Start-Process -FilePath "cmd.exe" -ArgumentList "/c start ms-availablenetworks:" -WindowStyle Hidden;\n`;
  }
  
  let appInstallers = [];

  // Winget
  if (config.customScripts && config.customScripts.winget) {
    let wingetCode = '';
    if (config.customScripts.winget === 'presetA') {
      wingetCode = SCRIPTS.wingetAppsA;
    } else if (config.customScripts.winget === 'presetB') {
      wingetCode = SCRIPTS.wingetAppsB;
    }
    
    if (wingetCode) {
      addFile('C:\\Windows\\Setup\\Scripts\\App-Winget.ps1', wingetCode);
      appInstallers.push(`Invoke-ExecutionPolicyBypass -CommandFile 'C:\\Windows\\Setup\\Scripts\\App-Winget.ps1'`);
    }
  }

  // Office
  if (config.customScripts && config.customScripts.office === 'versionA') {
    let officeA = SCRIPTS.officeA.replace('##OFFICE_LANG##', uiLanguage === 'en' ? 'en-us' : 'hu-hu');
    addFile('C:\\Windows\\Setup\\Scripts\\App-Office.ps1', officeA);
    appInstallers.push(`Invoke-ExecutionPolicyBypass -CommandFile 'C:\\Windows\\Setup\\Scripts\\App-Office.ps1'`);
  } else if (config.customScripts && config.customScripts.office === 'versionB') {
    let officeB = SCRIPTS.officeB
      .replace('##OFFICE_MAK_KEY##', (config.customScripts.officeKey || '').replace(/'/g, "''"))
      .replace('##OFFICE_LANG##', uiLanguage === 'en' ? 'en-us' : 'hu-hu');
    addFile('C:\\Windows\\Setup\\Scripts\\App-Office.ps1', officeB);
    appInstallers.push(`Invoke-ExecutionPolicyBypass -CommandFile 'C:\\Windows\\Setup\\Scripts\\App-Office.ps1'`);
  }

  // PC Manager
  if (config.customScripts && config.customScripts.pcManager) {
    addFile('C:\\Windows\\Setup\\Scripts\\App-PCManager.ps1', SCRIPTS.pcManager);
    appInstallers.push(`Invoke-ExecutionPolicyBypass -CommandFile 'C:\\Windows\\Setup\\Scripts\\App-PCManager.ps1'`);
  }

  // Domain Join
  if (config.customScripts && config.customScripts.domainJoin) {
    let adCode = SCRIPTS.domainJoin
      .replace('##DOMAIN_NAME##', String(config.customScripts.domainName || '').replace(/'/g, "''"))
      .replace('##DOMAIN_USER##', String(config.customScripts.domainUser || '').replace(/'/g, "''"))
      .replace('##DOMAIN_PASS##', String(config.customScripts.domainPass || '').replace(/'/g, "''"));
    addFile('C:\\Windows\\Setup\\Scripts\\App-DomainJoin.ps1', adCode);
    appInstallers.push(`Invoke-ExecutionPolicyBypass -CommandFile 'C:\\Windows\\Setup\\Scripts\\App-DomainJoin.ps1'`);
  }

  // Windows Update
  if (config.customScripts && config.customScripts.windowsUpdate) {
    addFile('C:\\Windows\\Setup\\Scripts\\App-WindowsUpdate.ps1', SCRIPTS.windowsUpdate);
    appInstallers.push(`Invoke-ExecutionPolicyBypass -CommandFile 'C:\\Windows\\Setup\\Scripts\\App-WindowsUpdate.ps1'`);
  }

  firstLogonScript += appInstallers.join('\n');

  // Végső UserOnce hívás és takarítás
  firstLogonScript += `\n& 'C:\\Windows\\Setup\\Scripts\\UserOnce.ps1'\n`;
  firstLogonScript += `Remove-Item -Path 'C:\\Windows\\Setup\\Scripts' -Recurse -Force -ErrorAction SilentlyContinue\n`;

  addFile('C:\\Windows\\Setup\\Scripts\\FirstLogon.ps1', firstLogonScript);

  // UserOnce (Utólagos takarítás, ha kell)
  let userOnce = `$ErrorActionPreference = 'Stop';\n`;
  userOnce += `Get-AppxPackage -Name 'Microsoft.Windows.Ai.Copilot.Provider' | Remove-AppxPackage -ErrorAction SilentlyContinue;\n`;
  addFile('C:\\Windows\\Setup\\Scripts\\UserOnce.ps1', userOnce);

  // Invoke-ExecutionPolicyBypass PowerShell modul (Schneegans)
  // Ez szükséges ahhoz, hogy a script ne szálljon el.
  let defaultProfile = `
function Invoke-ExecutionPolicyBypass {
  param([Parameter(Mandatory=\$true)][string]\$CommandFile)
  \$process = Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File', "\\\"\$CommandFile\\\"" -PassThru -Wait -WindowStyle Maximized
  if (\$process.ExitCode -ne 0) { throw "Script \$CommandFile failed with exit code \$(\$process.ExitCode)" }
}
`;
  // Mivel a Specialize és a FirstLogon futtatja ezeket külön ablakból, a PowerShell profilba rakjuk
  addFile('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\profile.ps1', defaultProfile);

  return lines.join('\n');
}

export function generateXml(config, uiLanguage = 'hu') {
  const files = [];
  function addFile(path, content) {
    const isUtf16 = path.endsWith('.vbs') || path.endsWith('.reg');
    const b64 = isUtf16 ? getBase64Utf16(content) : getBase64NoBom(content);
    files.push(`\t\t<File path="${escapeXml(path)}">${b64}</File>`);
  }

  const arch = config.architecture || 'amd64';
  const componentAttrs = (name) =>
    `name="${name}" processorArchitecture="${arch}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS"`;

  let inputLocale = '040e:0000040e';
  if (uiLanguage === 'en') {
    inputLocale = '0409:00000409';
  } else if (config.addEnglishKeyboard) {
    inputLocale = '040e:0000040e;0409:00000409';
  }

  const windowsPE = buildWindowsPE(config, componentAttrs, inputLocale);
  const specialize = buildSpecialize(config, componentAttrs, addFile);
  const oobe = buildOobeSystem(config, componentAttrs, inputLocale, uiLanguage, addFile);

  let extensions = '';
  if (files.length > 0) {
    extensions = `  <Extensions xmlns="https://schneegans.de/windows/unattend-generator/">
    <ExtractScript>
${escapeXml(SCHNEEGANS_SCRIPTS.extractScript)}
    </ExtractScript>
${files.join('\n')}
  </Extensions>`;
  }

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
    extensions,
    '</unattend>'
  ].join('\n');
}
