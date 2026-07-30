export function getDefaultConfig() {
  return {
    // 1. Rendszerinformációk
    usePresets: false,
    installLanguage: 'hu',
    architecture: 'amd64',
    addEnglishKeyboard: false,
    enableLongPaths: true,
    preventDeviceEncryption: true,
    // Korábban az oobeSystem fixen 'Central Europe Standard Time'-ot égetett be.
    timeZone: 'Central Europe Standard Time',

    // 2. Particionálás
    partitioning: {
      enabled: true,
      mode: 'auto',
      fullWipe: false,
      diskNumber: 0,
      // Konfigurálható méretek – korábban be voltak égetve a generátorba,
      // így kisebb SSD-n a 150 GB-os Windows partíció elhasalt.
      efiSizeMb: 300,
      windowsSizeMb: 153600,
      recoverySizeMb: 1024,
      customDiskpartScript: `SELECT DISK=0
CLEAN
CONVERT GPT
CREATE PARTITION EFI SIZE=300
FORMAT QUICK FS=FAT32 LABEL="System"
ASSIGN LETTER=S
CREATE PARTITION MSR SIZE=16
CREATE PARTITION PRIMARY SIZE=153600
FORMAT QUICK FS=NTFS LABEL="Windows"
ASSIGN LETTER=W
CREATE PARTITION PRIMARY
FORMAT QUICK FS=NTFS LABEL="Adatok"
ASSIGN LETTER=D
SHRINK MINIMUM=1024
CREATE PARTITION PRIMARY
FORMAT QUICK FS=NTFS LABEL="Recovery"
SET ID="de94bba4-06d1-4d40-a16a-bfd50179d6ac"
GPT ATTRIBUTES=0x8000000000000001`,
      installPartitionId: 3,
    },

    // 3. Megkerülések
    bypassHardware: false,
    bypassNetwork: false,
    autoAcceptEula: false,
    silentOOBEPrivacy: true,
    silentOOBENetwork: true,
    silentOOBEBlueScreens: true,

    // 4. Hálózat és Wi-Fi
    wifi: {
      mode: 'skip',
      ssid: '',
      password: '',
      // Korábban be volt égetve a WPA2PSK/AES, nyílt hálózatot nem lehetett megadni.
      security: 'wpa2psk', // 'wpa2psk' | 'wpa3sae' | 'open'
    },

    // 5. Felhasználói fiók
    computerName: 'PC',
    randomSuffix: false,
    productKey: '',
    username: 'RG',
    password: '',
    autoLogin: false,
    disablePasswordExpiration: true,

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
    hideRecentApps: false,
    hideMostUsedApps: false,
    hideRecommendedFiles: false,
    hideTipsAndSuggestions: false,
    disableNewsAndInterests: true,
    disableEdgeDesktopShortcut: true,
    disableWebSearch: false,
    cleanStartPins: false,
    // Ezt a három kulcsot a generátor OLVASTA, de a defaultConfig soha nem
    // definiálta – mindig undefined volt, tehát a beállítás halott volt.
    showHiddenFiles: false,
    showFileExtensions: true,
    explorerToThisPC: true,

    // 7. Adatvédelem
    disableTelemetry: false,
    disableEdgeFirstRun: false,
    disableCopilot: true,
    disableConsumerFeatures: true,

    // 8. Teljesítmény
    disableUAC: false,
    disableFastStartup: false,
    disableSleep: false,
    disableMouseAcceleration: false,
    disableBackgroundApps: true,
    disableGameDVR: true,

    // 9. Bloatware
    bloatware: {
      todo: false,
      experiencesApp: false,
      stickyNotes: false,
      quickAssist: false,
      weather: false,
      camera: false,
      bingNews: false,
      clipchamp: false,
      clock: false,
      outlook: false,
      powerAutomate: false,
      solitaire: false,
      terminal: false,
      feedbackHub: false,
    },
    // Örökölt Windows képességek (IE, WordPad, Fax, WMP...) eltávolítása.
    // A hozzá tartozó Schneegans szkript eddig halott kód volt.
    removeLegacyCapabilities: false,

    // 10. Egyéni szkriptek (FirstLogon)
    customScripts: {
      windowsUpdate: false,
      wingetApps: 'none', // 'none' | 'versionA' | 'versionB' | 'custom'
      wingetCustomApps: [], // [{ id: 'Google.Chrome', location: '' }, ...]
      office: 'none', // 'none' | 'versionA' | 'versionB'
      officeKey: '',
      pcManager: false,
      domainJoin: false,
      domainName: '',
      domainUser: '',
      domainPass: '',
    },
  };
}
