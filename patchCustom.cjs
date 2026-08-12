const fs = require('fs');
let f = fs.readFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\src\\utils\\customScripts.js', 'utf8');
const lines = f.split('\n');
const newLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.includes('function Remove-FallbackTask')) {
        skip = true;
        continue;
    }
    if (skip && l.includes('}')) {
        skip = false;
        continue;
    }
    if (skip) continue;
    
    if (l.includes('$attempt')) continue;
    if (l.includes('Remove-FallbackTask')) {
        if (l.includes('exit 0')) {
            newLines.push('  exit 0');
            continue;
        }
        continue;
    }
    if (l.includes('if (Test-Path $AttemptFlag)')) {
        skip = true;
        continue;
    }
    if (l.includes('$AttemptFlag')) continue;
    if (l.includes('$MaxAttempts')) continue;
    
    if (l.includes('if ($success -or $attempt -ge $MaxAttempts)')) {
        newLines.push('  if ($success) {');
        continue;
    }
    if (l.includes('Write-Log (\'A fallback task ujra fogja probalni')) {
        // Drop this line and the '} else {' before it
        newLines.pop();
        continue;
    }
    
    newLines.push(l);
}
fs.writeFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\src\\utils\\customScripts.js', newLines.join('\n'));
