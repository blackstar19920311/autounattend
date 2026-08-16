const NS = 'urn:schemas-microsoft-com:unattend';
const REQUIRED_PASSES = ['windowsPE', 'specialize', 'oobeSystem'];

function validateWithDom(xml) {
  if (typeof DOMParser === 'undefined') return;
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('Answer file is not well-formed XML.');
  const root = document.documentElement;
  if (root?.localName !== 'unattend' || root.namespaceURI !== NS) throw new Error('Invalid unattend root or namespace.');
  const passes = [...document.getElementsByTagNameNS(NS, 'settings')].map(node => node.getAttribute('pass'));
  if (passes.length !== REQUIRED_PASSES.length || REQUIRED_PASSES.some(pass => !passes.includes(pass))) throw new Error('Required unattend passes are missing.');
}

export function assertUnattendStructure(xml) {
  if (typeof xml !== 'string' || !xml.trim()) throw new Error('Answer file is empty.');
  if (!xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')) throw new Error('Answer file must use UTF-8 XML declaration.');
  if (!xml.includes(`xmlns="${NS}"`)) throw new Error('Invalid unattend namespace.');
  const passMatches = [...xml.matchAll(/<settings\s+pass="([^"]+)">/g)].map(m => m[1]);
  if (passMatches.length !== REQUIRED_PASSES.length || REQUIRED_PASSES.some(pass => !passMatches.includes(pass))) throw new Error('Answer file must contain windowsPE, specialize and oobeSystem passes.');
  if (new Set(passMatches).size !== passMatches.length) throw new Error('Duplicate unattend settings pass.');
  if ((xml.match(/<component\s/g) || []).length !== (xml.match(/<\/component>/g) || []).length) throw new Error('Unbalanced component elements.');
  if (/<(?:FirstLogonCommands|RunSynchronous|AutoLogon)\b/.test(xml)) throw new Error('Interactive or executable command content is forbidden.');
  if (/<PlainText>true<\/PlainText>/.test(xml)) throw new Error('Plaintext passwords are forbidden.');
  validateWithDom(xml);
  return xml;
}
