import test from 'node:test';
import assert from 'node:assert/strict';

import { validateConfig } from '../src/utils/validation.js';
import { getDefaultConfig } from '../src/data/defaultConfig.js';
import { formatProductKey } from '../src/utils/formatters.js';

const t = (key) => key;
const cfg = (overrides = {}) => ({ ...getDefaultConfig(), ...overrides });

test('az alapkonfiguráció érvényes', () => {
  const result = validateConfig(cfg(), t);
  assert.equal(result.isValid, true, JSON.stringify(result.errors));
});

test('a validáció ugyanazt a kulcsot ellenőrzi, amit a generátor olvas', () => {
  const result = validateConfig(cfg({ username: '' }), t);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.username);
});

test('üres gépnév hibát ad (nem némán PC-re esik vissza)', () => {
  const result = validateConfig(cfg({ computerName: '', randomSuffix: false }), t);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.computerName);
});

test('a lemezszám tartománya ellenőrzött', () => {
  const c = cfg();
  c.partitioning = { ...c.partitioning, diskNumber: 999 };
  assert.ok(validateConfig(c, t).errors.diskNumber);
});

test('túl kicsi Windows partíció hibát ad', () => {
  const c = cfg();
  c.partitioning = { ...c.partitioning, mode: 'autocd', windowsSizeMb: 4096 };
  assert.ok(validateConfig(c, t).errors.windowsSizeMb);
});

test('az egyéni szkriptben nem létező partíció azonosító hibát ad', () => {
  const c = cfg();
  c.partitioning = {
    ...c.partitioning,
    mode: 'custom',
    customDiskpartScript: 'SELECT DISK=0\nCLEAN\nCREATE PARTITION PRIMARY',
    installPartitionId: 3,
  };
  assert.ok(validateConfig(c, t).errors.installPartitionId);
});

test('nyílt Wi-Fi hálózatnál nem kötelező a jelszó', () => {
  const result = validateConfig(
    cfg({ wifi: { mode: 'auto', ssid: 'FreeWifi', password: '', security: 'open' } }),
    t
  );
  assert.ok(!result.errors['wifi.password'], 'nyílt hálózatnál nem kellene jelszót kérni');
});

test('védett Wi-Fi hálózatnál kötelező a jelszó', () => {
  const result = validateConfig(
    cfg({ wifi: { mode: 'auto', ssid: 'Otthon', password: '', security: 'wpa2psk' } }),
    t
  );
  assert.ok(result.errors['wifi.password']);
});

test('a figyelmeztetések nem blokkolják a generálást', () => {
  const c = cfg({ disableUAC: true, password: 'x' });
  c.partitioning = { ...c.partitioning, fullWipe: true };
  const result = validateConfig(c, t);
  assert.equal(result.isValid, true);
  assert.ok(result.warnings.includes('val.uac.warning'));
  assert.ok(result.warnings.includes('val.part.fullWipeWarning'));
  assert.ok(result.warnings.includes('val.password.plaintextWarning'));
});

test('D: útvonalra telepítés figyelmeztet, ha nincs D: partíció', () => {
  const c = cfg();
  c.partitioning = { ...c.partitioning, mode: 'auto' };
  c.customScripts = {
    ...c.customScripts,
    wingetApps: 'custom',
    wingetCustomApps: [{ id: 'Valve.Steam', location: 'D:\\Games\\Steam' }],
  };
  assert.ok(validateConfig(c, t).warnings.includes('val.winget.noDriveD'));
});

test('a termékkulcs formázó egységes', () => {
  assert.equal(formatProductKey('aaaaabbbbbcccccdddddeeeee'), 'AAAAA-BBBBB-CCCCC-DDDDD-EEEEE');
  assert.equal(formatProductKey('aaaaa-bbbbb'), 'AAAAA-BBBBB');
  assert.equal(formatProductKey('!!!'), '');
  assert.equal(formatProductKey('aaaaabbbbbcccccdddddeeeeeffff').length, 29);
});

test('érvénytelen Office kulcs formátum hibát ad', () => {
  const c = cfg();
  c.customScripts = { ...c.customScripts, office: 'versionB', officeKey: 'NOTAKEY' };
  assert.ok(validateConfig(c, t).errors.officeKey);
});
