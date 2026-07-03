import { useLanguage } from '../i18n/LanguageContext';
import { ShieldAlert } from 'lucide-react';
import Card from '../components/Card';

import Toggle from '../components/Toggle';

export default function BypassSection({ config, setConfig }) {
  const { t } = useLanguage();

  
  const handleToggle = (field) => (value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card title={t('section.bypasses')} icon={<ShieldAlert size={20} />} tooltip={t('tt.bypassDesc')}>
      <Toggle
        label={t('bypass.hardware')}
        description={t('bypass.hardware.desc')}
        checked={config.bypassHardware}
        onChange={handleToggle('bypassHardware')}
        id="bypassHardware"
      />
      <Toggle
        label={t('bypass.network')}
        description={t('bypass.network.desc')}
        checked={config.bypassNetwork}
        onChange={handleToggle('bypassNetwork')}
        id="bypassNetwork"
      />
      <Toggle
        label={t('bypass.eula')}
        description={t('bypass.eula.desc')}
        checked={config.autoAcceptEula}
        onChange={handleToggle('autoAcceptEula')}
        id="autoAcceptEula"
      />
    </Card>
  );
}
