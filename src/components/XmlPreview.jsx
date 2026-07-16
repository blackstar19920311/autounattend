import { useLanguage } from '../i18n/LanguageContext';
import React, { useCallback } from 'react'

/**
 * Egyszerű XML szintaxiskiemelő függvény.
 * Regex-szel felismeri a tag-eket, attribútumokat, értékeket és megjegyzéseket,
 * majd CSS osztályokba csomagolja őket a színezéshez.
 * 
 * @param {string} str - Nyers XML szöveg
 * @returns {string} HTML szöveg szintaxiskiemelő span-ekkel
 */
function highlightXml(str) {
  if (!str) return ''

  /* Először HTML-escape, hogy ne legyen XSS */
  let escaped = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  /* XML megjegyzések kiemelése: <!-- ... --> */
  escaped = escaped.replace(
    /(&lt;!--[\s\S]*?--&gt;)/g,
    '<span class="xml-comment">$1</span>'
  )

  /* Attribútum értékek kiemelése: ="..." */
  escaped = escaped.replace(
    /([\w:]+)(=)(&quot;)(.*?)(&quot;)/g,
    '<span class="xml-attr">$1</span>$2<span class="xml-val">$3$4$5</span>'
  )

  /* XML tag-ek kiemelése: <tag>, </tag>, <tag/> */
  escaped = escaped.replace(
    /(&lt;\/?)([\w:.-]+)/g,
    '$1<span class="xml-tag">$2</span>'
  )

  /* Záró > és /> kiemelése */
  escaped = escaped.replace(
    /(\/?&gt;)/g,
    '<span class="xml-tag">$1</span>'
  )

  return escaped
}

/**
 * XML Előnézet panel komponens.
 * 
 * @param {string} xml - A megjelenítendő XML
 * @param {function} onCopy - Másolás callback
 * @param {function} onDownload - Letöltés callback
 */
export default function XmlPreview({ xml, onCopy, onDownload }) {
  const { t } = useLanguage();
  
  /**
   * Vágólapra másolás a Clipboard API segítségével.
   * Sikeres/sikertelen esetben meghívja az onCopy callback-et.
   */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(xml)
      onCopy?.('success')
    } catch {
      onCopy?.('error')
    }
  }, [xml, onCopy])

  /**
   * XML letöltése fájlként. (A letöltés végrehajtását a szülő komponens kezeli a friss adatokért)
   */
  const handleDownload = useCallback(() => {
    onDownload?.()
  }, [onDownload])

  return (
    <aside className="xml-preview">
      {/* Fejléc: cím és akció gombok */}
      <div className="xml-preview-header">
        <h3 className="xml-preview-title">{t('app.preview.title')}</h3>
        {xml && (
          <div className="xml-preview-actions">
            <button className="xml-preview-btn" onClick={handleCopy} type="button">
              📋 {t('app.preview.copy')}
            </button>
            <button className="xml-preview-btn" onClick={handleDownload} type="button">
              💾 {t('app.preview.download')}
            </button>
          </div>
        )}
      </div>

      {/* XML tartalom görgethető dobozban */}
      <div className="xml-preview-code">
        {xml ? (
          <pre>
            <code dangerouslySetInnerHTML={{ __html: highlightXml(xml) }} />
          </pre>
        ) : (
          <div className="xml-preview-placeholder">{t('app.preview.placeholder')}</div>
        )}
      </div>
    </aside>
  )
}
