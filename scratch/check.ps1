$e1 = $null
[System.Management.Automation.Language.Parser]::ParseFile("$PSScriptRoot\officeA.ps1", [ref]$null, [ref]$e1)
if ($e1) { Write-Output "officeA HAS ERRORS"; Write-Output $e1 } else { Write-Output "officeA IS CLEAN" }

$e2 = $null
[System.Management.Automation.Language.Parser]::ParseFile("$PSScriptRoot\officeB.ps1", [ref]$null, [ref]$e2)
if ($e2) { Write-Output "officeB HAS ERRORS"; Write-Output $e2 } else { Write-Output "officeB IS CLEAN" }
