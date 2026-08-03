const fs = require('fs');
const { generateXml } = require('../src/utils/generateXml.js');

// Mock config matching the screenshot
const config = {
  // 1. Rendszerinformációk
  usePresets: false,
  installLanguage: 'hu',
  architecture: 'amd64',
  addEnglishKeyboard: false,

  // 2. Particionálás
  partitioning: {
    enabled: true,
    mode: 'auto',
    fullWipe: false,
    diskNumber: 0,
    customDiskpartScript: '',
    installPartitionId: 3,
  },

  // 3. Megkerülések
  bypassHardware: false,
  bypassNetwork: false,
  autoAcceptEula: false,

  // 4. Hálózat és Wi-Fi
  wifi: { mode: 'skip' },

  // 5. Felhasználói fiók
  computerName: 'PC',
  randomSuffix: false,
  productKey: '',
  username: 'RG',
  password: '',
  autoLogin: false,

  // 6. Személyre szabás (ALL FALSE as in the image)
  desktopIcons: {
    computer: false,
    recycleBin: false,
    userFiles: false,
    controlPanel: false,
    network: false,
  },
  searchBoxMode: 'full', // "Teljes"
  hideTaskbarIcons: false,
  showAllTrayIcons: false,
  disableTransparency: false,
  hideRecentApps: false,
  hideMostUsedApps: false,
  hideRecommendedFiles: false,
  hideTipsAndSuggestions: false,
  disableWebSearch: false,
  cleanStartPins: false,

  // 7. Adatvédelem
  disableTelemetry: false,
  disableEdgeFirstRun: false,
  
  // 8. Teljesítmény
  disableUAC: false,
  disableFastStartup: false,
  disableSleep: false,
  disableMouseAcceleration: false,

  // 9. Bloatware
  bloatware: {
    todo: false, experiencesApp: false, stickyNotes: false, quickAssist: false,
    weather: false, camera: false, bingNews: false, clipchamp: false,
    clock: false, outlook: false, powerAutomate: false, solitaire: false,
    terminal: false, feedbackHub: false,
  },
  
  // 10. Egyéni szkriptek
  customScripts: {
    windowsUpdate: false, wingetApps: 'none', wingetCustomApps: [],
    office: 'none', officeKey: '', pcManager: false, domainJoin: false,
  }
};

const xml = generateXml(config);
fs.writeFileSync('test_out.xml', xml, 'utf8');
console.log('XML generated.');
