export function getDefaultConfig() {
  return {
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
      customDiskpartScript: `SELECT DISK=0
CLEAN ALL
CONVERT GPT
CREATE PARTITION EFI SIZE=300
FORMAT QUICK FS=FAT32 LABEL="System"
ASSIGN LETTER=S
CREATE PARTITION MSR SIZE=16
CREATE PARTITION PRIMARY SIZE=153600
FORMAT QUICK FS=NTFS LABEL="Windows"
ASSIGN LETTER=W
CREATE PARTITION PRIMARY
SHRINK MINIMUM=1000
FORMAT QUICK FS=NTFS LABEL="Adatok"
ASSIGN LETTER=D
CREATE PARTITION PRIMARY
FORMAT QUICK FS=NTFS LABEL="Recovery"
ASSIGN LETTER=R
SET ID="de94bba4-06d1-4d40-a16a-bfd50179d6ac"
GPT ATTRIBUTES=0x8000000000000001`,
      installPartitionId: 3,
    },

    // 3. Megkerülések
    bypassHardware: false,
    bypassNetwork: false,
    autoAcceptEula: false,

    // 4. Hálózat és Wi-Fi
    wifi: {
      mode: 'skip',
      ssid: '',
      password: '',
    },

    // 5. Felhasználói fiók
    computerName: 'PC',
    randomSuffix: false,
    productKey: '',
    username: 'RG',
    password: '',
    autoLogin: false,

    // 6. Személyre szabás
    desktopIcons: {
      computer: false,
      recycleBin: false,
      userFiles: false,
      controlPanel: false,
      network: false,
    },
    searchBoxMode: 'full',
    hideTaskbarIcons: false,
    showAllTrayIcons: false,
    disableTransparency: false,
    disableWallpaperChange: false,
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
    
    // 10. Egyéni szkriptek (FirstLogon)
    customScripts: {
      windowsUpdate: false,
      wingetApps: 'none', // 'none', 'versionA', 'versionB', 'custom'
      wingetCustomApps: [], // [{ id: 'Google.Chrome', location: '' }, ...]
      office: 'none',     // 'none', 'versionA', 'versionB'
      officeKey: '',      // Új mező az Office licenckulcsnak
      pcManager: false,
      domainJoin: false,
      domainName: '',
      domainUser: '',
      domainPass: ''
    }
  }
}
