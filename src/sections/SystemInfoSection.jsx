import { useLanguage } from '../i18n/LanguageContext';
import { Monitor } from 'lucide-react';
import Card from '../components/Card';
import Toggle from '../components/Toggle';
import Checkbox from '../components/Checkbox';
import InputField from '../components/InputField';
import SegmentedControl from '../components/SegmentedControl';
import CustomSelect from '../components/CustomSelect';
import AnimatedCollapse from '../components/AnimatedCollapse';
import { formatProductKey, PRODUCT_KEY_MAX_LENGTH } from '../utils/formatters';

// Gyakori időzónák. Korábban a generátor FIXEN közép-európai időzónát égetett be.
const TIME_ZONES = [
  'Central Europe Standard Time',
  'Central European Standard Time',
  'W. Europe Standard Time',
  'GMT Standard Time',
  'Romance Standard Time',
  'E. Europe Standard Time',
  'FLE Standard Time',
  'UTC',
  'Eastern Standard Time',
  'Central Standard Time',
  'Pacific Standard Time',
];

export default function SystemInfoSection({ config, setConfig, errors = {} }) {
  const { t, language } = useLanguage();

  const handleProductKeyChange = (value) => {
    setConfig((prev) => ({ ...prev, productKey: formatProductKey(value) }));
  };

  const prefix = config.computerName || 'PC';
  const previewName = config.randomSuffix ? `${prefix}-AB12` : prefix;

  const handleArchChange = (value) => {
    setConfig((prev) => ({ ...prev, architecture: value }));
  };

  return (
    <Card title={t('sysinfo.title')} icon={<Monitor size={20} />} tooltip={t('tt.systemInfoDesc')}>
      {/* Számítógépnév + random utótag checkbox egy sorban */}
      <div className="form-group">
        <label className="form-label">{t('user.computerName')}</label>
        <div className="computer-name-row">
          <div className="computer-name-input">
            <InputField
              value={config.computerName}
              onChange={(value) => setConfig((prev) => ({ ...prev, computerName: value }))}
              error={errors.computerName}
              maxLength={config.randomSuffix ? 8 : 15}
              placeholder="PC"
              id="computerName"
            />
          </div>
          <div className="computer-name-separator" />
          <Checkbox
            label={t('user.randomSuffix')}
            checked={config.randomSuffix}
            onChange={(value) => setConfig((prev) => ({ ...prev, randomSuffix: value }))}
            id="random-suffix"
          />
        </div>
        <p className="toggle-description" style={{ marginTop: -4 }}>
          💡 {t('user.preview')}: <strong>{previewName}</strong>
          {config.randomSuffix && <span> {t('user.suffix.desc')}</span>}
        </p>
      </div>

      <InputField
        label={t('user.productKey')}
        value={config.productKey}
        onChange={handleProductKeyChange}
        placeholder={t('user.productKey.ph')}
        maxLength={PRODUCT_KEY_MAX_LENGTH}
        error={errors.productKey}
        id="productKey"
      />
      <p className="toggle-description" style={{ marginTop: -4 }}>
        💡 {t('sysinfo.productKey.emptyHint')}
      </p>

      <div className="form-group">
        <SegmentedControl
          label={t('sysinfo.arch')}
          value={config.architecture}
          onChange={handleArchChange}
          options={[
            { value: 'amd64', label: '64-bit (amd64)' },
            { value: 'arm64', label: 'ARM (arm64)' },
          ]}
        />
      </div>

      <div className="input-wrapper" style={{ marginBottom: '0' }}>
        <label className="input-label">{t('sysinfo.lang')}</label>
        <div
          className="info-box"
          style={{
            marginBottom: '10px',
            padding: '10px 12px',
            background: 'var(--bg-card)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          💡 {t('sysinfo.lang.info')}
        </div>
        <div className="input-container">
          <CustomSelect
            value={config.installLanguage}
            onChange={(val) => setConfig((prev) => ({ ...prev, installLanguage: val }))}
            options={
              language === 'en'
                ? [
                    { value: 'en', label: t('sysinfo.lang.en') },
                    { value: 'hu', label: t('sysinfo.lang.hu') },
                  ]
                : [
                    { value: 'hu', label: t('sysinfo.lang.hu') },
                    { value: 'en', label: t('sysinfo.lang.en') },
                  ]
            }
          />
        </div>
      </div>

      <div className="input-wrapper" style={{ marginTop: '16px', marginBottom: '0' }}>
        <label className="input-label">{t('sysinfo.timeZone')}</label>
        <div className="input-container">
          <CustomSelect
            value={config.timeZone || 'Central Europe Standard Time'}
            onChange={(val) => setConfig((prev) => ({ ...prev, timeZone: val }))}
            options={TIME_ZONES.map((tz) => ({ value: tz, label: tz }))}
          />
        </div>
        <p className="toggle-description">{t('sysinfo.timeZone.desc')}</p>
      </div>

      <AnimatedCollapse show={language === 'hu'}>
        <Toggle
          id="addEnglishKeyboard"
          label={t('sysinfo.kb')}
          description={t('sysinfo.kb.desc')}
          checked={config.addEnglishKeyboard}
          onChange={(value) => setConfig((prev) => ({ ...prev, addEnglishKeyboard: value }))}
        />
      </AnimatedCollapse>

      <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <Toggle
          id="enableLongPaths"
          label={t('sysinfo.longPaths.title')}
          description={t('sysinfo.longPaths.desc')}
          checked={config.enableLongPaths}
          onChange={(value) => setConfig((prev) => ({ ...prev, enableLongPaths: value }))}
        />
        <Toggle
          id="preventDeviceEncryption"
          label={t('sysinfo.deviceEncryption.title')}
          description={t('sysinfo.deviceEncryption.desc')}
          checked={config.preventDeviceEncryption}
          onChange={(value) => setConfig((prev) => ({ ...prev, preventDeviceEncryption: value }))}
        />
      </div>
    </Card>
  );
}
