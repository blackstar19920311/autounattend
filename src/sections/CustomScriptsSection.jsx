import { useLanguage } from '../i18n/LanguageContext';
import { Code } from 'lucide-react';
import Card from '../components/Card';

export default function CustomScriptsSection() {
  const { t } = useLanguage();
  return <Card title={t('cs.title')} icon={<Code size={20} />} tooltip={t('tt.csDesc')}>
    <p className="toggle-description">Deployment-time PowerShell, WinGet, Office downloads, domain joins and credential-bearing scripts are disabled in the hardened Windows 11 25H2 generator.</p>
    <p className="toggle-description">Use Intune, Windows Autopilot, Configuration Manager or a signed provisioning package for enterprise software, Wi-Fi, updates and domain or Entra enrollment.</p>
  </Card>;
}
