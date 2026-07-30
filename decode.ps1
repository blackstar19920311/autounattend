function Decode-XmlScripts($xmlFile, $outDir) {
    [xml]$xml = Get-Content $xmlFile -Encoding UTF8
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    
    # 1. Parse RunSynchronousCommand blocks
    $cmds = $xml.SelectNodes('//*[local-name()="RunSynchronousCommand"]')
    $i = 1
    foreach ($cmd in $cmds) {
        $path = $cmd.Path
        $desc = $cmd.Description
        $content = "$path`n$desc"
        
        # Check if it has Base64
        if ($path -match "-EncodedCommand\s+([A-Za-z0-9+/=]+)") {
            $b64 = $matches[1]
            try {
                $bytes = [Convert]::FromBase64String($b64)
                $decoded = [Text.Encoding]::Unicode.GetString($bytes)
                $content += "`n--- DECODED ---`n$decoded"
            } catch {}
        }
        
        # Schneegans uses Set-Content and out-file often, let's just dump the text
        Set-Content -Path "$outDir\RunSync_$i.txt" -Value $content -Encoding UTF8
        $i++
    }

    # 2. Parse File elements (for Schneegans style scripts)
    $files = $xml.SelectNodes('//*[local-name()="File"]')
    foreach ($f in $files) {
        $path = $f.path
        $b64 = $f.InnerText.Trim()
        $content = "Path: $path`n"
        try {
            $bytes = [Convert]::FromBase64String($b64)
            # Try UTF8 first, then default
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
Decode-XmlScripts "teszt.xml" "teszt_decoded"
Decode-XmlScripts "schneegans.xml" "schneegans_decoded"
