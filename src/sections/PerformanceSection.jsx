import { useLanguage } from '../i18n/LanguageContext';
import { Zap } from 'lucide-react';
import Card from '../components/Card';
import Toggle from '../components/Toggle';

export default function PerformanceSection({ config, setConfig }) {
  const { t } = useLanguage();

  
  const handleToggle = (field) => (value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card title={t('perf.title')} icon={<Zap size={20} />} tooltip={t('tt.performanceDesc')}>
      <Toggle
        label={t('perf.fastStartup')}
        description={t('perf.fastStartup.desc')}
        checked={config.disableFastStartup}
        onChange={handleToggle('disableFastStartup')}
        id="disableFastStartup"
      />
      <Toggle
        label={t('perf.sleep')}
        description={t('perf.sleep.desc')}
        checked={config.disableSleep}
        onChange={handleToggle('disableSleep')}
        id="disableSleep"
      />
      <Toggle
        label={t('perf.mouseAccel')}
        description={t('perf.mouseAccel.desc')}
        checked={config.disableMouseAcceleration}
        onChange={handleToggle('disableMouseAcceleration')}
        id="disableMouseAcceleration"
      />
      <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <Toggle
          id="disableBackgroundApps"
          label={t('performance.backgroundApps.title')}
          description={t('performance.backgroundApps.desc')}
          checked={config.disableBackgroundApps}
          onChange={handleToggle('disableBackgroundApps')}
        />
        <Toggle
          id="disableGameDVR"
          label={t('performance.gameDVR.title')}
          description={t('performance.gameDVR.desc')}
          checked={config.disableGameDVR}
          onChange={handleToggle('disableGameDVR')}
        />
      </div>
    </Card>
  );
}
