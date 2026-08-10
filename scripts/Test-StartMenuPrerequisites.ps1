[CmdletBinding()]
param(
    [string]$OutputPath = 'C:\StartMenuPrerequisites.log'
)

$ErrorActionPreference = 'Continue'
$lines = [System.Collections.Generic.List[string]]::new()
function Log([string]$Message) {
    $line = "[$(Get-Date -Format s)] $Message"
    $lines.Add($line)
    Write-Host $line
}

Log 'Windows 11 25H2 Start menu prerequisite check started.'
$os = Get-ComputerInfo -Property WindowsProductName,WindowsVersion,OsBuildNumber -ErrorAction SilentlyContinue
if ($os) { Log ("OS: {0}, version {1}, build {2}" -f $os.WindowsProductName,$os.WindowsVersion,$os.OsBuildNumber) }

$requiredPaths = @(
    'C:\Windows\SystemApps\MicrosoftWindows.Client.CBS_cw5n1h2txyewy\AppxManifest.xml',
    'C:\Windows\SystemApps\Microsoft.UI.Xaml.CBS_8wekyb3d8bbwe\AppxManifest.xml',
    'C:\Windows\SystemApps\MicrosoftWindows.Client.Core_cw5n1h2txyewy\AppxManifest.xml'
)
foreach ($path in $requiredPaths) {
    Log ("Manifest {0}: {1}" -f $path, (Test-Path -LiteralPath $path))
}

$packages = @(
    'MicrosoftWindows.Client.CBS_cw5n1h2txyewy',
    'Microsoft.UI.Xaml.CBS_8wekyb3d8bbwe',
    'MicrosoftWindows.Client.Core_cw5n1h2txyewy',
    'Microsoft.Windows.StartMenuExperienceHost_cw5n1h2txyewy'
)
foreach ($name in $packages) {
    $found = Get-AppxPackage -Name $name -ErrorAction SilentlyContinue
    if ($found) {
        Log ("Package {0}: registered, version {1}, user {2}" -f $name,$found.Version,$found.User)
    } else {
        Log ("Package {0}: NOT REGISTERED for this user" -f $name)
    }
}

$services = 'AppXSvc','StateRepository','ClipSVC'
foreach ($service in $services) {
    $item = Get-Service -Name $service -ErrorAction SilentlyContinue
    if ($item) { Log ("Service {0}: {1}, start type {2}" -f $service,$item.Status,$item.StartType) }
}

$events = Get-WinEvent -FilterHashtable @{ LogName='Microsoft-Windows-AppXDeploymentServer/Operational'; StartTime=(Get-Date).AddMinutes(-30) } -ErrorAction SilentlyContinue | Select-Object -First 20
foreach ($event in $events) { Log ("AppX event {0}: {1}" -f $event.Id,($event.Message -replace '\s+',' ')) }

$lines | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Log "Completed. Output: $OutputPath"
