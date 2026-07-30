import { useLanguage } from '../i18n/LanguageContext';
import { HardDrive } from 'lucide-react';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import InputField from '../components/InputField';
import Toggle from '../components/Toggle';
import AnimatedCollapse from '../components/AnimatedCollapse';

const DEFAULTS = { efiSizeMb: 300, windowsSizeMb: 153600, recoverySizeMb: 1024 };

function toMb(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function formatSize(mb) {
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
}

export default function PartitionSection({ config, setConfig, errors = {} }) {
  const { t } = useLanguage();

  const { partitioning } = config;

  const updatePartitioning = (updates) => {
    setConfig((prev) => ({
      ...prev,
      partitioning: { ...prev.partitioning, ...updates },
    }));
  };

  // Az előnézet mostantól a VALÓS beállított értékeket mutatja. Korábban be
  // volt égetve (100 MB / 300 MB / 150 GB), és nem is egyezett a generátorral.
  const sizes = {
    efi: toMb(partitioning.efiSizeMb, DEFAULTS.efiSizeMb),
    windows: toMb(partitioning.windowsSizeMb, DEFAULTS.windowsSizeMb),
    recovery: toMb(partitioning.recoverySizeMb, DEFAULTS.recoverySizeMb),
  };

  const partitionModeOptions = [
    { label: t('part.mode.auto'), value: 'auto' },
    { label: t('part.auto.split'), value: 'autocd' },
    { label: t('part.mode.custom'), value: 'custom' },
    { label: t('part.mode.manual'), value: 'manual' },
  ];

  const numberInput = (id, labelKey, field, fallback, error) => (
    <InputField
      label={t(labelKey)}
      type="number"
      id={id}
      value={partitioning[field] === '' ? '' : String(partitioning[field] ?? fallback)}
      onChange={(value) => {
        if (value === '') {
          updatePartitioning({ [field]: '' });
        } else {
          const num = parseInt(value, 10);
          if (!Number.isNaN(num)) updatePartitioning({ [field]: Math.max(0, num) });
        }
      }}
      placeholder={String(fallback)}
      error={error}
    />
  );

  return (
    <Card title={t('part.title')} icon={<HardDrive size={20} />} tooltip={t('tt.partitionDesc')}>
      <SegmentedControl
        label={t('part.mode')}
        options={partitionModeOptions}
        value={partitioning.mode}
        onChange={(value) => updatePartitioning({ mode: value })}
      />

      <AnimatedCollapse show={partitioning.mode !== 'manual'} marginTop="16px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <InputField
            label={t('part.auto.disk')}
            type="number"
            value={partitioning.diskNumber === '' ? '' : String(partitioning.diskNumber)}
            onChange={(value) => {
              if (value === '') {
                updatePartitioning({ diskNumber: '' });
              } else {
                const num = parseInt(value, 10);
                if (!Number.isNaN(num)) updatePartitioning({ diskNumber: Math.max(0, num) });
              }
            }}
            placeholder="0"
            id="disk-number"
            error={errors.diskNumber}
            style={{ marginBottom: '8px' }}
          />
          <p className="toggle-description" style={{ margin: 0, paddingBottom: '4px' }}>
            {t('part.auto.disk.desc')}
          </p>
        </div>
      </AnimatedCollapse>

      <AnimatedCollapse show={partitioning.mode === 'auto' || partitioning.mode === 'autocd'}>
        <div>
          <Toggle
            label={t('part.fullWipe')}
            description={t('part.fullWipe.desc')}
            checked={partitioning.fullWipe}
            onChange={(checked) => updatePartitioning({ fullWipe: checked })}
          />
          <AnimatedCollapse show={partitioning.fullWipe} marginTop="10px">
            <div
              style={{
                padding: '10px 15px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                borderLeft: '4px solid #eab308',
                borderRadius: '4px',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#eab308' }}>{t('part.fullWipe.warning')}</p>
            </div>
          </AnimatedCollapse>
        </div>

        {/* Konfigurálható méretek – korábban be voltak égetve a generátorba. */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {numberInput('efiSizeMb', 'part.size.efi', 'efiSizeMb', DEFAULTS.efiSizeMb, errors.efiSizeMb)}
          {partitioning.mode === 'autocd' && (
            <>
              {numberInput('windowsSizeMb', 'part.size.windows', 'windowsSizeMb', DEFAULTS.windowsSizeMb, errors.windowsSizeMb)}
              {numberInput('recoverySizeMb', 'part.size.recovery', 'recoverySizeMb', DEFAULTS.recoverySizeMb, errors.recoverySizeMb)}
            </>
          )}
          <p className="toggle-description" style={{ margin: 0 }}>
            {t('part.size.desc')}
          </p>
        </div>

        {partitioning.mode === 'auto' && (
          <div className="partition-preview">
            <div className="partition-preview-label">{t('part.auto.split.preview')}</div>
            <div className="partition-bar">
              <div className="partition-segment partition-efi" title="EFI System Partition (FAT32)">
                <span className="partition-segment-label">EFI</span>
                <span className="partition-segment-size">{formatSize(sizes.efi)}</span>
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
            <p className="toggle-description" style={{ marginTop: 4 }}>
              👉 <strong>{partitioning.fullWipe ? t('part.warning.cleanAll') : t('part.warning.clean')}</strong>{' '}
              {t('part.warning.auto.layout')}
            </p>
          </div>
        )}

        {partitioning.mode === 'autocd' && (
          <div className="partition-preview">
            <div className="partition-preview-label">{t('part.auto.split.preview')}</div>
            <div className="partition-bar">
              <div className="partition-segment partition-efi" title="EFI System Partition (FAT32)">
                <span className="partition-segment-label">EFI</span>
                <span className="partition-segment-size">{formatSize(sizes.efi)}</span>
              </div>
              <div className="partition-segment partition-msr" title="Microsoft Reserved">
                <span className="partition-segment-label">MSR</span>
                <span className="partition-segment-size">16 MB</span>
              </div>
              <div className="partition-segment partition-windows" title="Windows (C:)">
                <span className="partition-segment-label">Windows (C:)</span>
                <span className="partition-segment-size">{formatSize(sizes.windows)}</span>
              </div>
              <div
                className="partition-segment"
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  flex: 1,
                  padding: '4px',
                  textAlign: 'center',
                  fontSize: '11px',
                }}
                title={t('part.auto.split.dLabel')}
              >
                <span className="partition-segment-label">{t('part.auto.split.dLabel')}</span>
                <span className="partition-segment-size">{t('part.auto.split.rest')}</span>
              </div>
              <div
                className="partition-segment"
                style={{
                  backgroundColor: '#6366f1',
                  color: 'white',
                  minWidth: '40px',
                  padding: '4px',
                  textAlign: 'center',
                  fontSize: '11px',
                }}
                title="Recovery"
              >
                <span className="partition-segment-label">Rec</span>
                <span className="partition-segment-size">{formatSize(sizes.recovery)}</span>
              </div>
            </div>
            <p className="toggle-description" style={{ marginTop: 4 }}>
              👉 <strong>{partitioning.fullWipe ? t('part.warning.cleanAll') : t('part.warning.clean')}</strong>{' '}
              {t('part.warning.autoCD.layout')}
            </p>
          </div>
        )}
      </AnimatedCollapse>

      <AnimatedCollapse show={partitioning.mode === 'custom'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="customDiskpartScript">
              {t('part.custom.script')}
            </label>
            <textarea
              id="customDiskpartScript"
              className={`diskpart-textarea ${errors.customDiskpartScript ? 'diskpart-textarea--error' : ''}`}
              value={partitioning.customDiskpartScript}
              onChange={(e) => updatePartitioning({ customDiskpartScript: e.target.value })}
              placeholder={`select disk 0\nclean\nconvert gpt\ncreate partition efi size=300\nformat fs=fat32 quick label="System"\nassign letter=S\ncreate partition msr size=16\ncreate partition primary\nformat fs=ntfs quick label="Windows"\nassign letter=C`}
              rows={12}
              spellCheck={false}
            />
            {errors.customDiskpartScript && <p className="input-error">{errors.customDiskpartScript}</p>}
            <p className="toggle-description" style={{ margin: 0 }}>
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
                if (!Number.isNaN(num)) updatePartitioning({ installPartitionId: Math.max(1, num) });
              }
            }}
            placeholder="3"
            type="number"
            error={errors.installPartitionId}
            id="installPartitionId"
            style={{ marginBottom: '8px' }}
          />
          <p className="toggle-description" style={{ margin: 0, paddingTop: '8px' }}>
            {t('part.custom.installId.desc')}
          </p>
        </div>
      </AnimatedCollapse>
    </Card>
  );
}
