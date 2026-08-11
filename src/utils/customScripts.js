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
  $attempt = 0
  while (-not (Get-Command winget.exe -ErrorAction SilentlyContinue) -and $attempt -lt $maxAttempts) {
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
  $attempt = 0
  while (-not (Get-Command winget.exe -ErrorAction SilentlyContinue) -and $attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 5
    $attempt++
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

  officeA: `$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ShortLog   = 'C:\\\\InstallSummary.log'
$FullLog    = 'C:\\\\InstallFull.log'
$ScriptName = 'Microsoft 365 telepitese (SetupComplete)'

function Write-Log($msg) {
  $stamp = (Get-Date).ToString('HH:mm:ss')
  Add-Content -Path $FullLog -Value ('[' + $stamp + '] ' + $msg) -Encoding utf8 -ErrorAction SilentlyContinue
}

function Wait-ForNetwork {
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $r = Test-NetConnection -ComputerName 'officecdn.microsoft.com' -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
      if ($r) { return $true }
    } catch { }
    Start-Sleep -Seconds 5
  }
  return $false
}

Write-Log '============================================================'
Write-Log ('# ' + $ScriptName)
Write-Log '============================================================'

try {
  if (-not (Wait-ForNetwork)) { throw 'Nincs halozati kapcsolat 5 percen belul.' }
  Write-Log 'Halozat OK.'

  $work = 'C:\\\\Windows\\\\Temp\\\\ODT'
  New-Item -ItemType Directory -Path $work -Force | Out-Null
  $setupExe = Join-Path $work 'setup.exe'

  $downloaded = $false
  for ($try = 1; $try -le 3; $try++) {
    try {
      Invoke-WebRequest -Uri 'https://officecdn.microsoft.com/pr/wsus/setup.exe' -OutFile $setupExe -UseBasicParsing -TimeoutSec 300
      if ((Get-Item $setupExe).Length -gt 100000) { $downloaded = $true; break }
    } catch {
      Write-Log ('ODT letoltes sikertelen (' + $try + '. probalkozas): ' + $_.Exception.Message)
      Start-Sleep -Seconds 10
    }
  }
  if (-not $downloaded) { throw 'Az ODT setup.exe letoltese nem sikerult.' }
  Write-Log 'ODT setup.exe letoltve.'

  $xmlPath = Join-Path $work 'configuration.xml'
  $cfg = @'
<Configuration>
  <Add OfficeClientEdition="64" Channel="MonthlyEnterprise">
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
  <Logging Level="Standard" Path="C:\\\\Windows\\\\Temp" />
</Configuration>
'@
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($xmlPath, $cfg, $utf8NoBom)
  Write-Log 'configuration.xml kiirva.'

  $p = Start-Process -FilePath $setupExe -ArgumentList ('/configure "' + $xmlPath + '"') -Wait -PassThru -WindowStyle Hidden
  Write-Log ('ODT ExitCode: ' + $p.ExitCode)
  if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
    throw ('ODT telepites sikertelen (ExitCode: ' + $p.ExitCode + ').')
  }

  Write-Log 'Office telepites kesz.'
  Add-Content -Path $ShortLog -Value ('[' + (Get-Date).ToString('HH:mm:ss') + '] SIKERES: ' + $ScriptName) -Encoding utf8 -ErrorAction SilentlyContinue
}
catch {
  Write-Log ('[HIBA] ' + $_.Exception.Message)
  Add-Content -Path $ShortLog -Value ('[' + (Get-Date).ToString('HH:mm:ss') + '] HIBAS: ' + $ScriptName) -Encoding utf8 -ErrorAction SilentlyContinue
}
finally {
  Remove-Item -Path 'C:\\\\Windows\\\\Setup\\\\Scripts\\\\SetupComplete.cmd' -Force -ErrorAction SilentlyContinue
  Remove-Item -Path 'C:\\\\Windows\\\\Temp\\\\ODT' -Recurse -Force -ErrorAction SilentlyContinue
}
exit 0`,

  officeB: `$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$MAK_KEY    = '##OFFICE_MAK_KEY##'
$ShortLog   = 'C:\\\\InstallSummary.log'
$FullLog    = 'C:\\\\InstallFull.log'
$ScriptName = 'Office Professional Plus 2021 VL telepitese (SetupComplete)'

function Write-Log($msg) {
  $stamp = (Get-Date).ToString('HH:mm:ss')
  Add-Content -Path $FullLog -Value ('[' + $stamp + '] ' + $msg) -Encoding utf8 -ErrorAction SilentlyContinue
}

function Wait-ForNetwork {
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $r = Test-NetConnection -ComputerName 'officecdn.microsoft.com' -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
      if ($r) { return $true }
    } catch { }
    Start-Sleep -Seconds 5
  }
  return $false
}

function Invoke-OfficeActivation($key) {
  $candidates = @(
    'C:\\\\Program Files\\\\Microsoft Office\\\\Office16\\\\ospp.vbs',
    'C:\\\\Program Files (x86)\\\\Microsoft Office\\\\Office16\\\\ospp.vbs'
  )
  $osppVbs = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $osppVbs) { throw 'Nem talalom az ospp.vbs fajlt.' }
  Write-Log ('ospp.vbs: ' + $osppVbs)

  $inpkey = Start-Process -FilePath 'cscript.exe' -ArgumentList ('//NoLogo "' + $osppVbs + '" /inpkey:' + $key) -Wait -PassThru -WindowStyle Hidden
  if ($inpkey.ExitCode -ne 0) { throw ('MAK kulcs bejegyzese sikertelen (ExitCode: ' + $inpkey.ExitCode + ').') }
  Write-Log 'MAK kulcs bejegyezve.'

  $act = Start-Process -FilePath 'cscript.exe' -ArgumentList ('//NoLogo "' + $osppVbs + '" /act') -Wait -PassThru -WindowStyle Hidden
  if ($act.ExitCode -ne 0) { throw ('Aktivalas sikertelen (ExitCode: ' + $act.ExitCode + ').') }
  Write-Log 'Aktivalas sikeres.'
}

Write-Log '============================================================'
Write-Log ('# ' + $ScriptName)
Write-Log '============================================================'

try {
  if (-not (Wait-ForNetwork)) { throw 'Nincs halozati kapcsolat 5 percen belul.' }
  Write-Log 'Halozat OK.'

  $work = 'C:\\\\Windows\\\\Temp\\\\ODT'
  New-Item -ItemType Directory -Path $work -Force | Out-Null
  $setupExe = Join-Path $work 'setup.exe'

  $downloaded = $false
  for ($try = 1; $try -le 3; $try++) {
    try {
      Invoke-WebRequest -Uri 'https://officecdn.microsoft.com/pr/wsus/setup.exe' -OutFile $setupExe -UseBasicParsing -TimeoutSec 300
      if ((Get-Item $setupExe).Length -gt 100000) { $downloaded = $true; break }
    } catch {
      Write-Log ('ODT letoltes sikertelen (' + $try + '. probalkozas): ' + $_.Exception.Message)
      Start-Sleep -Seconds 10
    }
  }
  if (-not $downloaded) { throw 'Az ODT setup.exe letoltese nem sikerult.' }
  Write-Log 'ODT setup.exe letoltve.'

  $xmlPath = Join-Path $work 'configuration.xml'
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
  <Logging Level="Standard" Path="C:\\\\Windows\\\\Temp" />
</Configuration>
'@
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($xmlPath, $cfg, $utf8NoBom)
  Write-Log 'configuration.xml kiirva.'

  $p = Start-Process -FilePath $setupExe -ArgumentList ('/configure "' + $xmlPath + '"') -Wait -PassThru -WindowStyle Hidden
  Write-Log ('ODT ExitCode: ' + $p.ExitCode)
  if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
    throw ('ODT telepites sikertelen (ExitCode: ' + $p.ExitCode + ').')
  }
  Write-Log 'Office telepites kesz.'

  if (-not [string]::IsNullOrWhiteSpace($MAK_KEY)) {
    Invoke-OfficeActivation -key $MAK_KEY
  } else {
    Write-Log 'Nincs MAK kulcs megadva, aktivalas kihagyva.'
  }

  Add-Content -Path $ShortLog -Value ('[' + (Get-Date).ToString('HH:mm:ss') + '] SIKERES: ' + $ScriptName) -Encoding utf8 -ErrorAction SilentlyContinue
}
catch {
  Write-Log ('[HIBA] ' + $_.Exception.Message)
  Add-Content -Path $ShortLog -Value ('[' + (Get-Date).ToString('HH:mm:ss') + '] HIBAS: ' + $ScriptName) -Encoding utf8 -ErrorAction SilentlyContinue
}
finally {
  Remove-Item -Path 'C:\\\\Windows\\\\Setup\\\\Scripts\\\\SetupComplete.cmd' -Force -ErrorAction SilentlyContinue
  Remove-Item -Path 'C:\\\\Windows\\\\Temp\\\\ODT' -Recurse -Force -ErrorAction SilentlyContinue
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
