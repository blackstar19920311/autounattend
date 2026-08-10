const DIAGNOSTIC_SCRIPT = String.raw`[CmdletBinding()]
param(
    [ValidateSet('1','2')]
    [string]$LogSuffix = '1',
    [string]$OutputPath
)

$ErrorActionPreference = 'Continue'
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = "C:\StartMenuPrerequisites-$LogSuffix.log"
}

$lines = [System.Collections.Generic.List[string]]::new()
function Log([string]$Message) {
    $line = "[$(Get-Date -Format s)] $Message"
    $lines.Add($line)
    Write-Host $line
}

Log "Windows 11 25H2 Start menu prerequisite check started. Log suffix: $LogSuffix"
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
Log "Completed. Output: $OutputPath"`

function encodeUtf16Base64([string]$text) {
  const bytes = [0xff, 0xfe];
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    bytes.push(code & 0xff, (code >> 8) & 0xff);
  }
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function commandXml(order, command, description) {
  return [
    '        <SynchronousCommand wcm:action="add">',
    `          <Order>${order}</Order>`,
    `          <CommandLine>${escapeXml(command)}</CommandLine>`,
    `          <Description>${escapeXml(description)}</Description>`,
    '        </SynchronousCommand>',
  ].join('\n');
}

function createDiagnosticCommands(startOrder) {
  const commands = [];
  const base64 = encodeUtf16Base64(DIAGNOSTIC_SCRIPT);
  const path = 'C:\\Windows\\Setup\\Scripts\\Test-StartMenuPrerequisites.ps1';
  const chunkSize = 180;
  let order = startOrder;

  for (let i = 0; i < base64.length; i += chunkSize) {
    const chunk = base64.substring(i, i + chunkSize);
    const redirect = i === 0 ? '>' : '>>';
    commands.push(commandXml(order++, `cmd.exe /c ${redirect}${path}\.b64 echo ${chunk}`, 'Start menü diagnosztika telepítése'));
  }
  commands.push(commandXml(order++, `certutil.exe -decode -f ${path}\.b64 ${path}`, 'Start menü diagnosztika dekódolása'));
  commands.push(commandXml(order++, `powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File ${path} -LogSuffix 1`, 'Start menü diagnosztika 1. mérés'));

  return { commands, nextOrder: order };
}

export function injectStartMenuDiagnostics(xml) {
  if (!xml || !xml.includes('<FirstLogonCommands>')) return xml;

  const firstClose = '</FirstLogonCommands>';
  const firstIndex = xml.indexOf(firstClose);
  const firstBlockStart = xml.lastIndexOf('<FirstLogonCommands>', firstIndex);
  if (firstBlockStart < 0) return xml;

  const existingOrders = [...xml.slice(firstBlockStart, firstIndex).matchAll(/<Order>(\d+)<\/Order>/g)]
    .map(match => Number(match[1]));
  const firstOrder = existingOrders.length ? Math.min(...existingOrders) : 1;
  const first = createDiagnosticCommands(firstOrder);
  const firstXml = first.commands.join('\n');

  let updated = xml.slice(0, firstBlockStart) + '<FirstLogonCommands>\n' + firstXml + '\n' + xml.slice(firstBlockStart + '<FirstLogonCommands>'.length);

  const lastClose = '</FirstLogonCommands>';
  const lastIndex = updated.lastIndexOf(lastClose);
  const lastCommand = commandXml(first.nextOrder + 10000, 'powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File C:\\Windows\\Setup\\Scripts\\Test-StartMenuPrerequisites.ps1 -LogSuffix 2', 'Start menü diagnosztika 2. mérés');
  updated = updated.slice(0, lastIndex) + lastCommand + '\n' + updated.slice(lastIndex);
  return updated;
}
