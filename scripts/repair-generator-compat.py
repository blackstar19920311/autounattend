from pathlib import Path

path = Path('src/utils/generateXml.js')
s = path.read_text(encoding='utf-8')

# XML 1.0: preserve TAB/LF/CR, remove every other C0 control character.
s = s.replace(".replace(/[-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g, '')", ".replace(/[\-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g, '')")

# Resolve winget mode from the public config at the point where the OOBE files
# are built, rather than relying only on a derived property created earlier.
old = "  const installers = [];\n  const cs = config.customScripts || {};\n\n  if (config.wingetMode !== 'none') {"
new = "  const installers = [];\n  const cs = config.customScripts || {};\n  const wingetModeMap = { versionA: 'presetA', versionB: 'presetB', presetA: 'presetA', presetB: 'presetB', custom: 'custom' };\n  const wingetMode = wingetModeMap[cs.wingetApps ?? cs.winget ?? config.wingetMode ?? 'none'] || 'none';\n\n  if (wingetMode !== 'none') {"
if old not in s:
    raise SystemExit('winget anchor not found')
s = s.replace(old, new, 1)
s = s.replace("if (config.wingetMode === 'presetA') wingetCode = SCRIPTS.wingetAppsA;", "if (wingetMode === 'presetA') wingetCode = SCRIPTS.wingetAppsA;")
s = s.replace("else if (config.wingetMode === 'presetB') wingetCode = SCRIPTS.wingetAppsB;", "else if (wingetMode === 'presetB') wingetCode = SCRIPTS.wingetAppsB;")
s = s.replace("else if (config.wingetMode === 'custom') {", "else if (wingetMode === 'custom') {")

# Accept the canonical public key and legacy spellings, and always emit the
# value in Microsoft-Windows-Setup/UserData when it is non-empty.
old_key = "  const productKey = String(config.productKey || '').trim();"
new_key = "  const productKey = String(config.productKey ?? config.productkey ?? config.windowsProductKey ?? '').trim();"
if old_key not in s:
    raise SystemExit('product key anchor not found')
s = s.replace(old_key, new_key, 1)

path.write_text(s, encoding='utf-8')
