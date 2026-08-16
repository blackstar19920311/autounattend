import test from 'node:test';
import assert from 'node:assert/strict';
import { generateXml, validateGeneratedXml } from './generateXml.js';
import { validateConfig } from './validation.js';

test('generated XML is well formed and contains safe credential flags', () => {
  const xml = generateXml({ installLanguage: 'hu', architecture: 'amd64', username: 'operator', password: 'Long-enough-Password-123', computerName: 'PC', partitioning: { enabled: true, mode: 'auto' } });
  assert.doesNotThrow(() => validateGeneratedXml(xml));
  assert.match(xml, /<PlainText>false<\/PlainText>/);
  assert.doesNotMatch(xml, /LabConfig|BypassNRO|ExecutionPolicy Bypass|certutil/);
});

test('control characters and unsafe deployment features are rejected', () => {
  assert.equal(validateConfig({ username: 'user', password: 'safe', computerName: 'PC', bypassHardware: true }).isValid, false);
  assert.equal(validateConfig({ username: 'user', password: 'safe', computerName: 'PC', wifi: { mode: 'auto', ssid: 'Corp-Guest', password: '12345678' } }).isValid, true);
});
