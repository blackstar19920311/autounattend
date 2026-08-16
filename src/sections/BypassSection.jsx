import { useLanguage } from '../i18n/LanguageContext';
import { ShieldAlert } from 'lucide-react';
import Card from '../components/Card';
import Toggle from '../components/Toggle';

export default function BypassSection({ config, setConfig }) {
  const { t } = useLanguage();
  const handleEula = (value) => setConfig((prev) => ({ ...prev, autoAcceptEula: value }));
  return <Card title={t('section.bypasses')} icon={<ShieldAlert size={20} />} tooltip={t('tt.bypassDesc')}>
    <p className="toggle-description">Windows 11 25H2 hardware and network bypasses are intentionally unavailable. Unsupported bypasses create devices outside Microsoft servicing and security requirements.</p>
    <Toggle label={t('bypass.eula')} description={t('bypass.eula.desc')} checked={config.autoAcceptEula} onChange={handleEula} id="autoAcceptEula" />
  </Card>;
}
