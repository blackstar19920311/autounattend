function Decode-XmlScripts($xmlFile, $outDir) {
    [xml]$xml = Get-Content $xmlFile -Encoding UTF8
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    
    # Parse RunSynchronousCommand blocks
    $cmds = $xml.SelectNodes('//*[local-name()="RunSynchronousCommand"]')
    if ($cmds) {
        $i = 1
        foreach ($cmd in $cmds) {
            $path = $cmd.Path
            $desc = $cmd.Description
            $content = "$path`n$desc"
            
            if ($path -match "-EncodedCommand\s+([A-Za-z0-9+/=]+)") {
                $b64 = $matches[1]
                try {
                    $bytes = [Convert]::FromBase64String($b64)
                    $decoded = [Text.Encoding]::Unicode.GetString($bytes)
                    $content += "`n--- DECODED ---`n$decoded"
                } catch {}
            }
            
            Set-Content -Path "$outDir\RunSync_$i.txt" -Value $content -Encoding UTF8
            $i++
        }
    }

    # Parse FirstLogonCommands
    $fcmds = $xml.SelectNodes('//*[local-name()="FirstLogonCommands"]/*[local-name()="SynchronousCommand"]')
    if ($fcmds) {
        $j = 1
        foreach ($cmd in $fcmds) {
            $path = $cmd.CommandLine
            $desc = $cmd.Description
            $content = "$path`n$desc"
            
            if ($path -match "-EncodedCommand\s+([A-Za-z0-9+/=]+)") {
                $b64 = $matches[1]
                try {
                    $bytes = [Convert]::FromBase64String($b64)
                    $decoded = [Text.Encoding]::Unicode.GetString($bytes)
                    $content += "`n--- DECODED ---`n$decoded"
                } catch {}
            }
            Set-Content -Path "$outDir\FirstLogon_$j.txt" -Value $content -Encoding UTF8
            $j++
        }
    }

    # Parse File elements
    $files = $xml.SelectNodes('//*[local-name()="File"]')
    if ($files) {
        foreach ($f in $files) {
            $path = $f.path
            $b64 = $f.InnerText.Trim()
            $content = "Path: $path`n"
            try {
                $bytes = [Convert]::FromBase64String($b64)
                $decoded = [Text.Encoding]::UTF8.GetString($bytes)
                if ($decoded -match "\0") {
                    $decoded = [Text.Encoding]::Unicode.GetString($bytes)
                }
                $content += "`n--- DECODED ---`n$decoded"
            } catch {
                $content += "`n--- DECODED ---`nRAW: $b64"
            }
            $safeName = $path -replace '[\\/:*?"<>|]', '_'
            Set-Content -Path "$outDir\File_$safeName.txt" -Value $content -Encoding UTF8
        }
    }
}

if (Test-Path "autounattend.xml") {
    Decode-XmlScripts 'autounattend.xml' 'new_decoded'
}
