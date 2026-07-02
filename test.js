const prefix = 'PC';
const psScript = `
$letters = -join (1..2 | ForEach-Object { [char](Get-Random -Minimum 65 -Maximum 91) })
$digits = '{0:D2}' -f (Get-Random -Minimum 0 -Maximum 100)
$newName = '${prefix.replace(/'/g, "''")}-' + $letters + $digits
$script = "while(\`$true){ Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ComputerName' 'ComputerName' '$newName' -Force; Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\ComputerName\\ActiveComputerName' 'ComputerName' '$newName' -Force; Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters' 'Hostname' '$newName' -Force; Set-ItemProperty 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters' 'NV Hostname' '$newName' -Force; Start-Sleep -Milliseconds 50; break }"
$script | Out-File -FilePath 'test_loop.ps1' -Encoding ascii
Start-Process -FilePath 'powershell.exe' -ArgumentList '-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File test_loop.ps1' -Wait
`;
console.log(psScript);
const fs = require('fs');
fs.writeFileSync('test_gen.ps1', psScript);
