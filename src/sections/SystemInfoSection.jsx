import { useLanguage } from '../i18n/LanguageContext';
import { Monitor } from 'lucide-react';
import Card from '../components/Card';
import Toggle from '../components/Toggle';
import SegmentedControl from '../components/SegmentedControl';

export default function SystemInfoSection({ config, setConfig }) {
  const { t } = useLanguage();

  
  const handleArchChange = (value) => {
    setConfig((prev) => ({ ...prev, architecture: value }));
  };

  return (
    <Card title={t('sysinfo.title')} icon={<Monitor size={20} />}>
      <div className="form-group">
        <SegmentedControl
          label={t('sysinfo.arch')}
          value={config.architecture}
          onChange={handleArchChange}
          options={[
            { value: 'amd64', label: '64-bit (amd64)' },
            { value: 'arm64', label: 'ARM (arm64)' }
          ]}
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t('sysinfo.lang')}</label>
        <div className="select-display select-display--disabled" aria-disabled="true">{t('sysinfo.lang.hu')}</div>
      </div>

      <Toggle
        id="addEnglishKeyboard"
        label={t('sysinfo.kb')}
        description={t('sysinfo.kb.desc')}
        tooltip={t('tt.kb')}
        checked={config.addEnglishKeyboard}
        onChange={(value) => setConfig((prev) => ({ ...prev, addEnglishKeyboard: value }))}
      />
    </Card>
  );
}
