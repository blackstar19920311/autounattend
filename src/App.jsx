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
import { validateConfig } from './utils/validation'
import { SECTIONS } from './data/sections'
import { getDefaultConfig } from './data/defaultConfig'

export default function App() {
  const { t, language } = useLanguage();
  const [config, setConfig] = useState(() => ({ ...getDefaultConfig(), installLanguage: language }));
  const [xml, setXml] = useState('');
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState(null)
  const [activeSection, setActiveSection] = useState('presets')
  const resetPresetRef = useRef(null)
  const statusTimeoutRef = useRef(null)
  const visibleSectionsRef = useRef(new Set())
  const observerActiveRef = useRef(null)

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
      setXml(generateXml(config, config.installLanguage || language))
      setErrors({})
      showStatus('success', t('app.status.success'))
    } catch (err) {
      console.error('XML generation error:', err)
      showStatus('error', t('app.status.error.generation'))
    }
  }, [config, showStatus, t, language])
  const handleReset = useCallback(() => {
    setConfig({ ...getDefaultConfig(), installLanguage: language })
    setXml(''); setErrors({}); setActiveSection('presets')
    const mainEl = document.querySelector('.scrollable-sections')
    if (mainEl) mainEl.scrollTop = 0
    if (resetPresetRef.current) resetPresetRef.current()
    showStatus('warning', t('app.status.warning.reset'))
  }, [showStatus, t, language])
  const handleCopy = useCallback((s) => showStatus(s === 'error' ? 'error' : 'success', t(s === 'error' ? 'app.status.copy.error' : 'app.status.copy.success')), [showStatus, t])
  const handleDownload = useCallback((s) => showStatus(s === 'error' ? 'error' : 'success', t(s === 'error' ? 'app.status.download.error' : 'app.status.download.success')), [showStatus, t])
  const handleSectionClick = useCallback((sectionId) => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), [])
  const handleMainScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const presetsEl = document.getElementById('presets')
    if (presetsEl && scrollTop <= presetsEl.offsetTop + 10) return setActiveSection('presets')
    if (Math.ceil(scrollTop + clientHeight) >= scrollHeight) return setActiveSection(SECTIONS[SECTIONS.length - 1].id)
    if (observerActiveRef.current) setActiveSection(observerActiveRef.current)
  }, [])
  useEffect(() => {
    const sectionIds = SECTIONS.map(s => s.id)
    const root = document.querySelector('.scrollable-sections')
    if (!root) return undefined
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => entry.isIntersecting ? visibleSectionsRef.current.add(entry.target.id) : visibleSectionsRef.current.delete(entry.target.id))
      const first = sectionIds.find(id => visibleSectionsRef.current.has(id))
      if (first) { observerActiveRef.current = first; setActiveSection(first) }
    }, { root, rootMargin: '-20% 0px -60% 0px', threshold: 0 })
    sectionIds.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el) })
    return () => { observer.disconnect(); if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current) }
  }, [])
  return <div className="app-container">
    <header className="app-header"><div className="app-header-title"><div><h1>{t('app.title')}</h1><p>{t('app.subtitle')}</p></div></div><div className="app-version">{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}</div></header>
    <div className="app-layout"><aside className="nav-column"><SectionNav activeSection={activeSection} onSectionClick={handleSectionClick} /></aside>
      <main className="main-content">{status && <div className={`status-${status.type}`}><div className="status-content"><div>{status.type === 'success' && <CheckCircle size={16} />}{status.type === 'warning' && <AlertTriangle size={16} />}{status.type === 'error' && <XCircle size={16} />}<span>{status.message}</span></div>{status.type === 'success' && <div className="status-sub"><Info size={12} />{t('app.status.success.sub')}</div>}</div></div>}
        <div className="scrollable-sections" onScroll={handleMainScroll}><ThemeLanguageSwitcher className="mobile-switcher" /><UserManual /><div id="presets"><PresetsSection config={config} setConfig={updateConfig} resetPresetRef={resetPresetRef} /></div><div id="system-info"><SystemInfoSection config={config} setConfig={updateConfig} errors={errors} /></div><div id="partitioning"><PartitionSection config={config} setConfig={updateConfig} errors={errors} /></div><div id="bypasses"><BypassSection config={config} setConfig={updateConfig} /></div><div id="wifi"><WifiSection config={config} setConfig={updateConfig} errors={errors} /></div><div id="user-account"><UserAccountSection config={config} setConfig={updateConfig} errors={errors} /></div><div id="personalization"><PersonalizationSection config={config} setConfig={updateConfig} /></div><div id="privacy"><PrivacySection config={config} setConfig={updateConfig} /></div><div id="performance"><PerformanceSection config={config} setConfig={updateConfig} /></div><div id="bloatware"><BloatwareSection config={config} setConfig={updateConfig} /></div><div id="custom-scripts"><CustomScriptsSection config={config} setConfig={updateConfig} errors={errors} /></div></div>
        <div className="action-bar"><button className="btn btn-secondary" onClick={handleReset}><RotateCcw size={16} />{t('app.reset.btn')}</button><button className="btn btn-primary" onClick={handleGenerate}><Play size={16} fill="currentColor" />{t('app.generate.btn')}</button></div>
      </main><aside className="preview-column"><XmlPreview xml={xml} onCopy={handleCopy} onDownload={handleDownload} /></aside></div></div>
}
