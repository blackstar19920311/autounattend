import { useLanguage } from '../i18n/LanguageContext';
import { EyeOff, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';
import Toggle from '../components/Toggle';
import AnimatedCollapse from '../components/AnimatedCollapse';

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
      {/* Az UAC kikapcsolása Win11-en megbénítja a Store/UWP appokat és a
          Beállításokat – eddig semmi nem szólt erről a felhasználónak. */}
      <AnimatedCollapse show={!!config.disableUAC} marginTop="10px">
        <div
          style={{
            padding: '10px 15px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            borderLeft: '4px solid #ef4444',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#ef4444' }}>{t('privacy.uac.warning')}</p>
        </div>
      </AnimatedCollapse>

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
