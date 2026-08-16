const CONTROL = /[-\u001F\u007F-\u009F]/;
const KEY = /^[A-Za-z0-9]{5}(?:-[A-Za-z0-9]{5}){4}$/;
const RESERVED = /^(administrator|guest|defaultaccount|system|localservice|networkservice)$/i;
const NAME_RESERVED = /^(con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])$/i;
export function validateConfig(config, t = key => key) {
  const errors = {}; const tr = (k, fallback) => t(k) === k ? fallback : t(k); const username = String(config.username || '').trim();
  if (!username) errors.username = tr('val.username.req', 'Username is required.'); else if (username.length > 20 || /^[ .]|[ .]$|[\\/\[\]:|<>+=;,?*"]/.test(username) || RESERVED.test(username)) errors.username = 'Invalid or reserved Windows account name.';
  const name = String(config.computerName || '').trim(); const max = config.randomSuffix === true ? 8 : 15;
  if (!name) errors.computerName = 'Computer name is required.'; else if (name.length > max || /[^A-Za-z0-9-]/.test(name) || NAME_RESERVED.test(name)) errors.computerName = 'Invalid computer name or prefix.';
  if (config.productKey?.trim() && !KEY.test(config.productKey.trim())) errors.productKey = tr('val.productKey.format', 'Invalid product key format.');
  if (username && !config.password) errors.password = 'A non-empty password is required for the local account.';
  if (config.password && CONTROL.test(config.password)) errors.password = 'Password contains control characters.';
  if (config.autoLogin && !config.password) errors.password = 'AutoLogon requires a non-empty password.';
  if (config.autoLogin && config.randomSuffix) errors.autoLogin = 'AutoLogon is not supported with generated machine names.';
  const wifi = config.wifi || {};
  if (wifi.mode === 'auto') { if (!wifi.ssid?.trim() || CONTROL.test(wifi.ssid) || new TextEncoder().encode(wifi.ssid).length > 32) errors['wifi.ssid'] = 'SSID must be 1-32 bytes and contain no control characters.'; if (!wifi.password || CONTROL.test(wifi.password) || wifi.password.length > 63) errors['wifi.password'] = 'Wi-Fi password must be 8-63 characters and contain no control characters.'; }
  const p = config.partitioning || {};
  if (p.enabled && p.mode === 'custom') errors.customDiskpartScript = 'Custom diskpart scripts are disabled in the hardened generator.';
  if (config.bypassHardware || config.bypassNetwork || config.disableUAC || config.disableTelemetry || config.disableSleep || config.disableFastStartup || config.hideTaskbarIcons || config.showAllTrayIcons || config.cleanStartPins || config.customScripts?.domainJoin || config.customScripts?.office || config.customScripts?.wingetApps !== 'none' || config.customScripts?.pcManager || config.customScripts?.windowsUpdate) errors.security = 'This configuration contains unsupported or unsafe deployment actions. Remove them before generating.';
  if (p.fullWipe) errors.fullWipe = 'Full-disk wipe is disabled in the hardened generator.';
  return { isValid: Object.keys(errors).length === 0, errors };
}
