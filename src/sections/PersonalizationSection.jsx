import { useLanguage } from '../i18n/LanguageContext';
import { Palette } from 'lucide-react';
import Card from '../components/Card';
import Checkbox from '../components/Checkbox';
import Toggle from '../components/Toggle';
import SegmentedControl from '../components/SegmentedControl';

export default function PersonalizationSection({ config, setConfig }) {
  const { t } = useLanguage();

  
  const searchBoxOptions = [
    { label: t('pers.taskbar.searchBox.full'), value: 'full' },
    { label: t('pers.taskbar.searchBox.iconLabel'), value: 'iconLabel' },
    { label: t('pers.taskbar.searchBox.iconOnly'), value: 'iconOnly' },
    { label: t('pers.taskbar.searchBox.hidden'), value: 'hidden' },
  ];

  const handleToggle = (field) => (value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleDesktopIcon = (icon) => (checked) => {
    setConfig((prev) => ({
      ...prev,
      desktopIcons: { ...prev.desktopIcons, [icon]: checked },
    }));
  };

  return (
    <Card title={t('section.personalization')} icon={<Palette size={20} />} tooltip={t('tt.personalizationDesc')}>
      {/* 4.1 Asztali ikonok */}
      <h3 className="subsection">{t('pers.desktopIcons')}</h3>
      <div className="checkbox-group">
        <Checkbox
          label={t('pers.desktopIcons.computer')}
          checked={config.desktopIcons.computer}
          onChange={handleDesktopIcon('computer')}
          id="icon-computer"
        />
        <Checkbox
          label={t('pers.desktopIcons.recycleBin')}
          checked={config.desktopIcons.recycleBin}
          onChange={handleDesktopIcon('recycleBin')}
          id="icon-recycleBin"
        />
        <Checkbox
          label={t('pers.desktopIcons.userFiles')}
          checked={config.desktopIcons.userFiles}
          onChange={handleDesktopIcon('userFiles')}
          id="icon-userFiles"
        />
        <Checkbox
          label={t('pers.desktopIcons.controlPanel')}
          checked={config.desktopIcons.controlPanel}
          onChange={handleDesktopIcon('controlPanel')}
          id="icon-controlPanel"
        />
        <Checkbox
          label={t('pers.desktopIcons.network')}
          checked={config.desktopIcons.network}
          onChange={handleDesktopIcon('network')}
          id="icon-network"
        />
      </div>

      {/* 4.2 Tálca */}
      <h3 className="subsection">{t('pers.taskbar')}</h3>
      <SegmentedControl
        label={t('pers.taskbar.searchBox')}
        options={searchBoxOptions}
        value={config.searchBoxMode}
        onChange={(value) => setConfig((prev) => ({ ...prev, searchBoxMode: value }))}
      />
      <Toggle
        label={t('pers.taskbar.hideIcons')}
        description={t('pers.taskbar.hideIcons.desc')}
        checked={config.hideTaskbarIcons}
        onChange={handleToggle('hideTaskbarIcons')}
        id="hideTaskbarIcons"
      />
      <Toggle
        label={t('pers.taskbar.showAllTrayIcons')}
        description={t('pers.taskbar.showAllTrayIcons.desc')}
        checked={config.showAllTrayIcons}
        onChange={handleToggle('showAllTrayIcons')}
        id="showAllTrayIcons"
      />
      <Toggle
        label={t('pers.transparency')}
        description={t('pers.transparency.desc')}
        checked={config.disableTransparency}
        onChange={handleToggle('disableTransparency')}
        id="disableTransparency"
      />

      {/* 4.3 Start menü */}
      <h3 className="subsection">{t('pers.startMenu')}</h3>
      <Toggle
        label={t('pers.startMenu.hideRecent')}
        description={t('pers.startMenu.hideRecent.desc')}
        checked={config.hideRecentApps}
        onChange={handleToggle('hideRecentApps')}
        id="hideRecentApps"
      />
      <Toggle
        label={t('pers.startMenu.hideMostUsed')}
        description={t('pers.startMenu.hideMostUsed.desc')}
        checked={config.hideMostUsedApps}
        onChange={handleToggle('hideMostUsedApps')}
        id="hideMostUsedApps"
      />
      <Toggle
        label={t('pers.startMenu.hideRecommended')}
        description={t('pers.startMenu.hideRecommended.desc')}
        checked={config.hideRecommendedFiles}
        onChange={handleToggle('hideRecommendedFiles')}
        id="hideRecommendedFiles"
      />
      <Toggle
        label={t('pers.startMenu.hideTips')}
        description={t('pers.startMenu.hideTips.desc')}
        checked={config.hideTipsAndSuggestions}
        onChange={handleToggle('hideTipsAndSuggestions')}
        id="hideTipsAndSuggestions"
      />
      <Toggle
        label={t('pers.startMenu.disableWebSearch')}
        description={t('pers.startMenu.disableWebSearch.desc')}
        checked={config.disableWebSearch}
        onChange={handleToggle('disableWebSearch')}
        id="disableWebSearch"
      />
      <Toggle
        label={t('pers.startMenu.cleanPins')}
        description={t('pers.startMenu.cleanPins.desc')}
        checked={config.cleanStartPins}
        onChange={handleToggle('cleanStartPins')}
        id="cleanStartPins"
      />
      <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <Toggle
          id="disableNewsAndInterests"
          label={t('personalization.newsAndInterests.title')}
          description={t('personalization.newsAndInterests.desc')}
          checked={config.disableNewsAndInterests}
          onChange={handleToggle('disableNewsAndInterests')}
        />
        <Toggle
          id="disableEdgeDesktopShortcut"
          label={t('personalization.edgeDesktopShortcut.title')}
          description={t('personalization.edgeDesktopShortcut.desc')}
          checked={config.disableEdgeDesktopShortcut}
          onChange={handleToggle('disableEdgeDesktopShortcut')}
        />
      </div>
    </Card>
  );
}
