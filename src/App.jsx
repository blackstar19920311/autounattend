import { useLanguage } from './i18n/LanguageContext';
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Play, RotateCcw, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

// Szekció komponensek
import SystemInfoSection from './sections/SystemInfoSection'
import PresetsSection from './sections/PresetsSection'
import BypassSection from './sections/BypassSection'
import PartitionSection from './sections/PartitionSection'
import UserAccountSection from './sections/UserAccountSection'
import PersonalizationSection from './sections/PersonalizationSection'
import PrivacySection from './sections/PrivacySection'
import PerformanceSection from './sections/PerformanceSection'
import BloatwareSection from './sections/BloatwareSection'
import WifiSection from './sections/WifiSection'
import CustomScriptsSection from './sections/CustomScriptsSection'

// UI komponensek
import SectionNav from './components/SectionNav'
import XmlPreview from './components/XmlPreview'
import UserManual from './components/UserManual'

// Segédeszközök
import { generateXml } from './utils/generateXml'
import { validateConfig } from './utils/validation'
import { SECTIONS } from './data/sections'

import { getDefaultConfig } from './data/defaultConfig'

/* ============================================================
   Fő alkalmazás komponens
   ============================================================ */
export default function App() {
  const { t, language } = useLanguage();

  const [config, setConfig] = useState(() => {
    const def = getDefaultConfig();
    def.installLanguage = language;
    return def;
  });

  // Sync installLanguage when UI language changes
  useEffect(() => {
    setConfig(prev => ({ ...prev, installLanguage: language }));
  }, [language]);

  const [xml, setXml] = useState('');
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [activeSection, setActiveSection] = useState('presets')
  const resetPresetRef = useRef(null)
  const statusTimeoutRef = useRef(null)

  /* --- Konfiguráció frissítő segédfüggvény --- */
  const updateConfig = useCallback((updates) => {
    setConfig(prev => {
      if (typeof updates === 'function') return updates(prev)
      return { ...prev, ...updates }
    })
  }, [])

  /* --- Státusz üzenet mutatása időkorláttal --- */
  const showStatus = useCallback((type, message, duration = 5000) => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    setStatus({ type, message })
    statusTimeoutRef.current = setTimeout(() => setStatus(null), duration)
  }, [])

  /* --- XML generálás --- */
  const handleGenerate = useCallback(() => {
    const validation = validateConfig(config, t)
    if (!validation.isValid) {
      setErrors(validation.errors)
      showStatus('error', t('app.status.error.validation'))
      const firstErrorField = Object.keys(validation.errors)[0]
      const el = document.getElementById(firstErrorField)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    try {
      const generatedXml = generateXml(config, language)
      setXml(generatedXml)
      setErrors({})
      showStatus('success', t('app.status.success'))
    } catch (err) {
      console.error('XML generálási hiba:', err)
      showStatus('error', t('app.status.error.generation'))
    }
  }, [config, showStatus, t])

  /* --- Beállítások visszaállítása --- */
  const handleReset = useCallback(() => {
    setConfig(getDefaultConfig())
    setXml('')
    setErrors({})
    setActiveSection('presets')
    const mainEl = document.querySelector('.scrollable-sections')
    if (mainEl) mainEl.scrollTop = 0
    // Preset gombok resetelése a PresetsSection-ben
    if (resetPresetRef.current) resetPresetRef.current()
    showStatus('warning', t('app.status.warning.reset'))
  }, [showStatus, t])

  const handleCopy = useCallback((status) => {
    if (status === 'error') showStatus('error', t('app.status.copy.error'))
    else showStatus('success', t('app.status.copy.success'))
  }, [showStatus, t])

  const handleDownload = useCallback((status) => {
    if (status === 'error') showStatus('error', t('app.status.download.error'))
    else showStatus('success', t('app.status.download.success'))
  }, [showStatus, t])

  /* --- Szekció navigációs kattintás --- */
  const handleSectionClick = useCallback((sectionId) => {
    const el = document.getElementById(sectionId)
    if (el) {
      // Csak görgetünk, a highlight-ot rábízzuk az IntersectionObserver-re
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  /* --- Gördítés figyelése (aljára érés) --- */
  const handleMainScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop < 50) {
      setActiveSection(SECTIONS[0].id);
    } else if (Math.ceil(scrollTop + clientHeight) >= scrollHeight) {
      setActiveSection(SECTIONS[SECTIONS.length - 1].id);
    } else if (observerActiveRef.current) {
      setActiveSection(observerActiveRef.current);
    }
  }, []);

  /* --- Aktív szekció figyelése (IntersectionObserver) --- */
  const visibleSectionsRef = useRef(new Set())
  const observerActiveRef = useRef(null)

  useEffect(() => {

    const sectionIds = SECTIONS.map(s => s.id)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSectionsRef.current.add(entry.target.id)
          } else {
            visibleSectionsRef.current.delete(entry.target.id)
          }
        }
        
        const scrollContainer = document.querySelector('.scrollable-sections');
        if (scrollContainer && scrollContainer.scrollTop < 50) {
          observerActiveRef.current = sectionIds[0];
          setActiveSection(sectionIds[0]);
          return;
        }

        const firstVisible = sectionIds.find(id => visibleSectionsRef.current.has(id))
        if (firstVisible) {
          observerActiveRef.current = firstVisible;
          setActiveSection(firstVisible)
        }
      },
      { root: document.querySelector('.scrollable-sections'), rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )

    const timer = setTimeout(() => {
      sectionIds.forEach(id => {
        const el = document.getElementById(id)
        if (el) observer.observe(el)
      })
    }, 100)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    }
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-title">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {t('app.title')}
            </h1>
            <p>{t('app.subtitle')}</p>
          </div>
        </div>
        
        <div style={{
          marginLeft: 'auto',
          fontSize: '1rem',
          backgroundColor: 'var(--accent-subtle)',
          padding: '4px 12px',
          borderRadius: '12px',
          fontWeight: '600',
          letterSpacing: '0.5px',
          color: 'var(--accent)'
        }}>
          {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v202606301031'}
        </div>
      </header>

      <div className="app-layout">
        <aside className="nav-column">
          <SectionNav
            activeSection={activeSection}
            onSectionClick={handleSectionClick}
            
          />
        </aside>

        <main className="main-content">
          {status && (
            <div className={`status-${status.type}`}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', wordBreak: 'break-word', lineHeight: '1.4', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  {status.type === 'success' && <CheckCircle size={16} />}
                  {status.type === 'warning' && <AlertTriangle size={16} />}
                  {status.type === 'error' && <XCircle size={16} />}
                  <span>{status.message}</span>
                </div>
                {status.type === 'success' && (
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                    <Info size={12} />{t('app.status.success.sub')}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="scrollable-sections" onScroll={handleMainScroll}>
          <UserManual />
          <div id="presets"><PresetsSection config={config} setConfig={updateConfig} resetPresetRef={resetPresetRef} /></div>
          <div id="system-info"><SystemInfoSection config={config} setConfig={updateConfig} errors={errors} /></div>
          <div id="partitioning"><PartitionSection config={config} setConfig={updateConfig} errors={errors} /></div>
          <div id="bypasses"><BypassSection config={config} setConfig={updateConfig} /></div>
          <div id="wifi"><WifiSection config={config} setConfig={updateConfig} errors={errors} /></div>
          <div id="user-account"><UserAccountSection config={config} setConfig={updateConfig} errors={errors} /></div>
          <div id="personalization"><PersonalizationSection config={config} setConfig={updateConfig} /></div>
          <div id="privacy"><PrivacySection config={config} setConfig={updateConfig} /></div>
          <div id="performance"><PerformanceSection config={config} setConfig={updateConfig} /></div>
          <div id="bloatware"><BloatwareSection config={config} setConfig={updateConfig} /></div>
          <div id="custom-scripts"><CustomScriptsSection config={config} setConfig={updateConfig} errors={errors} /></div>
          </div>

          <div className="action-bar">
            <button className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={16} />{t('app.reset.btn')}</button>
            <button className="btn btn-primary" onClick={handleGenerate}>
              <Play size={16} fill="currentColor" />{t('app.generate.btn')}</button>
          </div>
        </main>

        <aside className="preview-column">
          <XmlPreview xml={xml} onCopy={handleCopy} onDownload={handleDownload} />
        </aside>
      </div>
    </div>
  )
}
