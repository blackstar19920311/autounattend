const XML_ILLEGAL = /[-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/;

export function escapeXml(value) {
  const text = String(value ?? '');
  if (XML_ILLEGAL.test(text)) throw new Error('Input contains characters that are illegal in XML 1.0.');
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function tag(name, value, indent = 0) { if (value === undefined || value === null || value === '') return ''; return `${' '.repeat(indent)}<${name}>${escapeXml(value)}</${name}>`; }
function component(name, arch, body, indent = 4) { const attrs = `name="${name}" processorArchitecture="${arch}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS"`; return [`${' '.repeat(indent)}<component ${attrs}>`, body, `${' '.repeat(indent)}</component>`].filter(Boolean).join('\n'); }
function utf16leBase64(text) { const value = String(text); const bytes = []; for (let i = 0; i < value.length; i += 1) { const c = value.charCodeAt(i); bytes.push(c & 255, c >> 8); } let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.slice(i, i + 0x8000)); return btoa(binary); }
function encodedPassword(password) { return utf16leBase64(`${password}Password`); }
function archOf(config) { return config.architecture === 'arm64' ? 'arm64' : 'amd64'; }
function localeOf(config) { return config.installLanguage === 'en' ? 'en-US' : 'hu-HU'; }
function computerName(config) { const raw = String(config.computerName || 'PC').trim().toUpperCase().replace(/[^A-Z0-9-]/g, ''); return config.randomSuffix ? '*' : (raw || '*').slice(0, 15); }

function windowsPe(config, arch, locale) {
  const lines = ['  <settings pass="windowsPE">'];
  lines.push(component('Microsoft-Windows-International-Core-WinPE', arch, ['      <SetupUILanguage>', tag('UILanguage', locale, 8), '      </SetupUILanguage>', tag('InputLocale', config.addEnglishKeyboard && locale === 'hu-HU' ? '040e:0000040e;0409:00000409' : locale === 'hu-HU' ? '040e:0000040e' : '0409:00000409', 6), tag('SystemLocale', locale, 6), tag('UILanguage', locale, 6), tag('UserLocale', locale, 6)].join('\n')));
  const userData = ['        <AcceptEula>true</AcceptEula>'];
  if (config.productKey?.trim()) userData.push('        <ProductKey>', tag('Key', config.productKey.trim(), 10), '        </ProductKey>');
  const setup = ['      <UserData>', ...userData, '      </UserData>'];
  // Automatic disk layouts are intentionally not emitted. Windows 11 25H2 WinRE/ESP sizing
  // is media- and device-dependent; managed imaging or Setup UI must choose the target safely.
  lines.push(component('Microsoft-Windows-Setup', arch, setup.join('\n')), '  </settings>'); return lines.join('\n');
}
function specialize(config, arch) { return ['  <settings pass="specialize">', component('Microsoft-Windows-Shell-Setup', arch, tag('ComputerName', computerName(config), 6)), '  </settings>'].join('\n'); }
function oobe(config, arch, locale) {
  const shell = ['      <OOBE>', '        <HideEULAPage>true</HideEULAPage>', '        <HideWirelessSetupInOOBE>false</HideWirelessSetupInOOBE>', '        <ProtectYourPC>1</ProtectYourPC>', '      </OOBE>', tag('TimeZone', config.timeZone || (locale === 'hu-HU' ? 'Central Europe Standard Time' : 'UTC'), 6)];
  const username = String(config.username || '').trim();
  if (username) shell.push('      <UserAccounts>', '        <LocalAccounts>', '          <LocalAccount wcm:action="add">', tag('Name', username, 12), '            <Group>Users</Group>', '            <Password>', tag('Value', encodedPassword(config.password || ''), 14), '              <PlainText>false</PlainText>', '            </Password>', '          </LocalAccount>', '        </LocalAccounts>', '      </UserAccounts>');
  if (config.autoLogin && username) shell.push('      <AutoLogon>', '        <Enabled>true</Enabled>', tag('Username', username, 8), '        <Password>', tag('Value', encodedPassword(config.password || ''), 10), '          <PlainText>false</PlainText>', '        </Password>', '        <LogonCount>1</LogonCount>', '      </AutoLogon>');
  return ['  <settings pass="oobeSystem">', component('Microsoft-Windows-International-Core', arch, [tag('InputLocale', locale === 'hu-HU' && config.addEnglishKeyboard ? '040e:0000040e;0409:00000409' : locale === 'hu-HU' ? '040e:0000040e' : '0409:00000409', 6), tag('SystemLocale', locale, 6), tag('UILanguage', locale, 6), tag('UserLocale', locale, 6)].join('\n')), component('Microsoft-Windows-Shell-Setup', arch, shell.join('\n')), '  </settings>'].join('\n');
}
export function generateXml(config = {}) { const arch = archOf(config); const locale = localeOf(config); return ['<?xml version="1.0" encoding="utf-8"?>', '<!-- Generated for Windows 11 25H2. Password values are obfuscated, not encrypted. Delete the answer file after use. -->', '<unattend xmlns="urn:schemas-microsoft-com:unattend" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">', windowsPe(config, arch, locale), specialize(config, arch), oobe(config, arch, locale), '</unattend>'].join('\n'); }
export function validateGeneratedXml(xml) { if (!xml || !xml.includes('<unattend ') || !xml.endsWith('</unattend>')) throw new Error('Generated answer file is incomplete.'); if (/<PlainText>true<\/PlainText>/.test(xml)) throw new Error('Plaintext credentials are forbidden.'); if (/LabConfig|ExecutionPolicy Bypass|certutil|BypassNRO|ConsentPromptBehaviorAdmin|FirstLogonCommands|RunSynchronous/.test(xml)) throw new Error('Unsupported or unsafe deployment content detected.'); if (!/<TimeZone>/.test(xml)) throw new Error('TimeZone is required for unattended deployment.'); if (typeof DOMParser !== 'undefined') { const parsed = new DOMParser().parseFromString(xml, 'application/xml'); if (parsed.querySelector('parsererror')) throw new Error('Generated answer file is not well-formed XML.'); const root = parsed.documentElement; if (root.namespaceURI !== 'urn:schemas-microsoft-com:unattend') throw new Error('Invalid unattend namespace.'); const passes = [...parsed.getElementsByTagNameNS('urn:schemas-microsoft-com:unattend', 'settings')].map(node => node.getAttribute('pass')); if (new Set(passes).size !== passes.length) throw new Error('Duplicate unattend settings pass.'); } return xml; }
