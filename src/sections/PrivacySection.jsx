import { useLanguage } from '../i18n/LanguageContext';
import { EyeOff } from 'lucide-react';
import Card from '../components/Card';
import Toggle from '../components/Toggle';

export default function PrivacySection({ config, setConfig }) {
  const { t } = useLanguage();

  
  const handleToggle = (field) => (value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card title={t('section.privacy')} icon={<EyeOff size={20} />} tooltip={t('tt.privacyDesc')}>
      <Toggle
        label={t('privacy.telemetry.title')}
        description={t('privacy.telemetry.desc')}
        checked={config.disableTelemetry}
        onChange={handleToggle('disableTelemetry')}
        id="disableTelemetry"
      />
      <Toggle
        label={t('privacy.edgeFirstRun')}
        description={t('privacy.edgeFirstRun.desc')}
        checked={config.disableEdgeFirstRun}
        onChange={handleToggle('disableEdgeFirstRun')}
        id="disableEdgeFirstRun"
      />
      <Toggle
        label={t('privacy.uac.title')}
        description={t('privacy.uac.desc')}
        checked={config.disableUAC}
        onChange={handleToggle('disableUAC')}
        id="disableUAC"
      />
    </Card>
  );
}
