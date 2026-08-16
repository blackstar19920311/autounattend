/** Validates the complete generator configuration before XML generation. */
export function validateConfig(config, t) {
  const errors = {};
  const tr = (key, fallback) => { const value = t(key); return value === key ? fallback : value };
  const username = String(config.username || '').trim();
  if (!username) errors.username = tr('val.username.req', 'Username is required.');
  else if (username.length > 20) errors.username = tr('val.username.max', 'Username is too long.');
  else if (/^[ .]|[ .]$|[\\/\[\]:|<>+=;,?*"]/.test(username)) errors.username = tr('val.username.invalidChars', 'Username contains invalid characters.');
  else if (/^(administrator|guest|defaultaccount|system|localservice|networkservice)$/i.test(username)) errors.username = 'This Windows account name is reserved.';

  const name = String(config.computerName || '').trim();
  if (config.randomSuffix && !name) errors.computerName = tr('val.computerName.prefixReq', 'Computer name prefix is required.');
  else if (name.length > (config.randomSuffix ? 8 : 15)) errors.computerName = tr('val.computerName.maxLength', 'Computer name prefix is too long.');
  else if (name && /[^a-zA-Z0-9-]/.test(name)) errors.computerName = tr('val.computerName.invalidChars', 'Computer name contains invalid characters.');
  else if (name && /[. ]$/.test(name)) errors.computerName = tr('val.computerName.invalidChars', 'Computer name contains invalid characters.');
  else if (name && /^(con|prn|aux|nul|clock\$|com[1-9]|lpt[1-9])$/i.test(name)) errors.computerName = tr('val.computerName.reserved', 'This computer name is reserved by Windows.');

  if (config.productKey?.trim() && !/^[A-Za-z0-9]{5}(-[A-Za-z0-9]{5}){4}$/.test(config.productKey.trim())) errors.productKey = tr('val.productKey.format', 'Invalid product key format.');
  if (config.partitioning?.enabled && ['auto', 'autocd'].includes(config.partitioning.mode) && (config.partitioning.diskNumber === '' || config.partitioning.diskNumber == null || Number(config.partitioning.diskNumber) < 0)) errors['disk-number'] = 'Disk number is required.';
  if (config.partitioning?.enabled && config.partitioning.mode === 'custom') {
    const script = String(config.partitioning.customDiskpartScript || '').trim();
    if (!script) errors.customDiskpartScript = tr('val.part.scriptReq', 'DISKPART script is required.');
    else if (!/^\s*select\s+disk(?:\s*=\s*|\s+)\d+/im.test(script)) errors.customDiskpartScript = 'DISKPART script must start with a SELECT DISK command.';
    if (!Number.isInteger(Number(config.partitioning.installPartitionId)) || Number(config.partitioning.installPartitionId) < 1) errors.installPartitionId = tr('val.part.idReq', 'Installation partition must be at least 1.');
  }
  if (config.wifi?.mode === 'auto') {
    if (!config.wifi.ssid?.trim()) errors['wifi.ssid'] = tr('val.wifi.ssidReq', 'SSID is required.');
    else if (/[-\u001F\u007F]/.test(config.wifi.ssid)) errors['wifi.ssid'] = 'SSID contains unsupported control characters.';
    if (!config.wifi.password?.trim()) errors['wifi.password'] = tr('val.wifi.passReq', 'Wi-Fi password is required.');
    else if (config.wifi.password.length < 8) errors['wifi.password'] = 'WPA/WPA2 passwords must contain at least 8 characters.';
  }
  const cs = config.customScripts || {};
  if (cs.domainJoin) {
    if (!cs.domainName?.trim()) errors.domainName = tr('val.domain.nameReq', 'Domain name is required.');
    if (!cs.domainUser?.trim()) errors.domainUser = tr('val.domain.userReq', 'Domain username is required.');
    if (!cs.domainPass) errors.domainPass = tr('val.domain.passReq', 'Domain password is required.');
    if ([cs.domainName, cs.domainUser, cs.domainPass].some(value => /[\r\n]/.test(String(value || '')))) errors.domainName = 'Domain credentials cannot contain line breaks or control characters.';
  }
  if (cs.office === 'versionB' && cs.officeKey?.trim() && !/^[A-Za-z0-9]{5}(-[A-Za-z0-9]{5}){4}$/.test(cs.officeKey.trim())) errors.officeKey = tr('val.officeKey.format', 'Invalid Office key format.');
  return { isValid: Object.keys(errors).length === 0, errors };
}
