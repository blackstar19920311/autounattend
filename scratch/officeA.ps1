$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$LogDir    = 'C:\ProgramData\AutoUnattend\Logs'
$FullLog   = 'C:\ProgramData\AutoUnattend\Logs\InstallFull.log'
$ShortLog  = 'C:\ProgramData\AutoUnattend\Logs\InstallSummary.log'
$DoneFlag  = 'C:\ProgramData\AutoUnattend\Office.done'
$FailFlag  = 'C:\ProgramData\AutoUnattend\Office.failed'
$RunFlag   = 'C:\ProgramData\AutoUnattend\Office.running'
$WorkDir   = 'C:\Windows\Temp\ODT'
$ScriptName = 'Microsoft 365 telepitese (ODT)'

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

function Write-Log($msg) {
  Add-Content -Path $FullLog `
    -Value ('[' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') + '] ' + $msg) `
    -Encoding utf8 `
    -ErrorAction SilentlyContinue
}

function Write-Summary($msg) {
  Add-Content -Path $ShortLog `
    -Value ('[' + (Get-Date).ToString('HH:mm:ss') + '] ' + $msg) `
    -Encoding utf8 `
    -ErrorAction SilentlyContinue
}

function Test-OfficeInstalled {
  $cfg = 'HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration'

  if (Test-Path $cfg) {
    $ids = (Get-ItemProperty -Path $cfg -ErrorAction SilentlyContinue).ProductReleaseIds
    if ($ids) {
      return $true
    }
  }

  return (Test-Path (
    $env:ProgramFiles + '\Microsoft Office\root\Office16\WINWORD.EXE'
  ))
}

function Wait-ForNetwork([int]$TimeoutSec = 120) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)

  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $async = $client.BeginConnect(
        'officecdn.microsoft.com',
        443,
        $null,
        $null
      )

      $ok = $async.AsyncWaitHandle.WaitOne(3000, $false)

      if ($ok -and $client.Connected) {
        $client.Close()
        return $true
      }

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

if (Test-Path $DoneFlag) {
  Write-Log 'Office.done letezik, nincs mit tenni.'
  exit 0
}

if (Test-OfficeInstalled) {
  Write-Log 'Az Office mar telepitve van, done jelzo kiirasa.'
  Set-Content -Path $DoneFlag -Value ((Get-Date).ToString('s')) -Encoding ascii
  exit 0
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
  <Logging Level="Standard" Path="C:\ProgramData\AutoUnattend\Logs" />
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
  Write-Summary (
    'HIBAS: ' + $ScriptName + ' - ' + $_.Exception.Message
  )

  Set-Content `
    -Path $FailFlag `
    -Value $_.Exception.Message `
    -Encoding utf8
}
finally {
  Remove-Item `
    -Path $RunFlag `
    -Force `
    -ErrorAction SilentlyContinue

  Remove-Item `
    -Path $WorkDir `
    -Recurse `
    -Force `
    -ErrorAction SilentlyContinue

  if ($success -and $PSCommandPath) {
    Remove-Item `
      -LiteralPath $PSCommandPath `
      -Force `
      -ErrorAction SilentlyContinue
  }
}

exit 0
