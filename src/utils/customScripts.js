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
  "D:\\Apps\\qBittorrent",
  "D:\\Games\\Steam",
  "D:\\Apps\\EpicGames",
  "D:\\Apps\\K-LiteCodecPack"
)
foreach($dir in $customDirs){
  try {
    $root = [System.IO.Path]::GetPathRoot($dir)
    if(Test-Path $root) {
      if(-not (Test-Path $dir)){
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
      }
    }
  } catch {}
}
$apps=@(
  @{Id="qBittorrent.qBittorrent";Source="winget";Location="D:\\Apps\\qBittorrent"},
  @{Id="Google.Chrome";Source="winget"},
  @{Id="CodecGuide.K-LiteCodecPack.Standard";Source="winget";Location="D:\\Apps\\K-LiteCodecPack"},
  @{Id="Valve.Steam";Source="winget";Location="D:\\Games\\Steam"},
  @{Id="EpicGames.EpicGamesLauncher";Source="winget";Override="/q INSTALLDIR=D:\\Apps\\EpicGames"},
  @{Id="Discord.Discord";Source="winget"},
  @{Id="Microsoft.VCRedist.2015+.x64";Source="winget"},
  @{Id="Microsoft.VCRedist.2015+.x86";Source="winget"},
  @{Id="Ghisler.TotalCommander";Source="winget"}
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

  officeA: `$ErrorActionPreference="Stop"
$ProgressPreference = 'SilentlyContinue'

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
    try { Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction SilentlyContinue } catch {}
    Start-Sleep -Seconds 5
    $attempt++
  }
  if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) { throw "A winget nem lett elerheto." }
}

try {
  Wait-ForWinget

  winget install -e --id Microsoft.OfficeDeploymentTool --source winget --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) { throw "Az Office Deployment Tool telepitese nem sikerult." }

  $odtSetup = $null
  $searchRoots = @()
  if ($env:ProgramFiles) { $searchRoots += $env:ProgramFiles }
  if (\${env:ProgramFiles(x86)}) { $searchRoots += \${env:ProgramFiles(x86)} }
  if ($env:LocalAppData) { $searchRoots += $env:LocalAppData }

  foreach ($root in $searchRoots) {
    if (Test-Path -LiteralPath $root) {
      $found = Get-ChildItem -Path $root -Filter "setup.exe" -Recurse -ErrorAction SilentlyContinue |
        Where-Object {
          $_.FullName -match 'Office Deployment Tool' -or
          $_.FullName -match 'OfficeDeploymentTool' -or
          $_.FullName -match 'Microsoft\\.OfficeDeploymentTool'
        } | Select-Object -First 1
      if ($found) { $odtSetup = $found.FullName; break }
    }
  }

  if (-not $odtSetup) { throw "Nem talalom az ODT setup.exe fajlt." }

  $odtFolder = Join-Path $env:TEMP "ODT-HUHU-Teams"
  New-Item -ItemType Directory -Path $odtFolder -Force | Out-Null
  $xmlPath = Join-Path $odtFolder "configuration.xml"

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

  $p = Start-Process -FilePath $odtSetup -ArgumentList "/configure \`"$xmlPath\`"" -Wait -PassThru
  if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) { throw "ODT telepites sikertelen (ExitCode: $($p.ExitCode))." }

  Show-PopupAsync "Az Office telepítése sikeresen megtörtént!" "Telepítés"
}
catch {
  Show-PopupAsync "Az Office telepítése során hiba lépett fel!" "Telepítés"
  throw "Office telepítési hiba!"
}`,

  officeB: `$ErrorActionPreference = "Stop"
$ProgressPreference = 'SilentlyContinue'

# *** IDE ÍRD BE A MAK KULCSOT ***
$MAK_KEY = '##OFFICE_MAK_KEY##'

function Show-PopupAsync($text, $title = "") {
    $t   = $text.Replace("'", "''")
    $ti  = $title.Replace("'", "''")
    $cmd = "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('$t','$ti')|Out-Null"
    $enc = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($cmd))
    Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList "-NoProfile -EncodedCommand $enc" | Out-Null
}

function Invoke-OfficeActivation($key) {
    # ospp.vbs keresése – Office16 mappa alatt
    $osspPaths = @(
        (Join-Path $env:ProgramFiles        "Microsoft Office\\Office16\\ospp.vbs"),
        (Join-Path \${env:ProgramFiles(x86)} "Microsoft Office\\Office16\\ospp.vbs")
    )

    $osppVbs = $osspPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $osppVbs) {
        throw "Nem talalom az ospp.vbs fajlt. Ellenorizd, hogy az Office telepult-e."
    }

    Write-Host "ospp.vbs megtalálva: $osppVbs"

    # 1. lépés: MAK kulcs bejegyzése
    $inpkey = Start-Process -FilePath "cscript.exe" \`
        -ArgumentList "//NoLogo \`"$osppVbs\`" /inpkey:$key" \`
        -Wait -PassThru -WindowStyle Hidden
    if ($inpkey.ExitCode -ne 0) {
        throw "MAK kulcs bejegyzese sikertelen (ExitCode: $($inpkey.ExitCode))."
    }

    # 2. lépés: Online aktiválás
    $act = Start-Process -FilePath "cscript.exe" \`
        -ArgumentList "//NoLogo \`"$osppVbs\`" /act" \`
        -Wait -PassThru -WindowStyle Hidden
    if ($act.ExitCode -ne 0) {
        throw "Office aktivalas sikertelen (ExitCode: $($act.ExitCode)). Ellenorizd a MAK kulcsot es az internetkapcsolatot."
    }

    Write-Host "Aktiválás sikeres."
}

function Wait-ForWinget {
    $maxAttempts = 60
    $attempt = 0
    while (-not (Get-Command winget.exe -ErrorAction SilentlyContinue) -and $attempt -lt $maxAttempts) {
        try {
            Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe -ErrorAction SilentlyContinue
        } catch {}
        Start-Sleep -Seconds 5
        $attempt++
    }
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw "A winget nem lett elerheto."
    }
}

try {
    Wait-ForWinget

    winget install -e --id Microsoft.OfficeDeploymentTool --source winget --silent --accept-package-agreements --accept-source-agreements

    # FIX: 3010 = sikeres telepítés, újraindítás szükséges – ez nem hiba
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
        throw "Az Office Deployment Tool telepitese nem sikerult. (ExitCode: $LASTEXITCODE)"
    }

    $odtSetup = $null
    $searchRoots = @()
    if ($env:ProgramFiles)          { $searchRoots += $env:ProgramFiles }
    if (\${env:ProgramFiles(x86)})   { $searchRoots += \${env:ProgramFiles(x86)} }
    if ($env:LocalAppData)          { $searchRoots += $env:LocalAppData }

    foreach ($root in $searchRoots) {
        if (Test-Path -LiteralPath $root) {
            # FIX: $.FullName → $_.FullName (mindhárom helyen)
            $found = Get-ChildItem -Path $root -Filter "setup.exe" -Recurse -ErrorAction SilentlyContinue |
                Where-Object {
                    $_.FullName -match 'Office Deployment Tool' -or
                    $_.FullName -match 'OfficeDeploymentTool' -or
                    $_.FullName -match 'Microsoft\\.OfficeDeploymentTool'
                } | Select-Object -First 1
            if ($found) { $odtSetup = $found.FullName; break }
        }
    }

    if (-not $odtSetup) {
        throw "Nem talalom az ODT setup.exe fajlt."
    }

    $odtFolder = Join-Path $env:TEMP "ODT-OfficePP2021"
    New-Item -ItemType Directory -Path $odtFolder -Force | Out-Null
    $xmlPath = Join-Path $odtFolder "configuration.xml"

    # FIX: érvényes XML konfiguráció – Office Professional Plus 2021
    # A MAK kulcsot és aktiválást az ospp.vbs kezeli (megbízhatóbb az AUTOACTIVATE-nél)
    @"
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
"@ | Out-File -FilePath $xmlPath -Encoding utf8 -Force

    $p = Start-Process -FilePath $odtSetup -ArgumentList "/configure \`"$xmlPath\`"" -Wait -PassThru
    if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) {
        throw "ODT telepites sikertelen (ExitCode: $($p.ExitCode))."
    }

    # Aktiválás ospp.vbs-en keresztül – megbízhatóbb mint az AUTOACTIVATE XML property
    if ([string]::IsNullOrWhiteSpace($MAK_KEY) -eq $false) {
        Invoke-OfficeActivation -key $MAK_KEY
        Show-PopupAsync "Az Office Professional Plus 2021 telepítése és aktiválása sikeresen megtörtént!" "Telepítés"
    } else {
        Show-PopupAsync "Az Office Professional Plus 2021 telepítése sikeresen megtörtént! (Aktiválás később szükséges)" "Telepítés"
    }

} catch {
    Show-PopupAsync "Az Office telepítése során hiba lépett fel!\`n\`nRészletek: $($_.Exception.Message)" "Telepítés"
    throw "Office telepítési hiba!"
}`,

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
