import { useLanguage } from '../i18n/LanguageContext';
import { HardDrive } from 'lucide-react';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import InputField from '../components/InputField';
import Toggle from '../components/Toggle';

export default function PartitionSection({ config, setConfig, errors = {} }) {
  const { t } = useLanguage();

    const { partitioning } = config;

  const updatePartitioning = (updates) => {
    setConfig((prev) => ({
      ...prev,
      partitioning: { ...prev.partitioning, ...updates },
    }));
  };

  const partitionModeOptions = [
    { label: t('part.mode.auto'), value: 'auto' },
    { label: t('part.auto.split'), value: 'autocd' },
    { label: t('part.mode.custom'), value: 'custom' },
    { label: t('part.mode.manual'), value: 'manual' },
  ];

  return (
    <Card title={t('part.title')} icon={<HardDrive size={20} />}>
      <SegmentedControl
        label={t('part.mode')}
        options={partitionModeOptions}
        value={partitioning.mode}
        onChange={(value) => updatePartitioning({ mode: value })}
      />

      {(partitioning.mode === 'auto' || partitioning.mode === 'autocd') && (
        <div style={{ marginBottom: '20px', marginTop: '16px' }}>
          <Toggle
            label={t('part.fullWipe')}
            description={t('part.fullWipe.desc')}
            tooltip={t('tt.partFullWipe')}
            checked={partitioning.fullWipe}
            onChange={(checked) => updatePartitioning({ fullWipe: checked })}
          />
          {partitioning.fullWipe && (
            <div style={{ padding: '10px 15px', backgroundColor: 'rgba(234, 179, 8, 0.15)', borderLeft: '4px solid #eab308', borderRadius: '4px', marginTop: '10px' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#eab308' }}>
                {t('part.fullWipe.warning')}
              </p>
            </div>
          )}
        </div>
      )}

      {partitioning.mode !== 'manual' && (
        <>
          <InputField
            label={t('part.auto.disk')}
            type="number"
            value={partitioning.diskNumber === '' ? '' : String(partitioning.diskNumber)}
            onChange={(value) => {
              if (value === '') {
                updatePartitioning({ diskNumber: '' });
              } else {
                const num = parseInt(value, 10);
                if (!isNaN(num)) updatePartitioning({ diskNumber: Math.max(0, num) });
              }
            }}
            placeholder="0"
            id="disk-number"
          />
          <p className="toggle-description" style={{ marginTop: -12 }}>
            {t('part.auto.disk.desc')}
          </p>

          {partitioning.mode === 'auto' && (
            <div className="partition-preview">
              <div className="partition-preview-label">{t('part.auto.split.preview')}</div>
              <div className="partition-bar">
                <div className="partition-segment partition-efi" title="EFI System Partition (FAT32)">
                  <span className="partition-segment-label">EFI</span>
                  <span className="partition-segment-size">100 MB</span>
                </div>
                <div className="partition-segment partition-msr" title="Microsoft Reserved">
                  <span className="partition-segment-label">MSR</span>
                  <span className="partition-segment-size">16 MB</span>
                </div>
                <div className="partition-segment partition-windows" title="Windows (C:)">
                  <span className="partition-segment-label">Windows (C:)</span>
                  <span className="partition-segment-size">{t('part.auto.split.rest')}</span>
                </div>
              </div>
              <p className="toggle-description" style={{ marginTop: 4 }}>👉 <strong>{t('part.warning.cleanAll')}</strong> {t('part.warning.auto.layout')}</p>
            </div>
          )}

          {partitioning.mode === 'autocd' && (
            <div className="partition-preview">
              <div className="partition-preview-label">{t('part.auto.split.preview')}</div>
              <div className="partition-bar">
                <div className="partition-segment partition-efi" title="EFI System Partition (FAT32)">
                  <span className="partition-segment-label">EFI</span>
                  <span className="partition-segment-size">300 MB</span>
                </div>
                <div className="partition-segment partition-msr" title="Microsoft Reserved">
                  <span className="partition-segment-label">MSR</span>
                  <span className="partition-segment-size">16 MB</span>
                </div>
                <div className="partition-segment partition-windows" title="Windows (C:)">
                  <span className="partition-segment-label">Windows (C:)</span>
                  <span className="partition-segment-size">150 GB</span>
                </div>
                <div className="partition-segment" style={{ backgroundColor: '#10b981', color: 'white', flex: 1, padding: '4px', textAlign: 'center', fontSize: '11px' }} title={t('part.auto.split.dLabel')}>
                  <span className="partition-segment-label">{t('part.auto.split.dLabel')}</span>
                  <span className="partition-segment-size">{t('part.auto.split.rest')}</span>
                </div>
                <div className="partition-segment" style={{ backgroundColor: '#6366f1', color: 'white', minWidth: '40px', padding: '4px', textAlign: 'center', fontSize: '11px' }} title="Recovery">
                  <span className="partition-segment-label">Rec</span>
                  <span className="partition-segment-size">1 GB</span>
                </div>
              </div>
              <p className="toggle-description" style={{ marginTop: 4 }}>👉 <strong>{t('part.warning.clean')}</strong> {t('part.warning.autoCD.layout')}</p>
            </div>
          )}

          {partitioning.mode === 'custom' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="customDiskpartScript">{t('part.custom.script')}</label>
                <textarea
                  id="customDiskpartScript"
                  className={`diskpart-textarea ${errors.customDiskpartScript ? 'diskpart-textarea--error' : ''}`}
                  value={partitioning.customDiskpartScript}
                  onChange={(e) => updatePartitioning({ customDiskpartScript: e.target.value })}
                  placeholder={`select disk 0\nclean\nconvert gpt\ncreate partition efi size=100\nformat fs=fat32 quick label="System"\nassign letter=S\ncreate partition msr size=16\ncreate partition primary\nformat fs=ntfs quick label="Windows"\nassign letter=C`}
                  rows={12}
                  spellCheck={false}
                />
                {errors.customDiskpartScript && (
                  <p className="input-error">{errors.customDiskpartScript}</p>
                )}
                <p className="toggle-description">
                  {t('part.custom.script.desc')}
                </p>
              </div>

              <InputField
                label={t('part.custom.installId')}
                value={partitioning.installPartitionId === '' ? '' : String(partitioning.installPartitionId)}
                onChange={(value) => {
                  if (value === '') {
                    updatePartitioning({ installPartitionId: '' });
                  } else {
                    const num = parseInt(value, 10);
                    if (!isNaN(num)) updatePartitioning({ installPartitionId: Math.max(1, num) });
                  }
                }}
                placeholder="3"
                id="installPartitionId"
                error={errors.installPartitionId}
              />
              <p className="toggle-description" style={{ marginTop: -12 }}>
                {t('part.custom.installId.desc')}
              </p>
            </>
          )}
        </>
      )}
    </Card>
  );
}
