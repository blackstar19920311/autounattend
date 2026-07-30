import { PRODUCT_KEY_PATTERN } from './formatters.js';

/**
 * Konfiguráció validálása a Windows 11 Autounattend generátorhoz.
 *
 * FONTOS: ez a modul korábban részben MÁS kulcsokat validált, mint amiket a
 * generátor olvasott, illetve olyanokat, amiket a generátor egyáltalán nem
 * használt. Most ugyanazt a sémát ellenőrzi, amit a generátor feldolgoz.
 */

const MAX_DISK_NUMBER = 63;
const MIN_WINDOWS_SIZE_MB = 32768; // 32 GB – ennél kevesebbel a Win11 nem életképes
const MIN_EFI_SIZE_MB = 100;
const MIN_RECOVERY_SIZE_MB = 512;

/**
 * @param {Object} config - a validálandó konfiguráció
 * @param {Function} t - fordító függvény
 * @returns {{ isValid: boolean, errors: Object.<string, string>, warnings: string[] }}
 */
export function validateConfig(config, t) {
  const errors = {};
  const warnings = [];
  const tr = typeof t === 'function' ? t : (k) => k;

  // 1. Felhasználónév
  const username = String(config.username || '').trim();
  if (!username) {
    errors.username = tr('val.username.req');
  } else if (username.length > 20) {
    errors.username = tr('val.username.max');
  } else if (/[/\\[\]:|<>+=;,?*"]/.test(username)) {
    errors.username = tr('val.username.invalidChars');
  }

  // 2. Számítógépnév
  const name = String(config.computerName || '').trim();
  if (!name) {
    // JAVÍTVA: korábban csak randomSuffix esetén jelzett hibát, egyébként a
    // generátor némán 'PC'-re esett vissza.
    errors.computerName = tr('val.computerName.prefixReq');
  } else {
    const maxLen = config.randomSuffix ? 8 : 15;
    if (name.length > maxLen) {
      errors.computerName = tr('val.computerName.maxLength');
    } else if (/[^a-zA-Z0-9-]/.test(name)) {
      errors.computerName = tr('val.computerName.invalidChars');
    }
  }

  // 3. Termékkulcs
  const productKey = String(config.productKey || '').trim();
  if (productKey && !PRODUCT_KEY_PATTERN.test(productKey)) {
    errors.productKey = tr('val.productKey.format');
  }

  // 4. Automatikus bejelentkezés
  if (config.autoLogin && !username) {
    errors.username = errors.username || tr('val.autoLogin.usernameReq');
  }
  if (config.autoLogin && !String(config.password || '')) {
    warnings.push(tr('val.autoLogin.noPassword'));
  }

  // 5. Particionálás
  const part = config.partitioning;
  if (part && part.enabled && part.mode !== 'manual') {
    const diskNumber = part.diskNumber;
    if (diskNumber === '' || diskNumber == null) {
      errors.diskNumber = tr('val.part.diskReq');
    } else {
      const disk = parseInt(diskNumber, 10);
      if (!Number.isFinite(disk) || disk < 0 || disk > MAX_DISK_NUMBER) {
        errors.diskNumber = tr('val.part.diskRange');
      }
    }

    const efi = parseInt(part.efiSizeMb, 10);
    if (Number.isFinite(efi) && efi < MIN_EFI_SIZE_MB) {
      errors.efiSizeMb = tr('val.part.efiTooSmall');
    }

    if (part.mode === 'autocd') {
      const win = parseInt(part.windowsSizeMb, 10);
      if (!Number.isFinite(win) || win < MIN_WINDOWS_SIZE_MB) {
        errors.windowsSizeMb = tr('val.part.windowsTooSmall');
      }
      const rec = parseInt(part.recoverySizeMb, 10);
      if (Number.isFinite(rec) && rec < MIN_RECOVERY_SIZE_MB) {
        errors.recoverySizeMb = tr('val.part.recoveryTooSmall');
      }
      warnings.push(tr('val.part.sizeWarning'));
    }

    if (part.fullWipe) {
      warnings.push(tr('val.part.fullWipeWarning'));
    }

    if (part.mode === 'custom') {
      const script = String(part.customDiskpartScript || '').trim();
      if (!script) {
        errors.customDiskpartScript = tr('val.part.scriptReq');
      }
      const installId = parseInt(part.installPartitionId, 10);
      if (!Number.isFinite(installId) || installId < 1) {
        errors.installPartitionId = tr('val.part.idReq');
      } else if (script) {
        // JAVÍTVA: eddig senki nem ellenőrizte, hogy az egyéni szkript egyáltalán
        // létrehoz-e annyi partíciót, amennyit a telepítési cél megkíván.
        const created = (script.match(/CREATE\s+PARTITION/gi) || []).length;
        if (created > 0 && installId > created) {
          errors.installPartitionId = tr('val.part.idOutOfRange');
        }
      }
    }
  }

  // 6. Wi-Fi
  if (config.wifi && config.wifi.mode === 'auto') {
    if (!String(config.wifi.ssid || '').trim()) {
      errors['wifi.ssid'] = tr('val.wifi.ssidReq');
    }
    // JAVÍTVA: nyílt hálózatnál nincs jelszó, korábban mégis kötelező volt.
    if (config.wifi.security !== 'open' && !String(config.wifi.password || '')) {
      errors['wifi.password'] = tr('val.wifi.passReq');
    }
    if (String(config.wifi.password || '')) {
      warnings.push(tr('val.wifi.plaintextWarning'));
    }
  }

  // 7. Domain Join
  const cs = config.customScripts || {};
  if (cs.domainJoin) {
    if (!String(cs.domainName || '').trim()) {
      errors.domainName = tr('val.domain.nameReq');
    }
    if (!String(cs.domainUser || '').trim()) {
      errors.domainUser = tr('val.domain.userReq');
    }
    if (!String(cs.domainPass || '').trim()) {
      errors.domainPass = tr('val.domain.passReq');
    } else {
      warnings.push(tr('val.domain.plaintextWarning'));
    }
  }

  // 8. Office kulcs
  if (cs.office === 'versionB') {
    const officeKey = String(cs.officeKey || '').trim();
    if (officeKey && !PRODUCT_KEY_PATTERN.test(officeKey)) {
      errors.officeKey = tr('val.officeKey.format');
    }
  }

  // 9. Egyéni winget útvonalak D:-re, de nincs D: partíció
  if (cs.wingetApps === 'custom' && part && part.enabled && part.mode === 'auto') {
    const hasDPath = (cs.wingetCustomApps || []).some((a) => /^D:/i.test(String(a.location || '')));
    if (hasDPath) {
      warnings.push(tr('val.winget.noDriveD'));
    }
  }

  // 10. UAC
  if (config.disableUAC) {
    warnings.push(tr('val.uac.warning'));
  }

  if (String(config.password || '')) {
    warnings.push(tr('val.password.plaintextWarning'));
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
