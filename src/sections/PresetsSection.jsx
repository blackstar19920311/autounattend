import React from 'react';
import { Package, Home, School, Laptop } from 'lucide-react';
import Card from '../components/Card';
import { getDefaultConfig } from '../data/defaultConfig';
import { useLanguage } from '../i18n/LanguageContext';
import Toggle from '../components/Toggle';

export default function PresetsSection({ config, setConfig, resetPresetRef }) {
  const { t } = useLanguage();
  const [activePreset, setActivePreset] = React.useState(null);
  const [activeSubPreset, setActiveSubPreset] = React.useState(null);
  React.useEffect(() => { if (resetPresetRef) resetPresetRef.current = () => { setActivePreset(null); setActiveSubPreset(null); }; }, [resetPresetRef]);
  const applyPreset = (presetName) => {
    setActivePreset(presetName); setActiveSubPreset(null);
    setConfig(prev => {
      const base = getDefaultConfig(); base.installLanguage = prev.installLanguage; base.usePresets = true;
      Object.assign(base, { disableEdgeFirstRun: true, bypassNetwork: true, autoAcceptEula: true, autoLogin: false, disableTelemetry: true, disableUAC: true, disableFastStartup: true, disableSleep: true, disableMouseAcceleration: true, searchBoxMode: 'hidden', hideTaskbarIcons: true, showAllTrayIcons: true, disableTransparency: true, hideRecentApps: true, hideMostUsedApps: true, hideRecommendedFiles: true, hideTipsAndSuggestions: true, disableWebSearch: true, cleanStartPins: true });
      base.desktopIcons = { computer: true, recycleBin: true, userFiles: false, controlPanel: false, network: false };
      base.bloatware = Object.fromEntries(Object.keys(base.bloatware).map(k => [k, true]));
      base.customScripts.wingetCustomApps = [];
      if (presetName === 'otthoni') Object.assign(base, { computerName: 'IT', randomSuffix: true, username: 'DaNi', wifi: { mode: 'skip', ssid: '', password: '' } }), Object.assign(base.partitioning, { mode: 'autocd', diskNumber: 0, installPartitionId: 3 }), Object.assign(base.customScripts, { windowsUpdate: true, wingetApps: 'versionA', office: 'versionA', pcManager: true, domainJoin: false });
      if (presetName === 'iskolai') Object.assign(base, { computerName: 'PC', randomSuffix: true, username: 'RG', wifi: { mode: 'skip', ssid: '', password: '' } }), Object.assign(base.partitioning, { mode: 'auto', diskNumber: 0, installPartitionId: 3 }), Object.assign(base.customScripts, { windowsUpdate: true, wingetApps: 'versionB', office: 'versionB', pcManager: false, domainJoin: false });
      if (presetName === 'laptop') Object.assign(base, { computerName: 'Laptop', randomSuffix: true, username: 'RG', wifi: { mode: 'skip', ssid: '', password: '' } }), Object.assign(base.partitioning, { mode: 'auto', diskNumber: 0, installPartitionId: 3 }), Object.assign(base.customScripts, { windowsUpdate: true, wingetApps: 'versionB', office: 'versionB', domainJoin: false, pcManager: false });
      return base;
    });
    document.querySelector('.scrollable-sections')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const applySubPreset = (name, prefix) => { setActiveSubPreset(name); setConfig(prev => ({ ...prev, computerName: prefix })); };
  const toggle = enabled => { setActivePreset(enabled ? activePreset : null); setActiveSubPreset(null); setConfig(prev => enabled ? { ...prev, usePresets: true } : { ...getDefaultConfig(), installLanguage: prev.installLanguage, usePresets: false }); };
  const cls = name => activePreset === name ? 'preset-btn preset-btn--active' : 'preset-btn';
  const subCls = name => activeSubPreset === name ? 'sub-preset-btn sub-preset-btn--active' : 'sub-preset-btn';
  return <Card title={t('presets.title')} icon={<Package size={20} className="text-accent" />} tooltip={t('tt.presetsDesc')}><div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'20px',flexWrap:'wrap'}}><p style={{fontSize:'0.9rem',color:'var(--text-secondary)',margin:0,flex:1}}>{t('presets.desc')}</p><Toggle label={t('presets.enable')} checked={!!config.usePresets} onChange={toggle}/></div><div style={{display:'grid',gridTemplateRows:config.usePresets?'1fr':'0fr',transition:'all .4s linear',opacity:config.usePresets?1:0,marginTop:config.usePresets?'15px':'0'}}><div style={{overflow:'hidden'}}><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'15px',padding:'15px 0'}}><button type="button" onClick={()=>applyPreset('otthoni')} className={cls('otthoni')}><Home size={32}/><strong>{t('presets.home.title')}</strong><span>{t('presets.home.desc')}</span></button><button type="button" onClick={()=>applyPreset('iskolai')} className={cls('iskolai')}><School size={32}/><strong>{t('presets.school.title')}</strong><span>{t('presets.school.desc')}</span></button><button type="button" onClick={()=>applyPreset('laptop')} className={cls('laptop')}><Laptop size={32}/><strong>{t('presets.schoolLaptop.title')}</strong><span>{t('presets.schoolLaptop.desc')}</span></button></div>{activePreset==='iskolai'&&<div className="sub-preset-grid"><button type="button" onClick={()=>applySubPreset('ecdl','ECDL')} className={subCls('ecdl')}>{t('presets.sub.ecdl')}</button><button type="button" onClick={()=>applySubPreset('27es','27-ES')} className={subCls('27es')}>{t('presets.sub.27es')}</button><button type="button" onClick={()=>applySubPreset('media1','MEDIA1')} className={subCls('media1')}>{t('presets.sub.media1')}</button><button type="button" onClick={()=>applySubPreset('media2','MEDIA2')} className={subCls('media2')}>{t('presets.sub.media2')}</button></div>}</div></div></div></Card>;
}
