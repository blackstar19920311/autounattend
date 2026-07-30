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
      <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <Toggle
          id="disableConsumerFeatures"
          label={t('privacy.consumerFeatures.title')}
          description={t('privacy.consumerFeatures.desc')}
          checked={config.disableConsumerFeatures}
          onChange={handleToggle('disableConsumerFeatures')}
        />
        <Toggle
          id="disableCopilot"
          label={t('privacy.copilot.title')}
          description={t('privacy.copilot.desc')}
          checked={config.disableCopilot}
          onChange={handleToggle('disableCopilot')}
        />
      </div>
    </Card>
  );
}
