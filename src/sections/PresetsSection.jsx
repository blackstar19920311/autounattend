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

  // Reset callback a külső Reset gomb számára
  React.useEffect(() => {
    if (resetPresetRef) {
      resetPresetRef.current = () => {
        setActivePreset(null);
        setActiveSubPreset(null);
      };
    }
  }, [resetPresetRef]);

  const applyPreset = (presetName, isInitial = false) => {
    setActivePreset(presetName);
    setActiveSubPreset(null);
    setConfig(() => {
      // MINDIG tiszta alapból indulunk – így sosem marad bent "régi" érték
      const base = getDefaultConfig();
      base.usePresets = true; // IMPORTANT: Keep the presets toggle active!

      // --- Közös beállítások MINDEN presetnél ---
      base.addEnglishKeyboard = false;
      base.disableEdgeFirstRun = true;
      base.bypassNetwork = true;
      base.autoAcceptEula = true;
      base.autoLogin = true;
      base.desktopIcons = {
        computer: true,
        recycleBin: true,
        userFiles: false,
        controlPanel: false,
        network: false,
      };
      // Teljes bloatware tiltás minden presetnél
      base.bloatware = {
        todo: true, experiencesApp: true, stickyNotes: true, quickAssist: true,
        weather: true, camera: true, bingNews: true, clipchamp: true,
        clock: true, outlook: true, powerAutomate: true, solitaire: true,
        terminal: true, feedbackHub: true,
      };
      // Privacy/Performance alapok minden presetnél
      // disableSearchBoxSuggestions eltávolítva — a disableWebSearch (65. sor) kezeli
      base.disableTelemetry = true;
      base.disableUAC = true;
      base.disableFastStartup = true;
      base.disableSleep = true;
      base.disableMouseAcceleration = true;
      base.searchBoxMode = 'hidden';
      base.hideTaskbarIcons = true;
      base.disableTransparency = true;
      base.hideRecentApps = true;
      base.hideMostUsedApps = true;
      base.hideRecommendedFiles = true;
      base.hideTipsAndSuggestions = true;
      base.disableWebSearch = true;
      base.cleanStartPins = true;
      // wingetCustomApps mindig üres preset váltáskor
      base.customScripts.wingetCustomApps = [];

      if (presetName === 'otthoni') {
        base.partitioning.mode = 'autocd';
        base.partitioning.diskNumber = 0;
        base.partitioning.installPartitionId = 3;
        base.bypassHardware = false;
        base.wifi = { mode: 'skip', ssid: '', password: '' };
        base.computerName = 'IT';
        base.randomSuffix = true;
        base.username = 'DaNi';
        base.password = '';
        base.customScripts.windowsUpdate = true;
        base.customScripts.wingetApps = 'versionA';
        base.customScripts.office = 'versionA';
        base.customScripts.pcManager = true;
        base.customScripts.domainJoin = false;
      }
      else if (presetName === 'iskolai') {
        base.partitioning.mode = 'auto';
        base.partitioning.diskNumber = 0;
        base.partitioning.installPartitionId = 3;
        base.bypassHardware = true;
        base.wifi = { mode: 'skip', ssid: '', password: '' };
        base.computerName = 'PC';
        base.randomSuffix = true;
        base.username = 'RG';
        base.password = '';
        base.customScripts.windowsUpdate = true;
        base.customScripts.wingetApps = 'versionB';
        base.customScripts.office = 'versionB';
        base.customScripts.domainJoin = true;
        base.customScripts.pcManager = false;
      }
      else if (presetName === 'laptop') {
        base.partitioning.mode = 'auto';
        base.partitioning.diskNumber = 0;
        base.partitioning.installPartitionId = 3;
        base.bypassHardware = true;
        base.wifi = { mode: 'auto', ssid: '', password: '' };
        base.computerName = 'Laptop';
        base.randomSuffix = true;
        base.username = 'RG';
        base.password = '';
        base.customScripts.windowsUpdate = true;
        base.customScripts.wingetApps = 'versionB';
        base.customScripts.office = 'versionB';
        base.customScripts.domainJoin = false;
        base.customScripts.pcManager = false;
      }

      return base;
    });

    // Felgördítés a tetejére
    const mainEl = document.querySelector('.main-content');
    if (mainEl && !isInitial) {
      mainEl.scrollTop = 0;
    }
  };

  const applySubPreset = (subName, prefix) => {
    setActiveSubPreset(subName);
    setConfig(prev => ({
      ...prev,
      computerName: prefix
    }));
  };

  // Induláskor NE töltsük be az Otthoni presetet automatikusan, mert kikapcsolva indul a panel
  // (A useEffect ki van véve)

  const handleTogglePresets = (enabled) => {
    if (!enabled) {
      setActivePreset(null);
      setActiveSubPreset(null);
      setConfig(prev => ({ ...getDefaultConfig(), usePresets: false }));
    } else {
      setConfig(prev => ({ ...prev, usePresets: true }));
    }
  };

  const getPresetClass = (name) => {
    return activePreset === name ? 'preset-btn preset-btn--active' : 'preset-btn';
  };

  const getSubPresetClass = (name) => {
    return activeSubPreset === name ? 'sub-preset-btn sub-preset-btn--active' : 'sub-preset-btn';
  };

  return (
    <Card title={t('presets.title')} icon={<Package size={20} className="text-accent" />}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, flex: 1 }}>
            {t('presets.desc')}
          </p>
          <div style={{ minWidth: 'max-content' }}>
            <Toggle 
              label={t('presets.enable')} 
              checked={!!config.usePresets}
              onChange={handleTogglePresets}
            />
          </div>
        </div>
        
       <div 
        style={{ 
          maxHeight: config.usePresets ? '2000px' : '0',
          opacity: config.usePresets ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.7s ease-in-out',
          paddingTop: config.usePresets ? '10px' : '0',
          paddingBottom: config.usePresets ? '10px' : '0',
          marginTop: config.usePresets ? '15px' : '0',
          paddingLeft: '8px',
          paddingRight: '8px',
          marginLeft: '-8px',
          marginRight: '-8px'
        }}>
        {config.usePresets && (
        <>
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>

        
        {/* Otthoni Preset */}
        <button 
          type="button"
          onClick={() => applyPreset('otthoni')}
          className={getPresetClass('otthoni')}
        >
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '12px', borderRadius: '50%', color: 'var(--primary)' }}>
            <Home size={32} />
          </div>
          <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{t('presets.home.title')}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            {t('presets.home.desc')}
          </span>
        </button>

        {/* Iskolai Preset */}
        <button 
          type="button"
          onClick={() => applyPreset('iskolai')}
          className={getPresetClass('iskolai')}
        >
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '12px', borderRadius: '50%', color: 'var(--primary)' }}>
            <School size={32} />
          </div>
          <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{t('presets.school.title')}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            {t('presets.school.desc')}
          </span>
        </button>

        {/* Laptop Preset */}
        <button 
          type="button"
          onClick={() => applyPreset('laptop')}
          className={getPresetClass('laptop')}
        >
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '12px', borderRadius: '50%', color: 'var(--primary)' }}>
            <Laptop size={32} />
          </div>
          <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{t('presets.schoolLaptop.title')}</strong>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            {t('presets.schoolLaptop.desc')}
          </span>
        </button>

      </div>
      </div>

      {/* Iskolai Al-profilok (Termek) - Animált nyitás/csukás */}
      <div style={{
        maxHeight: activePreset === 'iskolai' ? '2000px' : '0',
        opacity: activePreset === 'iskolai' ? 1 : 0,
        overflow: 'hidden',
        transition: 'all 0.7s ease-in-out',
        marginTop: activePreset === 'iskolai' ? '20px' : '0',
        paddingTop: activePreset === 'iskolai' ? '20px' : '0',
        borderTop: activePreset === 'iskolai' ? '1px solid var(--border)' : '0px solid transparent',
        paddingLeft: '8px',
        paddingRight: '8px',
        paddingBottom: activePreset === 'iskolai' ? '8px' : '0',
        marginLeft: '-8px',
        marginRight: '-8px'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '12px'
        }}>
          
          <button 
            type="button"
            onClick={() => applySubPreset('ecdl', 'ECDL')}
            className={getSubPresetClass('ecdl')}
          >
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{t('presets.sub.ecdl')}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t('presets.sub.ecdl.desc')}</span>
          </button>

          <button 
            type="button"
            onClick={() => applySubPreset('27es', '27-ES')}
            className={getSubPresetClass('27es')}
          >
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{t('presets.sub.27es')}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t('presets.sub.27es.desc')}</span>
          </button>

          <button 
            type="button"
            onClick={() => applySubPreset('media1', 'MEDIA1')}
            className={getSubPresetClass('media1')}
          >
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{t('presets.sub.media1')}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t('presets.sub.media1.desc')}</span>
          </button>

          <button 
            type="button"
            onClick={() => applySubPreset('media2', 'MEDIA2')}
            className={getSubPresetClass('media2')}
          >
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{t('presets.sub.media2')}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{t('presets.sub.media2.desc')}</span>
          </button>

          </div>
        </div>
        </>
        )}
      </div>
      </div>
    </Card>
  );
}
