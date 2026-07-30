// Egyéni szkriptek adattára (PowerShell)
//
// A `##...##` helyőrzőket a generátor cseréli ki. Minden itt lévő szkriptet a
// FirstLogon.ps1 indít külön processzben, `-NoProfile -ExecutionPolicy Bypass -File`
// módon, és a KILÉPÉSI KÓD dönt a sikerről (0 = ok).

/**
 * Közös fejrész minden winget-alapú szkripthez.
 *
 * JAVÍTVA: a `$FullLog` korábban DEFINIÁLATLAN volt, miközben
 * `Add-Content -Path $FullLog` hívások épültek rá `$ErrorActionPreference='Stop'`
 * mellett – így az első alkalmazás után a szkript eldobta magát, és a popupban
 * hivatkozott logfájl sosem jött létre.
 */
const WINGET_PREAMBLE = `$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$FullLog = 'C:\\Windows\\Temp\\AppInstall.log'
New-Item -ItemType Directory -Path (Split-Path -Parent $FullLog) -Force -ErrorAction SilentlyContinue | Out-Null

function Write-InstallLog {
  param([string]$Message)
  "$(Get-Date -Format o) $Message" | Add-Content -Path $FullLog -Encoding utf8
}

function Show-PopupAsync($text, $title = '') {
  $t = $text.Replace("'", "''")
  $ti = $title.Replace("'", "''")
  $cmd = "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @('-NoProfile', '-EncodedCommand', $enc) | Out-Null
}

function Wait-ForWinget {
  $maxAttempts = 60
  $attempt = 0
  while ($attempt -lt $maxAttempts) {
    if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
      $test = & winget --version 2>&1
      if ($LASTEXITCODE -eq 0 -and $test -match 'v\\d+') { return $true }
    }
    if (-not (Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet -ErrorAction SilentlyContinue)) {
      Write-InstallLog 'No internet connection while waiting for winget.'
    }
    try {
      Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction SilentlyContinue
    } catch {}
    Start-Sleep -Seconds 5
    $attempt++
  }
  return [bool](Get-Command winget.exe -ErrorAction SilentlyContinue)
}
`;

/**
 * Közös telepítő ciklus.
 *
 * JAVÍTVA: az `EnsureDir` kulcs váltja a korábbi, törékeny
 * `$a.Override -match 'INSTALLDIR=([^"]+)'` regexet. A winget FIGYELMEN KÍVÜL
 * HAGYJA a `--location`-t, ha `--override` is van, ezért a kettő itt kizárja
 * egymást (korábban mindkettő kimehetett egyszerre).
 */
const WINGET_LOOP = `$ok = $true
$timeoutSec = 600

if (-not (Wait-ForWinget)) {
  Write-InstallLog 'winget not available, aborting.'
  Show-PopupAsync 'Az appok telepítése nem indult el (a winget nem elérhető).' 'Telepítés'
  exit 1
}

foreach ($a in $apps) {
  if ($a.EnsureDir -and -not (Test-Path -LiteralPath $a.EnsureDir)) {
    New-Item -ItemType Directory -Path $a.EnsureDir -Force -ErrorAction SilentlyContinue | Out-Null
  }

  $wingetArgs = @('install', '-e', '--id', $a.Id, '-h', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity', '--source', $a.Source)
  if ($a.Location) {
    $wingetArgs += @('--location', $a.Location)
  } elseif ($a.Override) {
    $wingetArgs += @('--override', $a.Override)
  }

  $p = Start-Process -FilePath 'winget.exe' -ArgumentList $wingetArgs -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit($timeoutSec * 1000)) {
    try {
      Get-CimInstance Win32_Process | Where-Object ParentProcessId -EQ $p.Id | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      $p.Kill()
    } catch {}
    $ok = $false
    Write-InstallLog "$($a.Id): TIMEOUT after $timeoutSec s"
    continue
  }

  $validExitCodes = @(0, 3010, 1641, 1638, -1978335228, -1978335215, -1978335231, -1978335189)
  Write-InstallLog "$($a.Id): ExitCode $($p.ExitCode)"
  if ($validExitCodes -notcontains $p.ExitCode) { $ok = $false }
}

# Steam és Discord automatikus indulásának kikapcsolása
Remove-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'Steam' -ErrorAction SilentlyContinue
Remove-ItemProperty -Path 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run' -Name 'Discord' -ErrorAction SilentlyContinue
Stop-Process -Name 'Discord', 'Steam', 'msedge', 'chrome', 'firefox', 'iexplore', 'Update' -Force -ErrorAction SilentlyContinue

if ($ok) {
  Show-PopupAsync 'Az appok telepítése sikeresen megtörtént!' 'Telepítés'
  exit 0
} else {
  Show-PopupAsync 'Az appok telepítése során hiba lépett fel! Részletek: C:\\Windows\\Temp\\AppInstall.log' 'Telepítés'
  exit 1
}
`;

