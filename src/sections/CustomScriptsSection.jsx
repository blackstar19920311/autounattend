import { useLanguage } from '../i18n/LanguageContext';
import React from 'react';
import { Code } from 'lucide-react';

import Card from '../components/Card';
import Toggle from '../components/Toggle';
import InputField from '../components/InputField';
import Checkbox from '../components/Checkbox';
import CustomSelect from '../components/CustomSelect';
import AnimatedCollapse from '../components/AnimatedCollapse';
import { WINGET_APPS } from '../data/wingetAppsList';

function CustomAppRow({ app, data, handleWingetCustomAppToggle, handleWingetCustomAppLocationChange, partitioningMode }) {
  const { t } = useLanguage();
    const isSelected = (data.wingetCustomApps || []).some(a => a.id === app.id);
  const appData = (data.wingetCustomApps || []).find(a => a.id === app.id) || {};
  const cleanAppName = app.name.replace(/[^a-zA-Z0-9-]/g, '');
  const appsPath = `D:\\Apps\\${cleanAppName}`;
  const gamesPath = `D:\\Games\\${cleanAppName}`;
  
  const hasDefault = !!app.defaultLocation;
  const isDefaultLoc = hasDefault && appData.location === app.defaultLocation;
  const isCustomApps = appData.location === appsPath;
  const isCustomGames = appData.location === gamesPath;
  
  // Ha a particionálás automatikus, egyetlen alkalmazásnál sincs értelme egyedi útvonalat megadni,
  // mert nem lesz D: meghajtó, ahova telepíthetnénk.
  const forceDefaultLocation = app.forceDefaultLocation || partitioningMode === 'auto';
  
  const [forceCustom, setForceCustom] = React.useState(false);
  
  let d1Value = "";
  if (forceCustom) {
    d1Value = "custom_selection";
  } else if (appData.location === "" || appData.location === undefined) {
    d1Value = "";
  } else if (isDefaultLoc) {
    d1Value = app.defaultLocation;
  } else if (isCustomApps || isCustomGames) {
    d1Value = "custom_selection";
  } else {
    d1Value = "custom_selection"; // Ha bármilyen más egyedi érték van
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '6px', minHeight: '32px' }}>
      <div style={{ flex: '1 1 260px', minWidth: '200px', maxWidth: '300px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          role="switch"
          aria-labelledby={`app-toggle-${app.id}`}
          className={`toggle ${isSelected ? 'toggle--active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            const locToSave = app.defaultLocation || "";
            handleWingetCustomAppToggle(app.id, locToSave)(!isSelected);
            if (isSelected) setForceCustom(false);
          }}
          style={{ margin: 0 }}
        >
          <span className="toggle-thumb" />
        </button>
        <span 
          id={`app-toggle-${app.id}`}
          style={{ fontSize: '0.9rem', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none' }} 
          onClick={() => {
            const locToSave = app.defaultLocation || "";
            handleWingetCustomAppToggle(app.id, locToSave)(!isSelected);
            if (isSelected) setForceCustom(false);
          }}>
          {app.name}
        </span>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <AnimatedCollapse 
          show={!forceDefaultLocation && isSelected}
          style={{ flex: '1 1 320px', minWidth: '200px', maxWidth: '400px' }}
        >
          <CustomSelect
            size="small"
            value={d1Value}
            onChange={(val) => {
              if (val === "custom_selection") {
                setForceCustom(true);
                handleWingetCustomAppLocationChange(app.id, "");
              } else {
                setForceCustom(false);
                handleWingetCustomAppLocationChange(app.id, val);
              }
            }}
            disabled={!isSelected}
            options={[
              { value: "", label: t('cs.winget.defaultLocation') },
              ...(hasDefault ? [{ value: app.defaultLocation, label: `${t('cs.winget.recommendedLocation')} (${app.defaultLocation})` }] : []),
              { value: "custom_selection", label: t('cs.winget.customLocation') }
            ]}
          />
        </AnimatedCollapse>

        <AnimatedCollapse 
          show={d1Value === "custom_selection" && isSelected}
          style={{ flex: '1 1 200px', minWidth: '150px' }}
        >
          <input
            aria-label={`${app.name} egyedi telepítési helye`}
            type="text"
            className="input-field small"
            placeholder={t('cs.winget.customLocationPlaceholder')}
            value={appData.location || ''}
            onChange={(e) => {
              setForceCustom(true);
              handleWingetCustomAppLocationChange(app.id, e.target.value);
            }}
          />
        </AnimatedCollapse>
      </div>
    </div>
  );
}

export default function CustomScriptsSection({ config, setConfig, errors = {} }) {
  const { t } = useLanguage();

    const data = config.customScripts || {};

  const handleToggle = (field, defaultValueIfOn) => (checked) => {
    setConfig((prev) => ({
      ...prev,
      customScripts: {
        ...prev.customScripts,
        [field]: checked ? defaultValueIfOn : 'none',
      }
    }));
  };

  const handleBooleanToggle = (field) => (checked) => {
    setConfig((prev) => ({
      ...prev,
      customScripts: {
        ...prev.customScripts,
        [field]: checked,
      }
    }));
  };

  const handleRadio = (field, value) => () => {
    setConfig((prev) => ({
      ...prev,
      customScripts: {
        ...prev.customScripts,
        [field]: value,
      }
    }));
  };

  const handleWingetCustomAppToggle = (appId, defaultLocation) => (checked) => {
    setConfig((prev) => {
      const prevCustomApps = prev.customScripts.wingetCustomApps || [];
      if (checked) {
        return {
          ...prev,
          customScripts: {
            ...prev.customScripts,
            wingetCustomApps: [...prevCustomApps, { id: appId, location: defaultLocation || '' }]
          }
        };
      } else {
        return {
          ...prev,
          customScripts: {
            ...prev.customScripts,
            wingetCustomApps: prevCustomApps.filter(a => a.id !== appId)
          }
        };
      }
    });
  };

  const handleWingetCustomAppLocationChange = (appId, newLocation) => {
    setConfig((prev) => {
      const prevCustomApps = prev.customScripts.wingetCustomApps || [];
      return {
        ...prev,
        customScripts: {
          ...prev.customScripts,
          wingetCustomApps: prevCustomApps.map(a => a.id === appId ? { ...a, location: newLocation } : a)
        }
      };
    });
  };

  return (
    <Card title={t('cs.title')} icon={<Code size={20} />} tooltip={t('tt.csDesc')}>
      <Toggle
        label={t('cs.update')}
        description={t('cs.update.desc')}
        checked={!!data.windowsUpdate}
        onChange={handleBooleanToggle('windowsUpdate')}
        id="cs-windowsUpdate"
      />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Toggle
          label={t('cs.winget')}
          description={t('cs.winget.desc')}
          checked={data.wingetApps !== 'none'}
          onChange={handleToggle('wingetApps', config.usePresets ? 'versionA' : 'custom')}
          id="cs-wingetApps"
        />
        <AnimatedCollapse show={data.wingetApps !== 'none'} marginTop="18px">
          <div className="radio-group-indented">
            {config.usePresets && (
              <>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="wingetApps" 
                    checked={data.wingetApps === 'versionA'} 
                    onChange={handleRadio('wingetApps', 'versionA')}
                  />
                  <span>{t('cs.winget.home')}</span>
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="wingetApps" 
                    checked={data.wingetApps === 'versionB'} 
                    onChange={handleRadio('wingetApps', 'versionB')}
                  />
                  <span>{t('cs.winget.school')}</span>
                </label>
                <label className="radio-label">
                  <input 
                    type="radio" 
                    name="wingetApps" 
                    checked={data.wingetApps === 'custom'} 
                    onChange={handleRadio('wingetApps', 'custom')}
                  />
                  <span>{t('cs.winget.custom')}</span>
                </label>
              </>
            )}

            <AnimatedCollapse show={data.wingetApps === 'custom' || !config.usePresets}>
              <div style={{ marginTop: config.usePresets ? '15px' : '0', paddingLeft: config.usePresets ? '24px' : '0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>{t('cs.winget.custom.help')}</p>
                {WINGET_APPS.map(app => (
                  <CustomAppRow
                    key={app.id}
                    app={app}
                    data={data}
                    handleWingetCustomAppToggle={handleWingetCustomAppToggle}
                    handleWingetCustomAppLocationChange={handleWingetCustomAppLocationChange}
                    partitioningMode={config.partitioning?.mode}
                  />
                ))}
              </div>
            </AnimatedCollapse>
          </div>
        </AnimatedCollapse>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Toggle
          label={t('cs.office')}
          description={t('cs.office.desc')}
          checked={data.office !== 'none'}
          onChange={handleToggle('office', 'versionB')}
          id="cs-office"
        />
        <AnimatedCollapse show={data.office !== 'none'} marginTop="18px">
          <div className="radio-group-indented">
            <label className="radio-label">
              <input 
                type="radio" 
                name="office" 
                checked={data.office === 'versionA'} 
                onChange={handleRadio('office', 'versionA')}
              />
              <span>{t('cs.office.365')}</span>
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                name="office" 
                checked={data.office === 'versionB'} 
                onChange={handleRadio('office', 'versionB')}
              />
              <span>{t('cs.office.2021')}</span>
            </label>
            
            <AnimatedCollapse show={data.office === 'versionB'} marginTop="10px">
              <div style={{ paddingLeft: '28px' }}>
                <InputField
                  id="officeKey"
                  label={t('cs.office.2021.key')}
                  value={data.officeKey || ''}
                  placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                  onChange={(val) => setConfig(prev => ({
                    ...prev,
                    customScripts: {
                      ...prev.customScripts,
                      officeKey: val
                    }
                  }))}
                />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {t('cs.office.2021.key.help')}
                </p>
              </div>
            </AnimatedCollapse>
          </div>
        </AnimatedCollapse>
      </div>

      <Toggle
        label={t('cs.pcManager')}
        description={t('cs.pcManager.desc')}
        checked={!!data.pcManager}
        onChange={handleBooleanToggle('pcManager')}
        id="cs-pcManager"
      />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Toggle
          label={t('cs.domain.title')}
          description={t('cs.domain.desc')}
          checked={!!data.domainJoin}
          onChange={handleBooleanToggle('domainJoin')}
          id="cs-domainJoin"
        />
        
        <AnimatedCollapse show={!!data.domainJoin} marginTop="18px">
          <div style={{ paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '0' }}>
            <InputField
              id="domainName"
              label={t('cs.domain.name')}
              value={data.domainName || ''}
              placeholder={t('cs.domain.namePlaceholder')}
              error={errors.domainName}
              onChange={(val) => setConfig(prev => ({
                ...prev,
                customScripts: {
                  ...prev.customScripts,
                  domainName: val
                }
              }))}
            />
            <InputField
              id="domainUser"
              label={t('cs.domain.user')}
              value={data.domainUser || ''}
              placeholder={t('cs.domain.userPlaceholder')}
              error={errors.domainUser}
              onChange={(val) => setConfig(prev => ({
                ...prev,
                customScripts: {
                  ...prev.customScripts,
                  domainUser: val
                }
              }))}
            />
            <div style={{ marginTop: '16px' }}>
              <InputField
                id="domainPass"
                label={t('cs.domain.pass')}
                type="text"
                value={data.domainPass || ''}
                placeholder="••••••••"
                error={errors.domainPass}
                onChange={(val) => setConfig(prev => ({
                  ...prev,
                  customScripts: {
                    ...prev.customScripts,
                    domainPass: val
                  }
                }))}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {t('cs.domain.help')}
            </p>
          </div>
        </AnimatedCollapse>
      </div>
    </Card>
  )
}
