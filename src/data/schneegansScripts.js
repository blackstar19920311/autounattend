/**
 * Schneegans-stílusú segédszkriptek.
 *
 * Fontos változás: az `extractScript` most már BASE64-et dekódol, nem nyers
 * szöveget ír ki. Korábban az `addFile()` base64-et tett a `<File>` elemekbe,
 * az extract script viszont `$encoding.GetBytes($file.InnerText)`-tel dolgozott,
 * vagyis minden kicsomagolt fájlba a base64 sztring került, nem a szkript.
 * Ráadásul a `.vbs`-eknél duplán jött a BOM (generátor + GetPreamble).
 *
 * Az új megállapodás: a `<File>` tartalma a fájl PONTOS byte-folyamának
 * base64 kódja, BOM-mal együtt, ha az adott típusnak kell. Az extract script
 * csak dekódol és kiír – nincs kódolás-találgatás, nincs dupla BOM.
 */

const REMOVE_TEMPLATE = (type, getCommand, filterCommand, removeCommand, logName) => `$selectors = @(
##SELECTORS##
);
$getCommand = {
${getCommand}
};
$filterCommand = {
${filterCommand}
};
$removeCommand = {
  [CmdletBinding()]
  param(
    [Parameter( Mandatory, ValueFromPipeline )]
    $InputObject
  );
  process {
${removeCommand}
  }
};
$type = '${type}';
$logfile = 'C:\\Windows\\Temp\\${logName}';
& {
  $installed = & $getCommand;
  foreach( $selector in $selectors ) {
    $result = [ordered] @{
      Selector = $selector;
    };
    $found = $installed | Where-Object -FilterScript $filterCommand;
    if( $found ) {
      $result.Output = $found | & $removeCommand;
      if( $? ) {
        $result.Message = "$type removed.";
      } else {
        $result.Message = "$type not removed.";
        $result.Error = $Error[0];
      }
    } else {
      $result.Message = "$type not installed.";
    }
    $result | ConvertTo-Json -Depth 3 -Compress;
  }
} *>&1 >> $logfile;
`;

