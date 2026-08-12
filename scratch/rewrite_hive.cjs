const fs = require('fs');

let content = fs.readFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\src\\utils\\generateXml.js', 'utf8');

const targetDefUserStart = content.indexOf('    // ---------- 3) Default User (HKU\\AU_DEFAULT) ----------');
const targetDefUserEnd = content.indexOf('    if (hklmCmds.length > 0 || defUserCmds.length > 0 || startPinsJson || removeLegacyLayoutJson) {');

if (targetDefUserStart === -1 || targetDefUserEnd === -1) {
  throw new Error("Could not find Default User block in generateXml.js");
}

const newDefUserBlock = `    // ---------- 3) Default User (HKU\\AU_DEFAULT) ----------
    if (config.hideRecentApps) {
      defUserCmds.push('reg.exe add "HKU\\\\AU_DEFAULT\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Start" /v ShowRecentList /t REG_DWORD /d 0 /f');
    }
    if (config.hideMostUsedApps) {
      defUserCmds.push('reg.exe add "HKU\\\\AU_DEFAULT\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Start" /v ShowFrequentList /t REG_DWORD /d 0 /f');
    }
    if (config.hideRecommendedFiles) {
      defUserCmds.push('reg.exe add "HKU\\\\AU_DEFAULT\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Explorer\\\\Advanced" /v Start_TrackDocs /t REG_DWORD /d 0 /f');
    }
    if (config.hideTaskbarIcons) {
      defUserCmds.push('reg.exe add "HKU\\\\AU_DEFAULT\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Explorer\\\\Advanced" /v ShowTaskViewButton /t REG_DWORD /d 0 /f');
    }
    if (config.disableMouseAcceleration) {
      defUserCmds.push('reg.exe add "HKU\\\\AU_DEFAULT\\\\Control Panel\\\\Mouse" /v MouseSpeed /t REG_SZ /d 0 /f');
      defUserCmds.push('reg.exe add "HKU\\\\AU_DEFAULT\\\\Control Panel\\\\Mouse" /v MouseThreshold1 /t REG_SZ /d 0 /f');
      defUserCmds.push('reg.exe add "HKU\\\\AU_DEFAULT\\\\Control Panel\\\\Mouse" /v MouseThreshold2 /t REG_SZ /d 0 /f');
    }
    if (config.disableTransparency) {
      defUserCmds.push('reg.exe add "HKU\\\\AU_DEFAULT\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\Themes\\\\Personalize" /v EnableTransparency /t REG_DWORD /d 0 /f');
    }
    if (config.disableStartAds) {
      const cdm = 'HKU\\\\AU_DEFAULT\\\\Software\\\\Microsoft\\\\Windows\\\\CurrentVersion\\\\ContentDeliveryManager';
      const cdmValues = [
        'ContentDeliveryAllowed',
        'OemPreInstalledAppsEnabled',
        'PreInstalledAppsEnabled',
        'SilentInstalledAppsEnabled',
        'SystemPaneSuggestionsEnabled',
        'SoftLandingEnabled',
        'RotatingLockScreenOverlayEnabled',
        'SubscribedContentEnabled',
        'SubscribedContent-338387Enabled',
        'SubscribedContent-338388Enabled',
        'SubscribedContent-338389Enabled',
        'SubscribedContent-338393Enabled',
        'SubscribedContent-353694Enabled',
        'SubscribedContent-353696Enabled',
        'SubscribedContent-353698Enabled',
      ];
      for (const valueName of cdmValues) {
        defUserCmds.push(\`reg.exe add "\${cdm}" /v \${valueName} /t REG_DWORD /d 0 /f\`);
      }
    }

`;

content = content.substring(0, targetDefUserStart) + newDefUserBlock + content.substring(targetDefUserEnd);

const hiveBlockStart = content.indexOf("const hiveBlock = defUserCmds.length > 0");
let hiveBlockEnd = content.indexOf("const settingsScript =");

if (hiveBlockStart === -1 || hiveBlockEnd === -1) {
  throw new Error("Could not find hiveBlock in generateXml.js");
}

const newHiveBlock = `const hiveBlock = defUserCmds.length > 0
        ? \`$hiveKey = 'AU_DEFAULT'
$hivePath = 'C:\\\\Users\\\\Default\\\\NTUSER.DAT'
$loaded = $false

try {
  for ($i = 1; $i -le 5; $i++) {
    reg.exe load "HKU\\\\$hiveKey" $hivePath | Out-Null

    if ($LASTEXITCODE -eq 0) {
      $loaded = $true
      break
    }

    Write-AuLog (
      'Hive load ' + $i +
      '. probalkozas sikertelen, exit=' +
      $LASTEXITCODE
    )

    Start-Sleep -Seconds 3
  }

  if (-not $loaded) {
    Write-AuLog '[HIBA] A Default User hive nem toltheto be.'
  }
  else {
    Write-AuLog 'Default User hive betoltve.'

\${defUserCmds.map(c => '    ' + c + ' | Out-Null').join('\\n')}

    Write-AuLog 'Default User kulcsok kiirva.'
  }
}
catch {
  Write-AuLog (
    '[HIBA] Default User blokk: ' +
    $_.Exception.Message
  )
}
finally {
  if ($loaded) {
    [gc]::Collect()
    [gc]::WaitForPendingFinalizers()
    Start-Sleep -Seconds 1

    $unloaded = $false

    for ($i = 1; $i -le 10; $i++) {
      reg.exe unload "HKU\\\\$hiveKey" | Out-Null

      if ($LASTEXITCODE -eq 0) {
        $unloaded = $true
        break
      }

      Write-AuLog (
        'Hive unload ' + $i +
        '. probalkozas sikertelen, exit=' +
        $LASTEXITCODE
      )

      [gc]::Collect()
      Start-Sleep -Seconds 2
    }

    if ($unloaded) {
      Write-AuLog 'Default User hive lecsatolva.'
    }
    else {
      Write-AuLog '[KRITIKUS] A hive lecsatolasa sikertelen.'
    }
  }
}\`
        : '';

      `;

content = content.substring(0, hiveBlockStart) + newHiveBlock + content.substring(hiveBlockEnd);

fs.writeFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\src\\utils\\generateXml.js', content);
