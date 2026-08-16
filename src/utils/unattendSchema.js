const NS = 'urn:schemas-microsoft-com:unattend';
const REQUIRED_PASSES = ['windowsPE', 'specialize', 'oobeSystem'];

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
  return xml;
}