export const SCHNEEGANS_SCRIPTS = {
  /**
   * UWP csomagok eltávolítása. A `##SELECTORS##` helyére a generátor teszi be
   * a kiválasztott csomagneveket. PONTOS (`-eq`) egyezést használ, nem wildcardot,
   * és minden lépést naplóz – szemben a régi, néma `SilentlyContinue` verzióval.
   */
  removePackages: REMOVE_TEMPLATE(
    'Package',
    '  Get-AppxProvisionedPackage -Online;',
    '  $_.DisplayName -eq $selector;',
    "    $InputObject | Remove-AppxProvisionedPackage -AllUsers -Online -ErrorAction 'Continue';",
    'RemovePackages.log'
  ),

  /** Örökölt Windows képességek eltávolítása (opcionális). */
  removeCapabilities: REMOVE_TEMPLATE(
    'Capability',
    "  Get-WindowsCapability -Online | Where-Object -Property 'State' -NotIn -Value @( 'NotPresent'; 'Removed'; );",
    "  ($_.Name -split '~')[0] -eq $selector;",
    "    $InputObject | Remove-WindowsCapability -Online -ErrorAction 'Continue';",
    'RemoveCapabilities.log'
  ),

  /** Az örökölt képességek listája (a UI egyetlen kapcsolóval kéri őket). */
  legacyCapabilities: [
    'Print.Fax.Scan',
    'Browser.InternetExplorer',
    'MathRecognizer',
    'App.StepsRecorder',
    'Media.WindowsMediaPlayer',
    'Microsoft.Windows.WordPad',
  ],

  unlockStartLayoutVbs: `HKU = &H80000003
Set reg = GetObject("winmgmts://./root/default:StdRegProv")

If reg.EnumKey(HKU, "", sids) = 0 Then
	If Not IsNull(sids) Then
		For Each sid In sids
			key = sid + "\\Software\\Policies\\Microsoft\\Windows\\Explorer"
			name = "LockedStartLayout"
			If reg.GetDWORDValue(HKU, key, name, existing) = 0 Then
				reg.SetDWORDValue HKU, key, name, 0
			End If
		Next
	End If
End If
`,

  showAllTrayIconsVbs: `HKCU = &H80000001
key = "Control Panel\\NotifyIconSettings"
Set reg = GetObject("winmgmts://./root/default:StdRegProv")
If reg.EnumKey(HKCU, key, names) = 0 Then
	If Not IsNull(names) Then
		For Each name In names
			reg.SetDWORDValue HKCU, key + "\\" + name, "IsPromoted", 1
		Next
	End If
End If
`,

  /**
   * A `##VBS_PATH##` helyére a generátor a TARTÓS könyvtárat írja
   * (C:\\Windows\\Setup\\Files), nem a FirstLogon végén törölt Scripts mappát.
   */
  unlockStartLayoutXml: `<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
	<Triggers>
		<EventTrigger>
			<Enabled>true</Enabled>
			<Subscription>&lt;QueryList&gt;&lt;Query Id="0" Path="Application"&gt;&lt;Select Path="Application"&gt;*[System[Provider[@Name='UnattendGenerator'] and EventID=1]]&lt;/Select&gt;&lt;/Query&gt;&lt;/QueryList&gt;</Subscription>
		</EventTrigger>
	</Triggers>
	<Principals>
		<Principal id="Author">
			<UserId>S-1-5-18</UserId>
			<RunLevel>LeastPrivilege</RunLevel>
		</Principal>
	</Principals>
	<Settings>
		<MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
		<DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
		<StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
		<AllowHardTerminate>true</AllowHardTerminate>
		<StartWhenAvailable>false</StartWhenAvailable>
		<RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
		<IdleSettings>
			<StopOnIdleEnd>true</StopOnIdleEnd>
			<RestartOnIdle>false</RestartOnIdle>
		</IdleSettings>
		<AllowStartOnDemand>true</AllowStartOnDemand>
		<Enabled>true</Enabled>
		<Hidden>false</Hidden>
		<RunOnlyIfIdle>false</RunOnlyIfIdle>
		<WakeToRun>false</WakeToRun>
		<ExecutionTimeLimit>PT72H</ExecutionTimeLimit>
		<Priority>7</Priority>
	</Settings>
	<Actions Context="Author">
		<Exec>
			<Command>C:\\Windows\\System32\\wscript.exe</Command>
			<Arguments>##VBS_PATH##</Arguments>
		</Exec>
	</Actions>
</Task>
`,

  showAllTrayIconsXml: `<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
	<Triggers>
		<LogonTrigger>
			<Repetition>
				<Interval>PT1M</Interval>
				<StopAtDurationEnd>false</StopAtDurationEnd>
			</Repetition>
			<Enabled>true</Enabled>
		</LogonTrigger>
	</Triggers>
	<Principals>
		<Principal id="Author">
			<GroupId>S-1-5-32-545</GroupId>
			<RunLevel>LeastPrivilege</RunLevel>
		</Principal>
	</Principals>
	<Settings>
		<MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
		<DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
		<StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
		<AllowHardTerminate>true</AllowHardTerminate>
		<StartWhenAvailable>false</StartWhenAvailable>
		<RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
		<IdleSettings>
			<StopOnIdleEnd>true</StopOnIdleEnd>
			<RestartOnIdle>false</RestartOnIdle>
		</IdleSettings>
		<AllowStartOnDemand>true</AllowStartOnDemand>
		<Enabled>true</Enabled>
		<Hidden>false</Hidden>
		<RunOnlyIfIdle>false</RunOnlyIfIdle>
		<WakeToRun>false</WakeToRun>
		<ExecutionTimeLimit>PT72H</ExecutionTimeLimit>
		<Priority>7</Priority>
	</Settings>
	<Actions Context="Author">
		<Exec>
			<Command>C:\\Windows\\System32\\wscript.exe</Command>
			<Arguments>##VBS_PATH##</Arguments>
		</Exec>
	</Actions>
</Task>
`,

  /**
   * Üres Start/tálca layout. Korábban halott kód volt – most a `cleanStartPins`
   * kapcsoló írja ki a Default User profiljába.
   */
  taskbarLayoutModificationXml: `<LayoutModificationTemplate xmlns:defaultlayout="http://schemas.microsoft.com/Start/2014/FullDefaultLayout" xmlns:start="http://schemas.microsoft.com/Start/2014/StartLayout" Version="1" xmlns="http://schemas.microsoft.com/Start/2014/LayoutModification">
	<LayoutOptions StartTileGroupCellWidth="6" />
	<DefaultLayoutOverride>
		<StartLayoutCollection>
			<defaultlayout:StartLayout GroupCellWidth="6" />
		</StartLayoutCollection>
	</DefaultLayoutOverride>
</LayoutModificationTemplate>
`,

  /**
   * A `<File>` elemek kicsomagolása. Base64 -> nyers byte-ok -> fájl.
   * Nincs kódolás-találgatás, nincs dupla BOM.
   */
  extractScript: `param(
    [xml] $Document
);

$ErrorActionPreference = 'Stop';

foreach( $file in $Document.unattend.Extensions.File ) {
    $path = [System.Environment]::ExpandEnvironmentVariables( $file.GetAttribute( 'path' ) );
    $parent = Split-Path -Path $path -Parent;
    if( -not ( Test-Path -LiteralPath $parent ) ) {
        New-Item -Path $parent -ItemType 'Directory' -Force | Out-Null;
    }
    $bytes = [System.Convert]::FromBase64String( ( $file.InnerText -replace '\\s', '' ) );
    [System.IO.File]::WriteAllBytes( $path, $bytes );
}
`,
};
