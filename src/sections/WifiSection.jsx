import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Wifi, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import InputField from '../components/InputField';
import CustomSelect from '../components/CustomSelect';
import AnimatedCollapse from '../components/AnimatedCollapse';

export default function WifiSection({ config, setConfig, errors = {} }) {
  const { t } = useLanguage();

  const wifiOptions = [
    { label: t('wifi.mode.skip'), value: 'skip' },
    { label: t('wifi.mode.auto'), value: 'auto' },
    { label: t('wifi.mode.manual'), value: 'manual' },
  ];

  // Korábban a WPA2PSK/AES be volt égetve a generátorba: nyílt hálózatot vagy
  // WPA3-at egyáltalán nem lehetett megadni.
  const securityOptions = [
    { value: 'wpa2psk', label: t('wifi.security.wpa2psk') },
    { value: 'wpa3sae', label: t('wifi.security.wpa3sae') },
    { value: 'open', label: t('wifi.security.open') },
  ];

  const updateWifi = (updates) => {
    setConfig((prev) => ({
      ...prev,
      wifi: { ...prev.wifi, ...updates },
    }));
  };

  const security = config.wifi.security || 'wpa2psk';
  const isOpen = security === 'open';

  return (
    <Card title={t('section.wifi')} icon={<Wifi size={20} />} tooltip={t('tt.wifiDesc')}>
      <div className="form-group">
        <SegmentedControl
          label={t('wifi.mode')}
          options={wifiOptions}
          value={config.wifi.mode}
          onChange={(val) => updateWifi({ mode: val })}
        />
        <p
          className="help-text"
          style={{ marginTop: '0.5rem', marginBottom: '0', fontSize: '0.9rem', opacity: 0.8 }}
        >
          {config.wifi.mode === 'skip' && t('wifi.help.skip')}
          {config.wifi.mode === 'auto' && t('wifi.help.auto')}
          {config.wifi.mode === 'manual' && t('wifi.help.manual')}
        </p>
      </div>

      <AnimatedCollapse show={config.wifi.mode === 'auto'}>
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
          }}
        >
          <InputField
            label={t('wifi.ssid')}
            id="wifi.ssid"
            placeholder={t('wifi.ssid.ph')}
            value={config.wifi.ssid}
            onChange={(val) => updateWifi({ ssid: val })}
            error={errors['wifi.ssid']}
          />

          <div className="input-wrapper" style={{ marginTop: '1rem' }}>
            <label className="input-label">{t('wifi.security')}</label>
            <div className="input-container">
              <CustomSelect
                value={security}
                onChange={(val) => updateWifi({ security: val, ...(val === 'open' ? { password: '' } : {}) })}
                options={securityOptions}
              />
            </div>
          </div>

          <AnimatedCollapse show={!isOpen}>
            <div style={{ marginTop: '1rem' }}>
              <InputField
                label={t('wifi.password')}
                id="wifi.password"
                type="password"
                placeholder={t('wifi.password.ph')}
                value={config.wifi.password}
                onChange={(val) => updateWifi({ password: val })}
                error={errors['wifi.password']}
              />
              <p
                className="toggle-description"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}
              >
                <AlertTriangle size={14} />
                {t('wifi.plaintext.warning')}
              </p>
            </div>
          </AnimatedCollapse>
        </div>
      </AnimatedCollapse>
    </Card>
  );
}
