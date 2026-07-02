$prefix = 'PC'
$letters = -join (1..2 | ForEach-Object { [char](Get-Random -Minimum 65 -Maximum 91) })
$digits = '{0:D2}' -f (Get-Random -Minimum 0 -Maximum 100)
$newName = $prefix + '-' + $letters + $digits

$script = "while(`$true){ Write-Host 'Hello from loop. Name: $newName'; break }"
Invoke-Expression $script
