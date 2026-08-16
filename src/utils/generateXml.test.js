import test from 'node:test';
import assert from 'node:assert/strict';
import { generateXml, validateGeneratedXml, escapeXml } from './generateXml.js';
import { validateConfig } from './validation.js';

test('generated XML has safe structure and no deployment payloads', () => {
  const xml = generateXml({ installLanguage: 'hu', architecture: 'amd64', username: 'operator', password: 'Long-enough-Password-123', computerName: 'PC', partitioning: { enabled: false, mode: 'manual' } });
  assert.doesNotThrow(() => validateGeneratedXml(xml));
  assert.match(xml, /<PlainText>false<\/PlainText>/);
  assert.match(xml, /<UserData>[\s\S]*<AcceptEula>true<\/AcceptEula>[\s\S]*<\/UserData>/);
  assert.doesNotMatch(xml, /LabConfig|BypassNRO|ExecutionPolicy Bypass|certutil|RunSynchronous|AutoLogon/);
});

test('unsafe options and malformed input are rejected', () => {
  assert.equal(validateConfig({ username: 'user', password: 'safe', computerName: 'PC', bypassHardware: true }).isValid, false);
  assert.equal(validateConfig({ username: 'user', password: 'safe', computerName: 'PC', partitioning: { enabled: true, mode: 'auto' } }).isValid, false);
  assert.equal(validateConfig({ username: 'user', password: 'safe', computerName: 'PC', wifi: { mode: 'auto', ssid: 'Corp-Guest', password: '12345678' } }).isValid, false);
  assert.equal(validateConfig({ username: 'user', password: 'safe', computerName: 'PC', autoLogin: true }).isValid, false);
  assert.equal(validateConfig({ username: 'user', password: 'safe', computerName: 'PC', desktopIcons: { computer: true } }).isValid, false);
  assert.equal(validateConfig({ username: 'user', password: 'safe', computerName: 'PC', wifi: { mode: 'skip', ssid: 'Corp-Guest', password: '' } }).isValid, true);
  assert.equal(validateConfig({ username: 'user', password: 'safe', computerName: 'PC', wifi: { mode: 'skip', ssid: 'Corp\nGuest', password: '' } }).isValid, false);
  assert.equal(escapeXml('Corp-Guest'), 'Corp-Guest');
  assert.throws(() => escapeXml('bad\u0001value'));
});
