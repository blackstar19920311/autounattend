import { useLanguage } from '../i18n/LanguageContext';
import { HardDrive } from 'lucide-react';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';

export default function PartitionSection() {
  const { t } = useLanguage();
  return <Card title={t('part.title')} icon={<HardDrive size={20} />} tooltip={t('tt.partitionDesc')}>
    <p className="toggle-description">Automatic, custom and full-wipe partitioning are disabled in the hardened generator. Use Windows Setup or managed imaging to provision a 500 MB+ ESP, MSR, OS and a dedicated WinRE partition sized for Windows 11 25H2.</p>
    <SegmentedControl label={t('part.mode')} options={[{ label: t('part.mode.manual'), value: 'manual' }]} value="manual" onChange={() => {}} />
  </Card>;
}
