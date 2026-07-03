import { useLanguage } from '../i18n/LanguageContext';
import { Trash2 } from 'lucide-react';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';

export default function BloatwareSection({ config, setConfig }) {
  const { t } = useLanguage();

  const bloatwareItems = [
    { key: 'todo', label: t('bloat.item.todo'), tooltip: t('tt.bloatTodo') },
    { key: 'experiencesApp', label: t('bloat.item.experiencesApp'), tooltip: t('tt.bloatExperiences') },
    { key: 'stickyNotes', label: t('bloat.item.stickyNotes'), tooltip: t('tt.bloatStickyNotes') },
    { key: 'quickAssist', label: t('bloat.item.quickAssist'), tooltip: t('tt.bloatQuickAssist') },
    { key: 'weather', label: t('bloat.item.weather'), tooltip: t('tt.bloatWeather') },
    { key: 'camera', label: t('bloat.item.camera'), tooltip: t('tt.bloatCamera') },
    { key: 'bingNews', label: t('bloat.item.bingNews'), tooltip: t('tt.bloatBingNews') },
    { key: 'clipchamp', label: t('bloat.item.clipchamp'), tooltip: t('tt.bloatClipchamp') },
    { key: 'clock', label: t('bloat.item.clock'), tooltip: t('tt.bloatClock') },
    { key: 'outlook', label: t('bloat.item.outlook'), tooltip: t('tt.bloatOutlook') },
    { key: 'powerAutomate', label: t('bloat.item.powerAutomate'), tooltip: t('tt.bloatPowerAutomate') },
    { key: 'solitaire', label: t('bloat.item.solitaire'), tooltip: t('tt.bloatSolitaire') },
    { key: 'terminal', label: t('bloat.item.terminal'), tooltip: t('tt.bloatTerminal') },
    { key: 'feedbackHub', label: t('bloat.item.feedbackHub'), tooltip: t('tt.bloatFeedbackHub') },
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
    <Card title={t('bloat.title')} icon={<Trash2 size={20} />}>
      <div className="btn-group">
        <button type="button" className="btn-secondary" onClick={selectAll}>{t('bloat.selectAll')}</button>
        <button type="button" className="btn-secondary" onClick={deselectAll}>{t('bloat.deselectAll')}</button>
      </div>
      <div className="checkbox-group">
        {bloatwareItems.map(({ key, label, tooltip }) => (
          <Checkbox
            key={key}
            label={label}
            tooltip={tooltip}
            checked={config.bloatware[key] || false}
            onChange={handleCheckbox(key)}
            id={`bloat-${key}`}
          />
        ))}
      </div>
    </Card>
  );
}
