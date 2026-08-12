// Egyéni szkriptek adattára

export const SCRIPTS = {
  windowsUpdate: `Start-Sleep -Seconds 5
Start-Process "ms-settings:windowsupdate"
Start-Sleep -Seconds 30
Start-Process -FilePath "usoclient.exe" -ArgumentList "StartInteractiveScan" -NoNewWindow`,

  wingetAppsA: `$ErrorActionPreference="Stop"
$ProgressPreference="SilentlyContinue"
function Show-PopupAsync($text,$title=""){
  $t=$text.Replace("'","''")
  $ti=$title.Replace("'","''")
  $cmd="Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList "-NoProfile -EncodedCommand $enc" | Out-Null
}
function Wait-ForWinget {
  $maxAttempts = 60
    Start-Sleep -Seconds 5
  }
  if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    Show-PopupAsync "Az Appok telepítése során hiba lépett fel (Winget nem található)!" "Telepítés"
    throw "Winget nem található!"
  }
}

Wait-ForWinget
$customDirs=@(
  "D:\\Apps\\qBittorrent",
  "D:\\Games\\Steam",
  "D:\\Apps\\EpicGames",
  "D:\\Apps\\K-LiteCodecPack"
)
foreach($dir in $customDirs){
  if(-not (Test-Path $dir)){
    New-Item -ItemType Directory -Path $dir | Out-Null
  }
}
$apps=@(
  @{Id="qBittorrent.qBittorrent";Source="winget";Location="D:\\Apps\\qBittorrent"},
  @{Id="Google.Chrome";Source="winget"},
  @{Id="CodecGuide.K-LiteCodecPack.Standard";Source="winget";Location="D:\\Apps\\K-LiteCodecPack"},
  @{Id="Valve.Steam";Source="winget";Location="D:\\Games\\Steam"},
  @{Id="EpicGames.EpicGamesLauncher";Source="winget";Override="/q INSTALLDIR=D:\\Apps\\EpicGames"},
  @{Id="Discord.Discord";Source="winget"},
  @{Id="Microsoft.VCRedist.2015+.x64";Source="winget"},
  @{Id="Microsoft.VCRedist.2015+.x86";Source="winget"}
)
$ok=$true
$timeoutSec=600
foreach($a in $apps){
  $wingetArgs=@("install","-e","--id",$a.Id,"-h","--accept-package-agreements","--accept-source-agreements","--source",$a.Source)
  if($a.Location){
    $wingetArgs+=("--location",$a.Location)
  }
  if($a.Override){
    $wingetArgs+=("--override", ('"' + $a.Override + '"'))
  }
  $logLine = "Installing $($a.Id)... "
  $p=Start-Process -FilePath "winget.exe" -ArgumentList $wingetArgs -PassThru -WindowStyle Hidden
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

# Steam és Discord automatikus indulásának kikapcsolása
Remove-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "Steam" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "Discord" -ErrorAction SilentlyContinue

if($ok){
  Show-PopupAsync "Az Appok telepítése sikeresen megtörtént!" "Telepítés"
}else{
  Show-PopupAsync "Az Appok telepítése során hiba lépett fel!\`nRészletek: C:\\InstallFull.log" "Telepítés"
  throw "Winget telepítési hiba!"
}`,

  wingetAppsB: `$ErrorActionPreference="Stop"
$ProgressPreference="SilentlyContinue"

function Show-PopupAsync($text,$title=""){
  $t=$text.Replace("'","''")
  $ti=$title.Replace("'","''")
  $cmd="Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList "-NoProfile -EncodedCommand $enc" | Out-Null
}

function Wait-ForWinget {
  $maxAttempts = 60
    Start-Sleep -Seconds 5
  }
  if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    Show-PopupAsync "Az Appok telepítése során hiba lépett fel (Winget nem található)!" "Telepítés"
    throw "Winget nem található!"
  }
}

Wait-ForWinget

$apps=@(
  @{Id="Google.Chrome";Source="winget"},
  @{Id="CodecGuide.K-LiteCodecPack.Standard";Source="winget"},
  @{Id="Microsoft.VCRedist.2015+.x64";Source="winget"},
  @{Id="Microsoft.VCRedist.2015+.x86";Source="winget"},
  @{Id="RARLab.WinRAR";Source="winget"},
  @{Id="Ghisler.TotalCommander";Source="winget"},
  @{Id="VeyonSolutions.Veyon";Source="winget";Override="/S /NoMaster"},
  @{Id="VideoLAN.VLC";Source="winget"}
)

$ok=$true
$timeoutSec=600

foreach($a in $apps){
  $wingetArgs=@("install","-e","--id",$a.Id,"-h","--accept-package-agreements","--accept-source-agreements","--source",$a.Source)
  if($a.Location){
    $wingetArgs+=("--location",$a.Location)
  }
  if($a.Override){
    $wingetArgs+=("--override", ('"' + $a.Override + '"'))
  }
  $logLine = "Installing $($a.Id)... "
  $p=Start-Process -FilePath "winget.exe" -ArgumentList $wingetArgs -PassThru -WindowStyle Hidden
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

if($ok){
  Show-PopupAsync "Az Appok telepítése sikeresen megtörtént!" "Telepítés"
}else{
  Show-PopupAsync "Az Appok telepítése során hiba lépett fel!\`nRészletek: C:\\InstallFull.log" "Telepítés"
  throw "Winget telepítési hiba!"
}`,

  officeA: `$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$LogDir      = 'C:\\ProgramData\\AutoUnattend\\Logs'
$FullLog     = 'C:\\ProgramData\\AutoUnattend\\Logs\\InstallFull.log'
$ShortLog    = 'C:\\ProgramData\\AutoUnattend\\Logs\\InstallSummary.log'
$DoneFlag    = 'C:\\ProgramData\\AutoUnattend\\Office.done'
$FailFlag    = 'C:\\ProgramData\\AutoUnattend\\Office.failed'
$RunFlag     = 'C:\\ProgramData\\AutoUnattend\\Office.running'
$WorkDir     = 'C:\\Windows\\Temp\\ODT'
$ScriptName  = 'Microsoft 365 telepitese (ODT)'

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Write-Log($msg) {
  Add-Content -Path $FullLog -Value ('[' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '] ' + $msg) -Encoding utf8 -ErrorAction SilentlyContinue
}
function Write-Summary($msg) {
  Add-Content -Path $ShortLog -Value ('[' + (Get-Date).ToString('HH:mm:ss') + '] ' + $msg) -Encoding utf8 -ErrorAction SilentlyContinue
}
}
function Test-OfficeInstalled {
  $cfg = 'HKLM:\\SOFTWARE\\Microsoft\\Office\\ClickToRun\\Configuration'
  if (Test-Path $cfg) {
    $ids = (Get-ItemProperty -Path $cfg -ErrorAction SilentlyContinue).ProductReleaseIds
    if ($ids) { return $true }
  }
  return (Test-Path ($env:ProgramFiles + '\\Microsoft Office\\root\\Office16\\WINWORD.EXE'))
}
function Wait-ForNetwork([int]$TimeoutSec = 120) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $async = $client.BeginConnect('officecdn.microsoft.com', 443, $null, $null)
      $ok = $async.AsyncWaitHandle.WaitOne(3000, $false)
      if ($ok -and $client.Connected) { $client.Close(); return $true }
      $client.Close()
    } catch { }
    Start-Sleep -Seconds 5
  }
  return $false
}
function Get-OdtSetup($TargetPath) {
  $url = 'https://officecdn.microsoft.com/pr/wsus/setup.exe'
  for ($i = 1; $i -le 3; $i++) {
    try {
      Invoke-WebRequest -Uri $url -OutFile $TargetPath -UseBasicParsing -TimeoutSec 300
      if ((Test-Path $TargetPath) -and (Get-Item $TargetPath).Length -gt 100000) { return $true }
    } catch {
      Write-Log ('ODT letoltes (IWR) hiba, ' + $i + '. probalkozas: ' + $_.Exception.Message)
    }
    try {
      & curl.exe -L -s -o $TargetPath $url | Out-Null
      if ((Test-Path $TargetPath) -and (Get-Item $TargetPath).Length -gt 100000) { return $true }
    } catch {
      Write-Log ('ODT letoltes (curl) hiba, ' + $i + '. probalkozas: ' + $_.Exception.Message)
    }
    Start-Sleep -Seconds 10
  }
  return $false
}

Write-Log '============================================================'
Write-Log ('# ' + $ScriptName)
Write-Log ('# Futtato: ' + [Security.Principal.WindowsIdentity]::GetCurrent().Name)
Write-Log '============================================================'

  exit 0
if (Test-OfficeInstalled) {
  Write-Log 'Az Office mar telepitve van, done jelzo kiirasa.'
  Set-Content -Path $DoneFlag -Value ((Get-Date).ToString('s')) -Encoding ascii
  exit 0
}
if (Test-Path $RunFlag) {
  $ageMin = ((Get-Date) - (Get-Item $RunFlag).LastWriteTime).TotalMinutes
  if ($ageMin -lt 90) { Write-Log 'Mar fut egy Office telepites, kilepes.'; exit 0 }
  Write-Log 'Elavult Office.running jelzo, folytatas.'
}

}
Set-Content -Path $RunFlag -Value ((Get-Date).ToString('s')) -Encoding ascii

$success = $false
try {
  if (-not (Wait-ForNetwork 120)) { throw 'Nincs halozati kapcsolat 120 masodpercen belul.' }
  Write-Log 'Halozat OK.'

  New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
  $setupExe = Join-Path $WorkDir 'setup.exe'
  if (-not (Get-OdtSetup $setupExe)) { throw 'Az ODT setup.exe letoltese nem sikerult.' }
  Write-Log 'ODT setup.exe letoltve.'

  $xmlPath = Join-Path $WorkDir 'configuration.xml'
  $cfg = @'
<Configuration>
  <Add OfficeClientEdition="64" Channel="Current">
    <Product ID="O365ProPlusRetail">
      <Language ID="##OFFICE_LANG##" />
      <ExcludeApp ID="Groove" />
      <ExcludeApp ID="Lync" />
    </Product>
  </Add>
  <RemoveMSI />
  <Display Level="None" AcceptEULA="TRUE" />
  <Updates Enabled="TRUE" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
  <Property Name="PinIconsToTaskbar" Value="FALSE" />
  <Property Name="SharedComputerLicensing" Value="0" />
  <Logging Level="Standard" Path="C:\\ProgramData\\AutoUnattend\\Logs" />
</Configuration>
'@
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($xmlPath, $cfg, $utf8NoBom)
  Write-Log 'configuration.xml kiirva.'

  $exitCode = -1
  for ($run = 1; $run -le 2; $run++) {
    $p = Start-Process -FilePath $setupExe -ArgumentList ('/configure "' + $xmlPath + '"') -Wait -PassThru -WindowStyle Hidden
    $exitCode = $p.ExitCode
    Write-Log ('ODT futas ' + $run + ', ExitCode: ' + $exitCode)
    if ($exitCode -eq 0 -or $exitCode -eq 3010) { break }
    Start-Sleep -Seconds 20
  }
  if ($exitCode -ne 0 -and $exitCode -ne 3010) { throw ('ODT telepites sikertelen (ExitCode: ' + $exitCode + ').') }
  if (-not (Test-OfficeInstalled)) { throw 'Az ODT 0-t adott vissza, de az Office nem talalhato a rendszerben.' }

  Set-Content -Path $DoneFlag -Value ((Get-Date).ToString('s')) -Encoding ascii
  Remove-Item -Path $FailFlag -Force -ErrorAction SilentlyContinue
  $success = $true
  Write-Log 'Office telepites kesz.'
  Write-Summary ('SIKERES: ' + $ScriptName)
}
catch {
  Write-Log ('[HIBA] ' + $_.Exception.Message)
  Write-Summary ('HIBAS: ' + $ScriptName + ' - ' + $_.Exception.Message)
    Set-Content -Path $FailFlag -Value ($_.Exception.Message) -Encoding utf8
  }
}
finally {
  Remove-Item -Path $RunFlag -Force -ErrorAction SilentlyContinue
  Remove-Item -Path $WorkDir -Recurse -Force -ErrorAction SilentlyContinue
    if ($success -and $PSCommandPath) {
      Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue
    }
  } else {
    Write-Log 'A fallback task a kovetkezo inditasnal ujraprobalja.'
  }
}
exit 0`,

  officeB: `$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$MAK_KEY     = '##OFFICE_MAK_KEY##'
$LogDir      = 'C:\\ProgramData\\AutoUnattend\\Logs'
$FullLog     = 'C:\\ProgramData\\AutoUnattend\\Logs\\InstallFull.log'
$ShortLog    = 'C:\\ProgramData\\AutoUnattend\\Logs\\InstallSummary.log'
$DoneFlag    = 'C:\\ProgramData\\AutoUnattend\\Office.done'
$FailFlag    = 'C:\\ProgramData\\AutoUnattend\\Office.failed'
$RunFlag     = 'C:\\ProgramData\\AutoUnattend\\Office.running'
$WorkDir     = 'C:\\Windows\\Temp\\ODT'
$ScriptName  = 'Office Professional Plus 2021 VL telepitese (ODT)'

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Write-Log($msg) {
  Add-Content -Path $FullLog -Value ('[' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '] ' + $msg) -Encoding utf8 -ErrorAction SilentlyContinue
}
function Write-Summary($msg) {
  Add-Content -Path $ShortLog -Value ('[' + (Get-Date).ToString('HH:mm:ss') + '] ' + $msg) -Encoding utf8 -ErrorAction SilentlyContinue
}
}
function Test-OfficeInstalled {
  $cfg = 'HKLM:\\SOFTWARE\\Microsoft\\Office\\ClickToRun\\Configuration'
  if (Test-Path $cfg) {
    $ids = (Get-ItemProperty -Path $cfg -ErrorAction SilentlyContinue).ProductReleaseIds
    if ($ids) { return $true }
  }
  return (Test-Path ($env:ProgramFiles + '\\Microsoft Office\\root\\Office16\\WINWORD.EXE'))
}
function Wait-ForNetwork([int]$TimeoutSec = 120) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $async = $client.BeginConnect('officecdn.microsoft.com', 443, $null, $null)
      $ok = $async.AsyncWaitHandle.WaitOne(3000, $false)
      if ($ok -and $client.Connected) { $client.Close(); return $true }
      $client.Close()
    } catch { }
    Start-Sleep -Seconds 5
  }
  return $false
}
function Get-OdtSetup($TargetPath) {
  $url = 'https://officecdn.microsoft.com/pr/wsus/setup.exe'
  for ($i = 1; $i -le 3; $i++) {
    try {
      Invoke-WebRequest -Uri $url -OutFile $TargetPath -UseBasicParsing -TimeoutSec 300
      if ((Test-Path $TargetPath) -and (Get-Item $TargetPath).Length -gt 100000) { return $true }
    } catch {
      Write-Log ('ODT letoltes (IWR) hiba, ' + $i + '. probalkozas: ' + $_.Exception.Message)
    }
    try {
      & curl.exe -L -s -o $TargetPath $url | Out-Null
      if ((Test-Path $TargetPath) -and (Get-Item $TargetPath).Length -gt 100000) { return $true }
    } catch {
      Write-Log ('ODT letoltes (curl) hiba, ' + $i + '. probalkozas: ' + $_.Exception.Message)
    }
    Start-Sleep -Seconds 10
  }
  return $false
}
function Get-OsppPath {
  $fixed = @(
    ($env:ProgramFiles + '\\Microsoft Office\\root\\Office16\\OSPP.VBS'),
    ($env:ProgramFiles + '\\Microsoft Office\\Office16\\OSPP.VBS'),
    (\\$\\{env:ProgramFiles(x86)\\} + '\\Microsoft Office\\root\\Office16\\OSPP.VBS'),
    (\\$\\{env:ProgramFiles(x86)\\} + '\\Microsoft Office\\Office16\\OSPP.VBS')
  )
  foreach ($p in $fixed) { if ($p -and (Test-Path $p)) { return $p } }
  $roots = @(($env:ProgramFiles + '\\Microsoft Office'), (\\$\\{env:ProgramFiles(x86)\\} + '\\Microsoft Office'))
  foreach ($r in $roots) {
    if ($r -and (Test-Path $r)) {
      $hit = Get-ChildItem -Path $r -Filter 'OSPP.VBS' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($hit) { return $hit.FullName }
    }
  }
  return $null
}
function Invoke-Ospp($OsppPath, $Arguments, $LogLabel) {
  $outFile = Join-Path $env:TEMP ('ospp_' + [guid]::NewGuid().ToString('N') + '.txt')
  $p = Start-Process -FilePath 'cscript.exe' -ArgumentList ('//NoLogo "' + $OsppPath + '" ' + $Arguments) -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput $outFile
  $text = ''
  if (Test-Path $outFile) { $text = (Get-Content -Path $outFile -Raw -ErrorAction SilentlyContinue) }
  Remove-Item -Path $outFile -Force -ErrorAction SilentlyContinue
  Write-Log ('ospp ' + $LogLabel + ' exit=' + $p.ExitCode)
  if ($text) { Write-Log ('ospp ' + $LogLabel + ' kimenet: ' + ($text -replace '\s+', ' ')) }
  return $p.ExitCode
}
function Test-OfficeActivated {
  try {
    $prods = Get-CimInstance -ClassName SoftwareLicensingProduct -ErrorAction Stop |
      Where-Object { $_.Name -like 'Office*' -and $_.PartialProductKey }
    foreach ($pr in $prods) {
      if ($pr.LicenseStatus -eq 1) {
        Write-Log ('Aktiv Office licenc: ' + $pr.Name + ' (LicenseStatus=1)')
        return $true
      }
    }
  } catch {
    Write-Log ('[FIGYELEM] Licenc allapot lekerdezes hiba: ' + $_.Exception.Message)
  }
  return $false
}

Write-Log '============================================================'
Write-Log ('# ' + $ScriptName)
Write-Log ('# Futtato: ' + [Security.Principal.WindowsIdentity]::GetCurrent().Name)
Write-Log '============================================================'

  exit 0
if (Test-Path $RunFlag) {
  $ageMin = ((Get-Date) - (Get-Item $RunFlag).LastWriteTime).TotalMinutes
  if ($ageMin -lt 90) { Write-Log 'Mar fut egy Office telepites, kilepes.'; exit 0 }
}

}
Set-Content -Path $RunFlag -Value ((Get-Date).ToString('s')) -Encoding ascii

$success = $false
try {
  if (-not (Test-OfficeInstalled)) {
    if (-not (Wait-ForNetwork 120)) { throw 'Nincs halozati kapcsolat 120 masodpercen belul.' }
    Write-Log 'Halozat OK.'

    New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null
    $setupExe = Join-Path $WorkDir 'setup.exe'
    if (-not (Get-OdtSetup $setupExe)) { throw 'Az ODT setup.exe letoltese nem sikerult.' }
    Write-Log 'ODT setup.exe letoltve.'

    $xmlPath = Join-Path $WorkDir 'configuration.xml'
    $cfg = @'
<Configuration>
  <Add OfficeClientEdition="64" Channel="PerpetualVL2021">
    <Product ID="ProPlus2021Volume">
      <Language ID="##OFFICE_LANG##" />
      <ExcludeApp ID="Teams" />
      <ExcludeApp ID="Groove" />
      <ExcludeApp ID="Lync" />
    </Product>
  </Add>
  <RemoveMSI />
  <Display Level="None" AcceptEULA="TRUE" />
  <Property Name="FORCEAPPSHUTDOWN" Value="TRUE" />
  <Property Name="PinIconsToTaskbar" Value="FALSE" />
  <Logging Level="Standard" Path="C:\\ProgramData\\AutoUnattend\\Logs" />
</Configuration>
'@
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($xmlPath, $cfg, $utf8NoBom)
    Write-Log 'configuration.xml kiirva.'

    $exitCode = -1
    for ($run = 1; $run -le 2; $run++) {
      $p = Start-Process -FilePath $setupExe -ArgumentList ('/configure "' + $xmlPath + '"') -Wait -PassThru -WindowStyle Hidden
      $exitCode = $p.ExitCode
      Write-Log ('ODT futas ' + $run + ', ExitCode: ' + $exitCode)
      if ($exitCode -eq 0 -or $exitCode -eq 3010) { break }
      Start-Sleep -Seconds 20
    }
    if ($exitCode -ne 0 -and $exitCode -ne 3010) { throw ('ODT telepites sikertelen (ExitCode: ' + $exitCode + ').') }
    if (-not (Test-OfficeInstalled)) { throw 'Az ODT 0-t adott vissza, de az Office nem talalhato a rendszerben.' }
    Write-Log 'Office telepites kesz.'
  } else {
    Write-Log 'Az Office mar telepitve van, csak az aktivalas kovetkezik.'
  }

  if (-not [string]::IsNullOrWhiteSpace($MAK_KEY)) {
    if (Test-OfficeActivated) {
      Write-Log 'Az Office mar aktivalt, kulcs bejegyzese kihagyva.'
    } else {
      $ospp = Get-OsppPath
      if (-not $ospp) { throw 'Nem talalhato OSPP.VBS (sem root\\Office16, sem Office16 alatt).' }
      Write-Log ('OSPP.VBS: ' + $ospp)
      $keyTail = $MAK_KEY
      if ($keyTail.Length -gt 5) { $keyTail = $keyTail.Substring($keyTail.Length - 5) }
      Write-Log ('MAK kulcs bejegyzese (vege: ...' + $keyTail + ')')

      Invoke-Ospp $ospp ('/inpkey:' + $MAK_KEY) 'inpkey' | Out-Null
      Start-Sleep -Seconds 5
      Invoke-Ospp $ospp '/act' 'act' | Out-Null
      Start-Sleep -Seconds 10
      Invoke-Ospp $ospp '/dstatus' 'dstatus' | Out-Null

      if (Test-OfficeActivated) {
        Write-Log 'Aktivalas sikeres (WMI LicenseStatus=1).'
      } else {
        throw 'Az aktivalas nem igazolhato (LicenseStatus nem 1). Ellenorizd a MAK kulcsot es a halozatot.'
      }
    }
  } else {
    Write-Log 'Nincs MAK kulcs megadva, aktivalas kihagyva.'
  }

  Set-Content -Path $DoneFlag -Value ((Get-Date).ToString('s')) -Encoding ascii
  Remove-Item -Path $FailFlag -Force -ErrorAction SilentlyContinue
  $success = $true
  Write-Summary ('SIKERES: ' + $ScriptName)
}
catch {
  Write-Log ('[HIBA] ' + $_.Exception.Message)
  Write-Summary ('HIBAS: ' + $ScriptName + ' - ' + $_.Exception.Message)
    Set-Content -Path $FailFlag -Value ($_.Exception.Message) -Encoding utf8
  }
}
finally {
  Remove-Item -Path $RunFlag -Force -ErrorAction SilentlyContinue
  Remove-Item -Path $WorkDir -Recurse -Force -ErrorAction SilentlyContinue
    if ($success -and $PSCommandPath) {
      Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue
    }
  } else {
    Write-Log 'A fallback task a kovetkezo inditasnal ujraprobalja.'
  }
}
exit 0`,

  pcManager: `$ErrorActionPreference="Stop"
$ProgressPreference="SilentlyContinue"
function Show-PopupAsync($text,$title=""){
  $t=$text.Replace("'","''")
  $ti=$title.Replace("'","''")
  $cmd="Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList "-NoProfile -EncodedCommand $enc" | Out-Null
}
$GeoUS=244
$GeoHU=109
$id="9PM860492SZD"
$exitCode=1
try{
  Set-WinHomeLocation -GeoId $GeoUS
  Start-Sleep -Seconds 2
  winget source update | Out-Null
  $installArgs=@("install","-e","--id",$id,"-h","--source","msstore","--accept-package-agreements","--accept-source-agreements")
  $p=Start-Process -FilePath "winget.exe" -ArgumentList $installArgs -PassThru -WindowStyle Hidden
  $p.WaitForExit(1200 * 1000) | Out-Null
  if($p.ExitCode -eq 0){$exitCode=0}else{$exitCode=1}
}catch{
  $exitCode=1
}finally{
  for($i=0;$i -lt 5;$i++){
    try{
      Set-WinHomeLocation -GeoId $GeoHU
      Start-Sleep -Milliseconds 500
      if((Get-WinHomeLocation).GeoId -eq $GeoHU){break}
    }catch{
      Start-Sleep -Seconds 1
    }
  }
  if($exitCode -eq 0){
    Show-PopupAsync "A PC Manager telepítése sikeresen megtörtént!" "Telepítés"
  }else{
    Show-PopupAsync "A PC Manager telepítése során hiba lépett fel!" "Telepítés"
    throw "PC Manager telepítési hiba!"
  }
}`,

  domainJoin: `$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Show-PopupAsync($text,$title=""){
  $t=$text.Replace("'","''")
  $ti=$title.Replace("'","''")
  $cmd="Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
  $enc=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList "-NoProfile -NoLogo -STA -EncodedCommand $enc" | Out-Null
}

function Start-RebootCountdownPopupAsync(
  [int]$Seconds = 3600,
  [string]$Title = "Újraindítás",
  [string]$TextPrefix = "A gép újra fog indulni ennyi idő múlva:",
  [bool]$RebootOnTimeout = $true
){
  $titleSafe  = $Title.Replace("'","''")
  $prefixSafe = $TextPrefix.Replace("'","''")
  $rebootLiteral = if($RebootOnTimeout){'$true'}else{'$false'}

  $cmd = @"
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName PresentationCore

\`$script:seconds = [int]$Seconds
\`$title = '$titleSafe'
\`$prefix = '$prefixSafe'
\`$rebootOnTimeout = $rebootLiteral

[xml]\`$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        Title="{0}" Height="190" Width="520" WindowStartupLocation="CenterScreen"
        ResizeMode="NoResize" Topmost="True" ShowInTaskbar="True">
  <Grid Margin="14">
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <TextBlock Grid.Row="0" FontSize="14" FontWeight="SemiBold" TextWrapping="Wrap">
      <Run Text="{1}"/>
    </TextBlock>

    <Border Grid.Row="1" Margin="0,12,0,0" CornerRadius="8" Background="#FFF3F3F3" Padding="10">
      <TextBlock Name="Countdown" FontSize="34" FontWeight="Bold"
                 FontFamily="Consolas" Foreground="#FF111111"
                 HorizontalAlignment="Center" VerticalAlignment="Center"/>
    </Border>

    <StackPanel Grid.Row="2" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,12,0,0">
      <Button Name="OkBtn" Width="210" Height="34" IsDefault="True">OK (azonnali újraindítás)</Button>
    </StackPanel>
  </Grid>
</Window>
'@ -f \`$title, \`$prefix

\`$reader = New-Object System.Xml.XmlNodeReader \`$xaml
\`$window = [Windows.Markup.XamlReader]::Load(\`$reader)
\`$countdown = \`$window.FindName("Countdown")
\`$okBtn = \`$window.FindName("OkBtn")

function Format-Time([int]\`$s){
  if(\`$s -lt 0){ \`$s = 0 }
  \`$h = [math]::Floor(\`$s / 3600)
  \`$m = [math]::Floor((\`$s % 3600) / 60)
  \`$sec = \`$s % 60
  "{0:00}:{1:00}:{2:00}" -f \`$h, \`$m, \`$sec
}

\`$countdown.Text = (Format-Time \`$script:seconds)

\`$timer = New-Object Windows.Threading.DispatcherTimer
\`$timer.Interval = [TimeSpan]::FromSeconds(1)

\`$timer.Add_Tick({
  \`$script:seconds--
  \`$countdown.Text = (Format-Time \`$script:seconds)
  if(\`$script:seconds -le 0){
    \`$timer.Stop()
    if(\`$rebootOnTimeout){
      Start-Process -FilePath "shutdown.exe" -ArgumentList "/r /t 0 /f" -WindowStyle Hidden
    }
    \`$window.Close()
  }
})

\`$okBtn.Add_Click({
  \`$timer.Stop()
  Start-Process -FilePath "shutdown.exe" -ArgumentList "/r /t 0 /f" -WindowStyle Hidden
  \`$window.Close()
})

\`$window.Add_Loaded({ \`$timer.Start() })
\`$window.ShowDialog() | Out-Null
"@

  $enc=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
  Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList "-NoProfile -NoLogo -STA -EncodedCommand $enc" | Out-Null
}

$DomainName = '##DOMAIN_NAME##'
$DomainJoinUser = '##DOMAIN_USER##'
$PlainPassword = '##DOMAIN_PASS##'

$sec  = ConvertTo-SecureString $PlainPassword -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential ($DomainJoinUser, $sec)

try {
  if ([string]::IsNullOrWhiteSpace($DomainName) -or [string]::IsNullOrWhiteSpace($DomainJoinUser)) {
    Show-PopupAsync "Tartományba léptetés kihagyva, mert nincsenek megadva az adatok!" "Infó"
  } else {
    $cs = Get-CimInstance Win32_ComputerSystem
    if (-not ($cs.PartOfDomain -and ($cs.Domain -ieq $DomainName))) {
      Add-Computer -DomainName $DomainName -Credential $cred -ErrorAction Stop
    }
    Start-RebootCountdownPopupAsync -Seconds 3600 -Title "Kész" -TextPrefix "Sikeres tartományba léptetés. Újraindítás 1 órán belül (OK = azonnal):" -RebootOnTimeout $true
  }
}
catch {
  Show-PopupAsync "Hiba történt a tartományba léptetés során!" "Hiba"
  throw "Tartományba léptetés hiba!"
}
`
};
