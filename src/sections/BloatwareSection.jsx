import { useLanguage } from '../i18n/LanguageContext';
import { Trash2 } from 'lucide-react';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';

export default function BloatwareSection({ config, setConfig }) {
  const { t } = useLanguage();

  const bloatwareItems = [
    { key: 'todo', label: t('bloat.item.todo') },
    { key: 'stickyNotes', label: t('bloat.item.stickyNotes') },
    { key: 'quickAssist', label: t('bloat.item.quickAssist') },
    { key: 'weather', label: t('bloat.item.weather') },
    { key: 'camera', label: t('bloat.item.camera') },
    { key: 'bingNews', label: t('bloat.item.bingNews') },
    { key: 'clipchamp', label: t('bloat.item.clipchamp') },
    { key: 'clock', label: t('bloat.item.clock') },
    { key: 'outlook', label: t('bloat.item.outlook') },
    { key: 'powerAutomate', label: t('bloat.item.powerAutomate') },
    { key: 'solitaire', label: t('bloat.item.solitaire') },
    { key: 'feedbackHub', label: t('bloat.item.feedbackHub') },
  ];

  const handleCheckbox = (key) => (checked) => {
    setConfig((prev) => ({
      ...prev,
      bloatware: { ...prev.bloatware, [key]: checked },
    }));
  };

  const selectAll = () => {
    setConfig((prev) => {
      const updated = { ...prev.bloatware };
      bloatwareItems.forEach(({ key }) => {
        updated[key] = true;
      });
      return { ...prev, bloatware: updated };
    });
  };

  const deselectAll = () => {
    setConfig((prev) => {
      const updated = { ...prev.bloatware };
      bloatwareItems.forEach(({ key }) => {
        updated[key] = false;
      });
      return { ...prev, bloatware: updated };
    });
  };

  return (
    <Card title={t('bloat.title')} icon={<Trash2 size={20} />} tooltip={t('tt.bloatwareDesc')}>
      <div className="btn-group">
        <button type="button" className="btn-secondary" onClick={selectAll}>{t('bloat.selectAll')}</button>
        <button type="button" className="btn-secondary" onClick={deselectAll}>{t('bloat.deselectAll')}</button>
      </div>
      <div className="checkbox-group">
        {bloatwareItems.map(({ key, label }) => (
          <Checkbox
            key={key}
            label={label}
            checked={config.bloatware[key] || false}
            onChange={handleCheckbox(key)}
            id={`bloat-${key}`}
          />
        ))}
      </div>
    </Card>
  );
}
