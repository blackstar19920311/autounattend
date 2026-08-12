const fs = require('fs');

function patchGenerateXml() {
    let f = fs.readFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\src\\utils\\generateXml.js', 'utf8');

    // Fix `<Order>\${orderRef.val++}</Order>` to `<Order>${orderRef.val++}</Order>`
    f = f.replace(/<Order>\\\${orderRef\.val\+\+}<\/Order>/g, '<Order>${orderRef.val++}</Order>');

    // Remove the fallback task entirely
    const fallbackStart = '    // 4) Fallback SYSTEM Scheduled Task';
    const idxStart = f.indexOf(fallbackStart);
    if (idxStart > -1) {
        const endStr = "      'C:\\\\Windows\\\\Temp\\\\officetask.ps1'\n    );\n";
        const idxEnd = f.indexOf(endStr, idxStart);
        if (idxEnd > -1) {
            f = f.substring(0, idxStart) + f.substring(idxEnd + endStr.length);
        }
    }

    // Fix comments regarding fallback task
    f = f.replace(
        '  // --- Office telepites: SetupComplete.cmd (elsodleges) + SYSTEM task (fallback) ---\n  // A Windows Setup elvileg meghivja a SetupComplete.cmd-t a specialize fazis vegen,\n  // de OEM kulcs eseten neha elmarad. A fallback task ezt kuszoboli ki.\n  // FIGYELEM: OEM licenc (BIOS/DigitalProductId) + nem-Enterprise edition\n  // eseten a windeploy.exe NEM futtatja a SetupComplete.cmd-t, ezert\n  // regisztralunk egy AU-OfficeInstallFallback nevu SYSTEM Scheduled Taskot is.',
        '  // --- Office telepites: SetupComplete.cmd ---\n  // A specialize pass alatt az Office PowerShell-szkript és a\n  // SetupComplete.cmd kihelyezésre kerül.\n  // A tényleges Office-telepítést kizárólag a Windows Setup által\n  // meghívott SetupComplete.cmd végzi SYSTEM jogosultsággal.\n  // Az Office nem fut FirstLogonCommands alatt.'
    );

    f = f.replace(
        "    runSyncCmds.push('        <!-- Office: InstallOffice.ps1 + SetupComplete.cmd kihelyezese + fallback task -->');",
        "    runSyncCmds.push('        <!-- Office: InstallOffice.ps1 + SetupComplete.cmd kihelyezese -->');"
    );

    f = f.replace(
        "    // Office: a telepites a specialize fazisban kihelyezett SetupComplete.cmd-bol\n    // (elso bejelentkezes ELOTT), illetve az AU-OfficeInstallFallback taskbol fut.",
        "    // Office: a telepites kizarolag a specialize fazisban kihelyezett\n    // SetupComplete.cmd fajlbol fut.\n    // A FirstLogonCommands blokk Office-telepitest nem vegez."
    );

    fs.writeFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\src\\utils\\generateXml.js', f);
}

function patchCustomScripts() {
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
        if (l.includes('$TaskName')) continue;
        
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
}

patchGenerateXml();
patchCustomScripts();
