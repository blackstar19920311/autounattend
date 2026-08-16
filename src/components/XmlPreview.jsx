import { useLanguage } from '../i18n/LanguageContext';
import React, { useCallback } from 'react';

export default function XmlPreview({ xml, onCopy, onDownload }) {
  const { t } = useLanguage();
  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(xml); onCopy?.('success'); }
    catch { onCopy?.('error'); }
  }, [xml, onCopy]);
  const handleDownload = useCallback(() => {
    try {
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'autounattend.xml';
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); onDownload?.('success');
    } catch { onDownload?.('error'); }
  }, [xml, onDownload]);
  return <aside className="xml-preview">
    <div className="xml-preview-header">
      <h3 className="xml-preview-title">{t('app.preview.title')}</h3>
      {xml && <div className="xml-preview-actions">
        <button className="xml-preview-btn" onClick={handleCopy} type="button">📋 {t('app.preview.copy')}</button>
        <button className="xml-preview-btn" onClick={handleDownload} type="button">💾 {t('app.preview.download')}</button>
      </div>}
    </div>
    <div className="xml-preview-code">
      {xml ? <pre><code>{xml}</code></pre> : <div className="xml-preview-placeholder">{t('app.preview.placeholder')}</div>}
    </div>
  </aside>;
}
