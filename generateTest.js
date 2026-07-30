import fs from 'fs';
import { generateXml } from './src/utils/generateXml.js';

const config = {
  computerName: 'Karmester',
  randomSuffix: true,
  autoLogon: true,
  localUser: { username: 'Rendszergazda', password: '123' },
  disableSleep: true,
  hideTaskbarIcons: true,
  showAllTrayIcons: true,
  disableMouseAcceleration: true,
  explorerToThisPC: true,
  showHiddenFiles: true,
  showFileExtensions: true,
  bypassNetwork: true,
  disableTelemetry: true,
  disableUAC: true,
  disableFastStartup: true,
  addEnglishKeyboard: true,
  partitioning: { mode: 'autocd', fullWipe: true },
  customScripts: {
    winget: 'presetA',
    office: 'versionA',
    pcManager: true,
    windowsUpdate: true
  }
};

const xml = generateXml(config, 'hu');
fs.writeFileSync('teszt.xml', xml, 'utf8');
console.log('teszt.xml sikeresen generálva!');
