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
    <Card title={t('perf.title')} icon={<Zap size={20} />}>
      <Toggle
        label={t('perf.fastStartup')}
        description={t('perf.fastStartup.desc')}
        tooltip={t('tt.fastStartup')}
        checked={config.disableFastStartup}
        onChange={handleToggle('disableFastStartup')}
        id="disableFastStartup"
      />
      <Toggle
        label={t('perf.sleep')}
        description={t('perf.sleep.desc')}
        tooltip={t('tt.sleep')}
        checked={config.disableSleep}
        onChange={handleToggle('disableSleep')}
        id="disableSleep"
      />
      <Toggle
        label={t('perf.mouseAccel')}
        description={t('perf.mouseAccel.desc')}
        tooltip={t('tt.mouseAccel')}
        checked={config.disableMouseAcceleration}
        onChange={handleToggle('disableMouseAcceleration')}
        id="disableMouseAcceleration"
      />
    </Card>
  );
}
