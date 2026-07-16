/**
 * Konfiguráció validálása a Windows 11 Autounattend generátorhoz.
 * Támogatja az i18n fordításokat.
 */

/**
 * Validates the autounattend configuration object.
 * @param {Object} config - The configuration object to validate.
 * @param {Function} t - The translation function.
 * @returns {{ isValid: boolean, errors: Object.<string, string> }}
 */
export function validateConfig(config, t) {
  const errors = {};

  // 1. Felhasználónév - kötelező
  if (!config.username || config.username.trim() === '') {
    errors.username = config.autoLogin ? t('val.autoLogin.usernameReq') : t('val.username.req');
  } else if (config.username.length > 20) {
    errors.username = t('val.username.max');
  } else if (!/^[a-zA-Z0-9\s\-_áéíóöőúüűÁÉÍÓÖŐÚÜŰ.]+$/.test(config.username)) {
    errors.username = t('val.username.invalidChars');
  }

  // 2. Számítógépnév
  const name = (config.computerName || '').trim();
  if (config.randomSuffix && !name) {
    errors.computerName = t('val.computerName.prefixReq');
  } else if (name.length > 0) {
    const maxLen = config.randomSuffix ? 8 : 15;
    if (name.length > maxLen) {
      errors.computerName = t('val.computerName.maxLength');
    } else if (/[^a-zA-Z0-9-]/.test(name)) {
      errors.computerName = t('val.computerName.invalidChars');
    }
  }

  // 3. Termékkulcs
  if (config.productKey && config.productKey.trim() !== '') {
    const productKeyPattern = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
    if (!productKeyPattern.test(config.productKey.trim())) {
      errors.productKey = t('val.productKey.format');
    }
  }

  // 4. Automatikus bejelentkezés
  // 4. Automatikus bejelentkezés (kezeltük az 1. lépésben)

  // 5. Particionálás
  if (config.partitioning && config.partitioning.enabled && config.partitioning.mode === 'custom') {
    if (!config.partitioning.customDiskpartScript || config.partitioning.customDiskpartScript.trim() === '') {
      errors.customDiskpartScript = t('val.part.scriptReq');
    }
    const partId = String(config.partitioning.installPartitionId).trim();
    if (partId === '' || isNaN(partId) || Number(partId) < 1) {
      errors.installPartitionId = t('val.part.idReq');
    }
  }

  // 6. Wi-Fi beállítások
  if (config.wifi && config.wifi.mode === 'auto') {
    if (!config.wifi.ssid || config.wifi.ssid.trim() === '') {
      errors['wifi.ssid'] = t('val.wifi.ssidReq');
    }
    if (!config.wifi.password || config.wifi.password.trim() === '') {
      errors['wifi.password'] = t('val.wifi.passReq');
    }
  }

  // 7. Domain Join
  if (config.customScripts && config.customScripts.domainJoin) {
    if (!config.customScripts.domainName || config.customScripts.domainName.trim() === '') {
      errors.domainName = t('val.domain.nameReq');
    }
    if (!config.customScripts.domainUser || config.customScripts.domainUser.trim() === '') {
      errors.domainUser = t('val.domain.userReq');
    }
    if (!config.customScripts.domainPass || config.customScripts.domainPass.trim() === '') {
      errors.domainPass = t('val.domain.passReq');
    }
  }

  // 8. Office Key Validáció
  if (config.customScripts && config.customScripts.office === 'versionB') {
    if (config.customScripts.officeKey && config.customScripts.officeKey.trim() !== '') {
      const officeKeyPattern = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
      if (!officeKeyPattern.test(config.customScripts.officeKey.trim())) {
        errors.officeKey = t('val.officeKey.format');
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
