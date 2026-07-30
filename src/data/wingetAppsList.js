/**
 * Winget alkalmazáslista.
 *
 * Mezők:
 *  - `defaultLocation`: javasolt telepítési útvonal (üres = a telepítő alapértelmezése)
 *  - `forceDefaultLocation`: az adott telepítő nem tud egyedi útvonalra menni
 *  - `override`: FIX `--override` argumentum (nem függ az útvonaltól)
 *  - `overrideTemplate`: `--override` sablon, a `{location}` helyére megy az útvonal
 *
 * JAVÍTVA: korábban `useOverride: '/q INSTALLDIR'` szerepelt, ami érték nélküli
 * `INSTALLDIR`-t generált, és a generátor az `useOverride` + `override` kulcsokat
 * egymás után is hozzáfűzte (duplikált hashtable kulcs = PowerShell parse error).
 * Most egy sablon van, világos behelyettesítéssel.
 */
export const WINGET_APPS = [
  { id: 'Google.Chrome', name: 'Google Chrome', source: 'winget', defaultLocation: '', forceDefaultLocation: true },
  { id: 'CodecGuide.K-LiteCodecPack.Standard', name: 'K-Lite Codec Pack', source: 'winget', defaultLocation: 'D:\\Apps\\K-LiteCodecPack' },
  { id: 'RARLab.WinRAR', name: 'WinRAR', source: 'winget', defaultLocation: 'D:\\Apps\\WinRAR' },
  { id: 'Ghisler.TotalCommander', name: 'Total Commander', source: 'winget', defaultLocation: 'D:\\Apps\\TotalCommander' },
  { id: 'Valve.Steam', name: 'Steam', source: 'winget', defaultLocation: 'D:\\Games\\Steam' },
  {
    id: 'EpicGames.EpicGamesLauncher',
    name: 'Epic Games Launcher',
    source: 'winget',
    defaultLocation: 'D:\\Apps\\EpicGames',
    overrideTemplate: '/q INSTALLDIR={location}',
  },
  { id: 'Discord.Discord', name: 'Discord', source: 'winget', defaultLocation: '', forceDefaultLocation: true },
  { id: 'qBittorrent.qBittorrent', name: 'qBittorrent', source: 'winget', defaultLocation: 'D:\\Apps\\qBittorrent' },
  { id: 'Microsoft.VCRedist.2015+.x64', name: 'Visual C++ Redist 2015+ (x64)', source: 'winget', defaultLocation: '', forceDefaultLocation: true },
  { id: 'Microsoft.VCRedist.2015+.x86', name: 'Visual C++ Redist 2015+ (x86)', source: 'winget', defaultLocation: '', forceDefaultLocation: true },
  { id: 'VeyonSolutions.Veyon', name: 'Veyon', source: 'winget', defaultLocation: '', forceDefaultLocation: true, override: '/S /NoMaster' },
  { id: 'VideoLAN.VLC', name: 'VLC media player', source: 'winget', defaultLocation: 'D:\\Apps\\VLC' },
];
