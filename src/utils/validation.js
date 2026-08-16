const CONTROL = /[-\u001F\u007F-\u009F]/;
const KEY = /^[A-Za-z0-9]{5}(?:-[A-Za-z0-9]{5}){4}$/;
const RESERVED = /^(administrator|guest|defaultaccount|system|localservice|networkservice)$/i;
const NAME_RESERVED = /^(con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])$/i;
export function validateConfig(config, t = key => key) {
  const errors = {}; const tr = (k, fallback) => t(k) === k ? fallback : t(k); const username = String(config.username || '').trim(); const cs = config.customScripts || {}; const p = config.partitioning || {};
  if (!username) errors.username = tr('val.username.req', 'Username is required.'); else if (username.length > 20 || /^[ .]|[ .]$|[\\/\[\]:|<>+=;,?*"]/.test(username) || RESERVED.test(username)) errors.username = 'Invalid or reserved Windows account name.';
  const name = String(config.computerName || '').trim(); const max = config.randomSuffix === true ? 8 : 15;
  if (!name) errors.computerName = 'Computer name is required.'; else if (name.length > max || /[^A-Za-z0-9-]/.test(name) || NAME_RESERVED.test(name)) errors.computerName = 'Invalid computer name or prefix.';
  if (config.productKey?.trim() && !KEY.test(config.productKey.trim())) errors.productKey = tr('val.productKey.format', 'Invalid product key format.');
  if (username && !config.password) errors.password = 'A non-empty password is required for the local account.';
  if (config.password && CONTROL.test(config.password)) errors.password = 'Password contains control characters.';
  if (config.autoLogin) errors.autoLogin = 'AutoLogon is disabled in the hardened 25H2 generator.';
  const wifi = config.wifi || {};
  if (wifi.mode === 'auto') errors.wifi = 'Automatic Wi-Fi profile generation is disabled. Provision Wi-Fi with Intune or managed deployment.';
  if (wifi.ssid && CONTROL.test(wifi.ssid)) errors['wifi.ssid'] = 'SSID contains control characters.';
  if (wifi.password && CONTROL.test(wifi.password)) errors['wifi.password'] = 'Wi-Fi password contains control characters.';
  if (p.enabled && ['auto', 'autocd', 'custom'].includes(p.mode)) errors.partitioning = 'Automatic and custom disk partitioning are disabled in the hardened 25H2 generator. Use Windows Setup or managed imaging to create the ESP, MSR, OS and WinRE partitions.';
  const unsupportedPersonalization = config.desktopIcons && Object.values(config.desktopIcons).some(Boolean) || config.searchBoxMode && config.searchBoxMode !== 'full' || config.hideTaskbarIcons || config.showAllTrayIcons || config.disableTransparency || config.disableWallpaperChange || config.hideRecentApps || config.hideMostUsedApps || config.hideRecommendedFiles || config.hideTipsAndSuggestions || config.disableWebSearch || config.cleanStartPins || config.disableEdgeFirstRun || config.disableMouseAcceleration || config.bloatware && Object.values(config.bloatware).some(Boolean);
  if (unsupportedPersonalization) errors.personalization = 'This personalization or app-removal option is not emitted by the hardened answer file. Use Intune policy or a supported provisioning package instead.';
  if (config.bypassHardware || config.bypassNetwork || config.disableUAC || config.disableTelemetry || config.disableSleep || config.disableFastStartup || cs.domainJoin || cs.office || (cs.wingetApps && cs.wingetApps !== 'none') || cs.pcManager || cs.windowsUpdate) errors.security = 'This configuration contains unsupported or unsafe deployment actions. Remove them before generating.';
  if (p.fullWipe) errors.fullWipe = 'Full-disk wipe is disabled in the hardened generator.';
  if (config.autoAcceptEula === false) errors.autoAcceptEula = 'EULA acceptance must be enabled for unattended deployment.';
  return { isValid: Object.keys(errors).length === 0, errors };
}