export const SCRIPTS = {
  /**
   * JAVÍTVA: az `usoclient.exe StartInteractiveScan` deprecated / eltávolított a
   * friss Windows 11 buildeken, tehát a régi szkript a Settings megnyitásán túl
   * semmit nem tett. Most a támogatott Microsoft.Update COM API-t használjuk.
   */
  windowsUpdate: `$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$log = 'C:\\Windows\\Temp\\WindowsUpdate.log'
function Write-WuLog { param([string]$Message) ; "$(Get-Date -Format o) $Message" | Add-Content -Path $log -Encoding utf8 }

Start-Process 'ms-settings:windowsupdate' -ErrorAction SilentlyContinue

try {
  $session = New-Object -ComObject 'Microsoft.Update.Session'
  $searcher = $session.CreateUpdateSearcher()
  Write-WuLog 'Searching for updates...'
  $result = $searcher.Search("IsInstalled=0 and Type='Software' and IsHidden=0")
  Write-WuLog "Found $($result.Updates.Count) update(s)."

  if ($result.Updates.Count -gt 0) {
    $toDownload = New-Object -ComObject 'Microsoft.Update.UpdateColl'
    foreach ($u in $result.Updates) {
      if (-not $u.EulaAccepted) { $u.AcceptEula() | Out-Null }
      $toDownload.Add($u) | Out-Null
    }

    $downloader = $session.CreateUpdateDownloader()
    $downloader.Updates = $toDownload
    $downloader.Download() | Out-Null
    Write-WuLog 'Download finished.'

    $toInstall = New-Object -ComObject 'Microsoft.Update.UpdateColl'
    foreach ($u in $result.Updates) {
      if ($u.IsDownloaded) { $toInstall.Add($u) | Out-Null }
    }

    if ($toInstall.Count -gt 0) {
      $installer = $session.CreateUpdateInstaller()
      $installer.Updates = $toInstall
      $installResult = $installer.Install()
      Write-WuLog "Install result code: $($installResult.ResultCode), reboot required: $($installResult.RebootRequired)"
    }
  }
} catch {
  Write-WuLog "Windows Update failed: $($_.Exception.Message)"
}

exit 0
`,

  wingetAppsA: `${WINGET_PREAMBLE}
$apps = @(
  @{Id='qBittorrent.qBittorrent';Source='winget';Location='D:\\Apps\\qBittorrent';EnsureDir='D:\\Apps\\qBittorrent'},
  @{Id='Google.Chrome';Source='winget'},
  @{Id='CodecGuide.K-LiteCodecPack.Standard';Source='winget';Location='D:\\Apps\\K-LiteCodecPack';EnsureDir='D:\\Apps\\K-LiteCodecPack'},
  @{Id='Valve.Steam';Source='winget';Location='D:\\Games\\Steam';EnsureDir='D:\\Games\\Steam'},
  @{Id='EpicGames.EpicGamesLauncher';Source='winget';Override='/q INSTALLDIR=D:\\Apps\\EpicGames';EnsureDir='D:\\Apps\\EpicGames'},
  @{Id='Discord.Discord';Source='winget'},
  @{Id='Microsoft.VCRedist.2015+.x64';Source='winget'},
  @{Id='Microsoft.VCRedist.2015+.x86';Source='winget'}
)

${WINGET_LOOP}`,

  wingetAppsB: `${WINGET_PREAMBLE}
$apps = @(
  @{Id='Google.Chrome';Source='winget'},
  @{Id='CodecGuide.K-LiteCodecPack.Standard';Source='winget'},
  @{Id='Microsoft.VCRedist.2015+.x64';Source='winget'},
  @{Id='Microsoft.VCRedist.2015+.x86';Source='winget'},
  @{Id='RARLab.WinRAR';Source='winget'},
  @{Id='Ghisler.TotalCommander';Source='winget'},
  @{Id='VeyonSolutions.Veyon';Source='winget';Override='/S /NoMaster'},
  @{Id='VideoLAN.VLC';Source='winget'}
)

${WINGET_LOOP}`,

  wingetCustomBase: `${WINGET_PREAMBLE}
$apps = @(
##APPS##
)

${WINGET_LOOP}`,

  officeA: `$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$log = 'C:\\Windows\\Temp\\Office.log'
function Write-OfficeLog { param([string]$Message) ; "$(Get-Date -Format o) $Message" | Add-Content -Path $log -Encoding utf8 }

function Show-PopupAsync($text, $title = '') {
  $t = $text.Replace("'", "''")
  $ti = $title.Replace("'", "''")
  $cmd = "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @('-NoProfile', '-EncodedCommand', $enc) | Out-Null
}

function Wait-ForWinget {
  $maxAttempts = 60
  $attempt = 0
  while ($attempt -lt $maxAttempts) {
    if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
      $test = & winget --version 2>&1
      if ($LASTEXITCODE -eq 0 -and $test -match 'v\\d+') { return $true }
    }
    try {
      Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction SilentlyContinue
    } catch {}
    Start-Sleep -Seconds 5
    $attempt++
  }
  return [bool](Get-Command winget.exe -ErrorAction SilentlyContinue)
}

function Find-OdtSetup {
  $searchRoots = @()
  if ($env:ProgramFiles) { $searchRoots += $env:ProgramFiles }
  if (\${env:ProgramFiles(x86)}) { $searchRoots += \${env:ProgramFiles(x86)} }
  if ($env:LocalAppData) { $searchRoots += $env:LocalAppData }

  foreach ($root in $searchRoots) {
    if (Test-Path -LiteralPath $root) {
      $found = Get-ChildItem -Path $root -Filter 'setup.exe' -Recurse -ErrorAction SilentlyContinue |
        Where-Object {
          $_.FullName -match 'Office Deployment Tool' -or
          $_.FullName -match 'OfficeDeploymentTool' -or
          $_.FullName -match 'Microsoft\\.OfficeDeploymentTool'
        } | Select-Object -First 1
      if ($found) { return $found.FullName }
    }
  }
  return $null
}

try {
  if (-not (Wait-ForWinget)) { throw 'A winget nem lett elerheto.' }

  $p = Start-Process -FilePath 'winget.exe' -ArgumentList @('install', '-e', '--id', 'Microsoft.OfficeDeploymentTool', '--source', 'winget', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity') -PassThru -WindowStyle Hidden
  $p.WaitForExit(600 * 1000) | Out-Null
  if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) { throw "Az Office Deployment Tool telepitese nem sikerult (ExitCode: $($p.ExitCode))." }

  $odtSetup = Find-OdtSetup
  if (-not $odtSetup) { throw 'Nem talalom az ODT setup.exe fajlt.' }

  $odtFolder = Join-Path $env:TEMP 'ODT-M365'
  New-Item -ItemType Directory -Path $odtFolder -Force | Out-Null
  $xmlPath = Join-Path $odtFolder 'configuration.xml'

@'
<Configuration>
  <Add OfficeClientEdition="64" Channel="MonthlyEnterprise">
    <Product ID="O365ProPlusRetail">
      <Language ID="##OFFICE_LANG##" />
    </Product>
  </Add>
  <RemoveMSI />
  <Display Level="None" AcceptEULA="TRUE" />
  <Updates Enabled="TRUE" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
</Configuration>
'@ | Out-File -FilePath $xmlPath -Encoding utf8 -Force

  $p = Start-Process -FilePath $odtSetup -ArgumentList @('/configure', $xmlPath) -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit(1800 * 1000)) {
    try {
      Get-CimInstance Win32_Process | Where-Object ParentProcessId -EQ $p.Id | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      $p.Kill()
    } catch {}
    throw 'ODT telepites idotullepes miatt leallt.'
  }
  if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) { throw "ODT telepites sikertelen (ExitCode: $($p.ExitCode))." }

  Write-OfficeLog 'Office (M365) installed.'
  Show-PopupAsync 'Az Office telepítése sikeresen megtörtént!' 'Telepítés'
  exit 0
} catch {
  Write-OfficeLog "Office install failed: $($_.Exception.Message)"
  Show-PopupAsync "Az Office telepítése során hiba lépett fel! Részletek: C:\\Windows\\Temp\\Office.log" 'Telepítés'
  exit 1
}
`,

  officeB: `$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$log = 'C:\\Windows\\Temp\\Office.log'
function Write-OfficeLog { param([string]$Message) ; "$(Get-Date -Format o) $Message" | Add-Content -Path $log -Encoding utf8 }

$MAK_KEY = '##OFFICE_MAK_KEY##'

function Show-PopupAsync($text, $title = '') {
  $t = $text.Replace("'", "''")
  $ti = $title.Replace("'", "''")
  $cmd = "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @('-NoProfile', '-EncodedCommand', $enc) | Out-Null
}

function Wait-ForWinget {
  $maxAttempts = 60
  $attempt = 0
  while ($attempt -lt $maxAttempts) {
    if (Get-Command winget.exe -ErrorAction SilentlyContinue) {
      $test = & winget --version 2>&1
      if ($LASTEXITCODE -eq 0 -and $test -match 'v\\d+') { return $true }
    }
    try {
      Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction SilentlyContinue
    } catch {}
    Start-Sleep -Seconds 5
    $attempt++
  }
  return [bool](Get-Command winget.exe -ErrorAction SilentlyContinue)
}

function Find-OdtSetup {
  $searchRoots = @()
  if ($env:ProgramFiles) { $searchRoots += $env:ProgramFiles }
  if (\${env:ProgramFiles(x86)}) { $searchRoots += \${env:ProgramFiles(x86)} }
  if ($env:LocalAppData) { $searchRoots += $env:LocalAppData }

  foreach ($root in $searchRoots) {
    if (Test-Path -LiteralPath $root) {
      $found = Get-ChildItem -Path $root -Filter 'setup.exe' -Recurse -ErrorAction SilentlyContinue |
        Where-Object {
          $_.FullName -match 'Office Deployment Tool' -or
          $_.FullName -match 'OfficeDeploymentTool' -or
          $_.FullName -match 'Microsoft\\.OfficeDeploymentTool'
        } | Select-Object -First 1
      if ($found) { return $found.FullName }
    }
  }
  return $null
}

function Invoke-OfficeActivation {
  param([string]$Key)

  $osppPaths = @(
    (Join-Path $env:ProgramFiles 'Microsoft Office\\Office16\\ospp.vbs')
  )
  if (\${env:ProgramFiles(x86)}) {
    $osppPaths += (Join-Path \${env:ProgramFiles(x86)} 'Microsoft Office\\Office16\\ospp.vbs')
  }

  $osppVbs = $osppPaths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
  if (-not $osppVbs) { throw 'Nem talalom az ospp.vbs fajlt. Ellenorizd, hogy az Office telepult-e.' }

  Write-OfficeLog "ospp.vbs found: $osppVbs"

  $inpkey = Start-Process -FilePath 'cscript.exe' -ArgumentList @('//NoLogo', $osppVbs, "/inpkey:$Key") -Wait -PassThru -WindowStyle Hidden
  if ($inpkey.ExitCode -ne 0) { throw "MAK kulcs bejegyzese sikertelen (ExitCode: $($inpkey.ExitCode))." }

  $act = Start-Process -FilePath 'cscript.exe' -ArgumentList @('//NoLogo', $osppVbs, '/act') -Wait -PassThru -WindowStyle Hidden
  if ($act.ExitCode -ne 0) { throw "Office aktivalas sikertelen (ExitCode: $($act.ExitCode))." }

  Write-OfficeLog 'Activation succeeded.'
}

try {
  if (-not (Wait-ForWinget)) { throw 'A winget nem lett elerheto.' }

  $p = Start-Process -FilePath 'winget.exe' -ArgumentList @('install', '-e', '--id', 'Microsoft.OfficeDeploymentTool', '--source', 'winget', '--silent', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity') -PassThru -WindowStyle Hidden
  $p.WaitForExit(600 * 1000) | Out-Null
  if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) { throw "Az Office Deployment Tool telepitese nem sikerult (ExitCode: $($p.ExitCode))." }

  $odtSetup = Find-OdtSetup
  if (-not $odtSetup) { throw 'Nem talalom az ODT setup.exe fajlt.' }

  $odtFolder = Join-Path $env:TEMP 'ODT-OfficePP2021'
  New-Item -ItemType Directory -Path $odtFolder -Force | Out-Null
  $xmlPath = Join-Path $odtFolder 'configuration.xml'

@'
<Configuration>
  <Add OfficeClientEdition="64" Channel="PerpetualVL2021">
    <Product ID="ProPlus2021Volume">
      <Language ID="##OFFICE_LANG##" />
      <ExcludeApp ID="Teams" />
    </Product>
  </Add>
  <Display Level="None" AcceptEULA="TRUE" />
  <Logging Level="Standard" Path="%temp%" />
</Configuration>
'@ | Out-File -FilePath $xmlPath -Encoding utf8 -Force

  $p = Start-Process -FilePath $odtSetup -ArgumentList @('/configure', $xmlPath) -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit(1800 * 1000)) {
    try {
      Get-CimInstance Win32_Process | Where-Object ParentProcessId -EQ $p.Id | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      $p.Kill()
    } catch {}
    throw 'ODT telepites idotullepes miatt leallt.'
  }
  if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) { throw "ODT telepites sikertelen (ExitCode: $($p.ExitCode))." }

  # Az aktivalas ospp.vbs-en keresztul megbizhatobb, mint az AUTOACTIVATE XML property.
  if (-not [string]::IsNullOrWhiteSpace($MAK_KEY)) {
    Invoke-OfficeActivation -Key $MAK_KEY
    Show-PopupAsync 'Az Office Professional Plus 2021 telepítése és aktiválása sikeresen megtörtént!' 'Telepítés'
  } else {
    Show-PopupAsync 'Az Office Professional Plus 2021 telepítése sikeresen megtörtént! (Aktiválás később szükséges)' 'Telepítés'
  }
  exit 0
} catch {
  Write-OfficeLog "Office install failed: $($_.Exception.Message)"
  Show-PopupAsync "Az Office telepítése során hiba lépett fel! Részletek: C:\\Windows\\Temp\\Office.log" 'Telepítés'
  exit 1
}
`,

  /**
   * JAVÍTVA: a szkript korábban FIXEN 109-re (Magyarország) állította vissza a
   * régiót, függetlenül a gép valós beállításától. Most az EREDETI értéket
   * mentjük el és azt tesszük vissza.
   */
  pcManager: `$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$log = 'C:\\Windows\\Temp\\PCManager.log'
function Write-PcmLog { param([string]$Message) ; "$(Get-Date -Format o) $Message" | Add-Content -Path $log -Encoding utf8 }

function Show-PopupAsync($text, $title = '') {
  $t = $text.Replace("'", "''")
  $ti = $title.Replace("'", "''")
  $cmd = "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @('-NoProfile', '-EncodedCommand', $enc) | Out-Null
}

$GeoUS = 244
$id = '9PM860492SZD'
$exitCode = 1

# Az EREDETI regio elmentese, hogy pontosan azt tudjuk visszaallitani.
$originalGeoId = $null
try { $originalGeoId = (Get-WinHomeLocation).GeoId } catch { Write-PcmLog "Could not read home location: $($_.Exception.Message)" }
Write-PcmLog "Original GeoId: $originalGeoId"

try {
  Set-WinHomeLocation -GeoId $GeoUS
  Start-Sleep -Seconds 2

  $pU = Start-Process -FilePath 'winget.exe' -ArgumentList @('source', 'update') -PassThru -WindowStyle Hidden
  $pU.WaitForExit(60000) | Out-Null

  $installArgs = @('install', '-e', '--id', $id, '-h', '--source', 'msstore', '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity')
  $p = Start-Process -FilePath 'winget.exe' -ArgumentList $installArgs -PassThru -WindowStyle Hidden
  if (-not $p.WaitForExit(1200 * 1000)) {
    try {
      Get-CimInstance Win32_Process | Where-Object ParentProcessId -EQ $p.Id | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      $p.Kill()
    } catch {}
    Write-PcmLog 'PC Manager install TIMEOUT.'
  } else {
    Write-PcmLog "PC Manager ExitCode: $($p.ExitCode)"
    if ($p.ExitCode -eq 0) { $exitCode = 0 }
  }
} catch {
  Write-PcmLog "PC Manager install failed: $($_.Exception.Message)"
} finally {
  if ($null -ne $originalGeoId) {
    for ($i = 0; $i -lt 5; $i++) {
      try {
        Set-WinHomeLocation -GeoId $originalGeoId
        Start-Sleep -Milliseconds 500
        if ((Get-WinHomeLocation).GeoId -eq $originalGeoId) { break }
      } catch {
        Start-Sleep -Seconds 1
      }
    }
    Write-PcmLog "Restored GeoId to $originalGeoId"
  }

  if ($exitCode -eq 0) {
    Show-PopupAsync 'A PC Manager telepítése sikeresen megtörtént!' 'Telepítés'
  } else {
    Show-PopupAsync 'A PC Manager telepítése során hiba lépett fel!' 'Telepítés'
  }
}

exit $exitCode
`,

  /**
   * JAVÍTVA:
   *  - a PSCredential csak az ures-ellenorzes UTAN epul fel (korabban ures
   *    jelszonal kivetelt dobott, meg mielott a baratsagos "kihagyva" ag elerheto lett volna),
   *  - a korabbi, tobb szintu here-string-be agyazott WPF visszaszamlalo helyett
   *    egyszeru, robusztus `shutdown /r /t` + tajekoztato popup.
   */
  domainJoin: `$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$log = 'C:\\Windows\\Temp\\DomainJoin.log'
function Write-DjLog { param([string]$Message) ; "$(Get-Date -Format o) $Message" | Add-Content -Path $log -Encoding utf8 }

function Show-PopupAsync($text, $title = '') {
  $t = $text.Replace("'", "''")
  $ti = $title.Replace("'", "''")
  $cmd = "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -ArgumentList @('-NoProfile', '-STA', '-EncodedCommand', $enc) | Out-Null
}

$DomainName = '##DOMAIN_NAME##'
$DomainJoinUser = '##DOMAIN_USER##'
$PlainPassword = '##DOMAIN_PASS##'

if ([string]::IsNullOrWhiteSpace($DomainName) -or [string]::IsNullOrWhiteSpace($DomainJoinUser) -or [string]::IsNullOrEmpty($PlainPassword)) {
  Write-DjLog 'Domain join skipped: missing data.'
  Show-PopupAsync 'Tartományba léptetés kihagyva, mert nincsenek megadva az adatok!' 'Infó'
  exit 0
}

try {
  $sec = ConvertTo-SecureString $PlainPassword -AsPlainText -Force
  $cred = New-Object System.Management.Automation.PSCredential ($DomainJoinUser, $sec)

  $cs = Get-CimInstance Win32_ComputerSystem
  if ($cs.PartOfDomain -and ($cs.Domain -ieq $DomainName)) {
    Write-DjLog "Already joined to $($cs.Domain)."
  } else {
    Add-Computer -DomainName $DomainName -Credential $cred -ErrorAction Stop
    Write-DjLog "Joined domain $DomainName."
  }

  shutdown.exe /r /t 3600 /c 'Tartomanyba leptetes kesz. A gep 1 ora mulva ujraindul.'
  Show-PopupAsync 'Sikeres tartományba léptetés. A gép 1 óra múlva újraindul. Azonnali újraindítás: shutdown /r /t 0 — megszakítás: shutdown /a' 'Kész'
  exit 0
} catch {
  Write-DjLog "Domain join failed: $($_.Exception.Message)"
  Show-PopupAsync "Hiba történt a tartományba léptetés során! Részletek: C:\\Windows\\Temp\\DomainJoin.log" 'Hiba'
  exit 1
}
`,
};
