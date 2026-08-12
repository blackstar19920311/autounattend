const fs = require('fs');

function escapeForTemplateLiteral(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
}

const customScripts = fs.readFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\src\\utils\\customScripts.js', 'utf8');

const prefix = customScripts.substring(0, customScripts.indexOf('  officeA: `'));
const suffix = customScripts.substring(customScripts.indexOf('  pcManager: `'));

const officeARaw = fs.readFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\scratch\\officeA.ps1', 'utf8');
const officeBRaw = fs.readFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\scratch\\officeB.ps1', 'utf8');

const officeAEscaped = escapeForTemplateLiteral(officeARaw);
const officeBEscaped = escapeForTemplateLiteral(officeBRaw);

const newContent = prefix + '  officeA: `' + officeAEscaped + '`,\n\n  officeB: `' + officeBEscaped + '`,\n\n' + suffix;

fs.writeFileSync('D:\\OneDrive - Bányai Bajai SZC\\Projektek\\autounattend\\src\\utils\\customScripts.js', newContent);
console.log('Successfully injected properly escaped office scripts into customScripts.js.');
