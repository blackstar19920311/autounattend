import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Wifi } from 'lucide-react';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import InputField from '../components/InputField';
import AnimatedCollapse from '../components/AnimatedCollapse';

export default function WifiSection({ config, setConfig, errors = {} }) {
  const { t } = useLanguage();

  
  const wifiOptions = [
    { label: t('wifi.mode.skip'), value: 'skip' },
    { label: t('wifi.mode.auto'), value: 'auto' },
    { label: t('wifi.mode.manual'), value: 'manual' }
  ];

  const updateWifi = (updates) => {
    setConfig(prev => ({
      ...prev,
      wifi: { ...prev.wifi, ...updates }
    }));
  };

  return (
    <Card title={t('section.wifi')} icon={<Wifi size={20} />} tooltip={t('tt.wifiDesc')}>
      <div className="form-group">
        <SegmentedControl
          label={t('wifi.mode')}
          options={wifiOptions}
          value={config.wifi.mode}
          onChange={(val) => updateWifi({ mode: val })}
        />
        <p className="help-text" style={{ marginTop: '0.5rem', marginBottom: '0', fontSize: '0.9rem', opacity: 0.8 }}>
          {config.wifi.mode === 'skip' && t('wifi.help.skip')}
          {config.wifi.mode === 'auto' && t('wifi.help.auto')}
          {config.wifi.mode === 'manual' && (
            <>
              {t('wifi.help.manual')}
              <div style={{ marginTop: '0.5rem', color: '#ffb300', fontWeight: 'bold' }}>
                {t('wifi.help.manual.warning')}
              </div>
            </>
          )}
        </p>
      </div>

      <AnimatedCollapse show={config.wifi.mode === 'auto'}>
        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <InputField
            label={t('wifi.ssid')}
            id="wifi_ssid"
            placeholder={t('wifi.ssid.ph')}
            value={config.wifi.ssid}
            onChange={(val) => updateWifi({ ssid: val })}
            error={errors['wifi.ssid']}
          />
          <div style={{ marginTop: '1rem' }}>
            <InputField
              label={t('wifi.password')}
              id="wifi_password"
              type="password"
              placeholder={t('wifi.password.ph')}
              value={config.wifi.password}
              onChange={(val) => updateWifi({ password: val })}
              error={errors['wifi.password']}
            />
          </div>
        </div>
      </AnimatedCollapse>
    </Card>
  );
}
