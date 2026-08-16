export function getDefaultConfig() {
  return {
    usePresets: false, installLanguage: 'hu', architecture: 'amd64', addEnglishKeyboard: false,
    partitioning: { enabled: false, mode: 'manual', fullWipe: false, diskNumber: 0, customDiskpartScript: '', installPartitionId: '' },
    bypassHardware: false, bypassNetwork: false, autoAcceptEula: true,
    wifi: { mode: 'skip', ssid: '', password: '' },
    computerName: 'PC', randomSuffix: false, productKey: '', username: 'RG', password: '', autoLogin: false,
    desktopIcons: { computer: false, recycleBin: false, userFiles: false, controlPanel: false, network: false },
    searchBoxMode: 'full', hideTaskbarIcons: false, showAllTrayIcons: false, disableTransparency: false, disableWallpaperChange: false, hideRecentApps: false, hideMostUsedApps: false, hideRecommendedFiles: false, hideTipsAndSuggestions: false, disableWebSearch: false, cleanStartPins: false,
    disableTelemetry: false, disableEdgeFirstRun: false, disableUAC: false, disableFastStartup: false, disableSleep: false, disableMouseAcceleration: false,
    bloatware: { todo: false, stickyNotes: false, quickAssist: false, weather: false, camera: false, bingNews: false, clipchamp: false, clock: false, outlook: false, powerAutomate: false, solitaire: false, feedbackHub: false },
    customScripts: { windowsUpdate: false, wingetApps: 'none', wingetCustomApps: [], office: 'none', officeKey: '', pcManager: false, domainJoin: false, domainName: '', domainUser: '', domainPass: '' }
  };
}
