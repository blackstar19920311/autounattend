import { useLanguage } from './i18n/LanguageContext';
import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Play, RotateCcw, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

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

import SectionNav from './components/SectionNav'
import XmlPreview from './components/XmlPreview'
import UserManual from './components/UserManual'
import ThemeLanguageSwitcher from './components/ThemeLanguageSwitcher'

import { generateXml } from './utils/generateXml'
import { injectStartMenuDiagnostics } from './utils/injectStartMenuDiagnostics'
import { validateConfig } from './utils/validation'
import { SECTIONS } from './data/sections'
import { getDefaultConfig } from './data/defaultConfig'

export default function App() {
  const { t, language } = useLanguage();
  const [config, setConfig] = useState(() => {
    const def = getDefaultConfig();
    def.installLanguage = language;
    return def;
  });

  useEffect(() => {
    setConfig(prev => ({ ...prev, installLanguage: language }));
  }, [language]);

  const [xml, setXml] = useState('');
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [activeSection, setActiveSection] = useState('presets')
  const resetPresetRef = useRef(null)
  const statusTimeoutRef = useRef(null)

  const updateConfig = useCallback((updates) => {
    setConfig(prev => typeof updates === 'function' ? updates(prev) : { ...prev, ...updates })
  }, [])

  const showStatus = useCallback((type, message, duration = 5000) => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    setStatus({ type, message })
    statusTimeoutRef.current = setTimeout(() => setStatus(null), duration)
  }, [])

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
      const generatedXml = injectStartMenuDiagnostics(generateXml(config, language))
      setXml(generatedXml)
      setErrors({})
      showStatus('success', t('app.status.success'))
    } catch (err) {
      console.error('XML generálási hiba:', err)
      showStatus('error', t('app.status.error.generation'))
    }
  }, [config, showStatus, t, language])

  const handleReset = useCallback(() => {
    setConfig({ ...getDefaultConfig(), installLanguage: language })
    setXml('')
    setErrors({})
    setActiveSection('presets')
    const mainEl = document.querySelector('.main-content')
    if (mainEl) mainEl.scrollTop = 0
    if (resetPresetRef.current) resetPresetRef.current()
    showStatus('warning', t('app.status.warning.reset'))
  }, [showStatus, t, language])

  const handleCopy = useCallback((status) => {
    showStatus(status === 'error' ? 'error' : 'success', status === 'error' ? t('app.status.copy.error') : t('app.status.copy.success'))
  }, [showStatus, t])

  const handleDownload = useCallback((status) => {
    showStatus(status === 'error' ? 'error' : 'success', status === 'error' ? t('app.status.download.error') : t('app.status.download.success'))
  }, [showStatus, t])

  const handleSectionClick = useCallback((sectionId) => {
    const el = document.getElementById(sectionId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const visibleSectionsRef = useRef(new Set())
  const observerActiveRef = useRef(null)
  const handleMainScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const presetsEl = document.getElementById('presets');
    if (presetsEl && scrollTop <= presetsEl.offsetTop + 10) return setActiveSection('presets');
    if (Math.ceil(scrollTop + clientHeight) >= scrollHeight) setActiveSection(SECTIONS[SECTIONS.length - 1].id)
    else if (observerActiveRef.current) setActiveSection(observerActiveRef.current)
  }, []);

  useEffect(() => {
    const sectionIds = SECTIONS.map(s => s.id)
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleSectionsRef.current.add(entry.target.id)
        else visibleSectionsRef.current.delete(entry.target.id)
      }
      const scrollContainer = document.querySelector('.scrollable-sections');
      const presetsEl = document.getElementById('presets');
      if (scrollContainer && presetsEl && scrollContainer.scrollTop <= presetsEl.offsetTop + 10) {
        observerActiveRef.current = 'presets';
        setActiveSection('presets');
        return;
      }
      const firstVisible = sectionIds.find(id => visibleSectionsRef.current.has(id))
      if (firstVisible) {
        observerActiveRef.current = firstVisible;
        setActiveSection(firstVisible)
      }
    }, { root: document.querySelector('.scrollable-sections'), rootMargin: '-20% 0px -60% 0px', threshold: 0 })
    const timer = setTimeout(() => sectionIds.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }), 100)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    }
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-header-title"><div><h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>{t('app.title')}</h1><p>{t('app.subtitle')}</p></div></div>
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: '15px' }}><div style={{ fontSize: '1rem', backgroundColor: 'var(--accent-subtle)', padding: '4px 12px', borderRadius: '12px', fontWeight: '600', letterSpacing: '0.5px', color: 'var(--accent)' }}>{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v20260630-1031'}</div></div>
      </header>
      <div className="app-layout">
        <aside className="nav-column"><SectionNav activeSection={activeSection} onSectionClick={handleSectionClick} /></aside>
        <main className="main-content">
          {status && <div className={`status-${status.type}`}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', wordBreak: 'break-word', lineHeight: '1.4', textAlign: 'center' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>{status.type === 'success' && <CheckCircle size={16} />}{status.type === 'warning' && <AlertTriangle size={16} />}{status.type === 'error' && <XCircle size={16} />}<span>{status.message}</span></div>{status.type === 'success' && <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><Info size={12} />{t('app.status.success.sub')}</div>}</div></div>}
          <div className="scrollable-sections" onScroll={handleMainScroll}>
            <ThemeLanguageSwitcher className="mobile-switcher" /><UserManual />
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
          <div className="action-bar"><button className="btn btn-secondary" onClick={handleReset}><RotateCcw size={16} />{t('app.reset.btn')}</button><button className="btn btn-primary" onClick={handleGenerate}><Play size={16} fill="currentColor" />{t('app.generate.btn')}</button></div>
        </main>
        <aside className="preview-column"><XmlPreview xml={xml} onCopy={handleCopy} onDownload={handleDownload} /></aside>
      </div>
    </div>
  )
}
