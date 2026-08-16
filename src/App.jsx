import { useLanguage } from './i18n/LanguageContext';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Play, RotateCcw, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import SystemInfoSection from './sections/SystemInfoSection';
import PresetsSection from './sections/PresetsSection';
import BypassSection from './sections/BypassSection';
import PartitionSection from './sections/PartitionSection';
import UserAccountSection from './sections/UserAccountSection';
import PersonalizationSection from './sections/PersonalizationSection';
import PrivacySection from './sections/PrivacySection';
import PerformanceSection from './sections/PerformanceSection';
import BloatwareSection from './sections/BloatwareSection';
import WifiSection from './sections/WifiSection';
import CustomScriptsSection from './sections/CustomScriptsSection';
import SectionNav from './components/SectionNav';
import XmlPreview from './components/XmlPreview';
import UserManual from './components/UserManual';
import ThemeLanguageSwitcher from './components/ThemeLanguageSwitcher';
import { generateXml } from './utils/generateXml';
import { applyGeneratorGuards } from './utils/generatorGuards';
import { validateConfig } from './utils/validation';
import { SECTIONS } from './data/sections';
import { getDefaultConfig } from './data/defaultConfig';

const STORAGE_KEY = 'autounattend.config.v2';
function secretFreeConfig(config) {
  const safe = structuredClone(config);
  safe.password = '';
  if (safe.wifi) safe.wifi.password = '';
  if (safe.customScripts) { safe.customScripts.domainPass = ''; safe.customScripts.officeKey = ''; }
  return safe;
}
function loadConfig(language) {
  const defaults = getDefaultConfig();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved && typeof saved === 'object' ? { ...defaults, ...saved, installLanguage: saved.installLanguage || language, partitioning: { ...defaults.partitioning, ...saved.partitioning }, wifi: { ...defaults.wifi, ...saved.wifi }, customScripts: { ...defaults.customScripts, ...saved.customScripts } } : { ...defaults, installLanguage: language };
  } catch { return { ...defaults, installLanguage: language }; }
}

export default function App() {
  const { t, language } = useLanguage();
  const [config, setConfig] = useState(() => loadConfig(language));
  const [xml, setXml] = useState(''); const [errors, setErrors] = useState({}); const [status, setStatus] = useState(null); const [activeSection, setActiveSection] = useState('presets');
  const resetPresetRef = useRef(null); const statusTimeoutRef = useRef(null); const visibleSectionsRef = useRef(new Set()); const observerActiveRef = useRef(null);
  const updateConfig = useCallback((updates) => setConfig(prev => typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }), []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(secretFreeConfig(config))); } catch {} }, [config]);
  const showStatus = useCallback((type, message, duration = 5000) => { if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current); setStatus({ type, message }); statusTimeoutRef.current = setTimeout(() => setStatus(null), duration); }, []);
  const handleGenerate = useCallback(() => {
    const validation = validateConfig(config, t);
    if (!validation.isValid) { setErrors(validation.errors); const first = Object.keys(validation.errors)[0]; showStatus('error', validation.errors[first] || t('app.status.error.validation')); document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    try { setXml(applyGeneratorGuards(generateXml(config), config)); setErrors({}); showStatus('success', t('app.status.success')); }
    catch (err) { console.error('XML generation error:', err); showStatus('error', err?.message || t('app.status.error.generation')); }
  }, [config, showStatus, t]);
  const handleReset = useCallback(() => { const next = { ...getDefaultConfig(), installLanguage: language }; setConfig(next); try { localStorage.removeItem(STORAGE_KEY); } catch {} setXml(''); setErrors({}); setActiveSection('presets'); document.querySelector('.scrollable-sections')?.scrollTo({ top: 0 }); resetPresetRef.current?.(); showStatus('warning', t('app.status.warning.reset')); }, [showStatus, t, language]);
  const handleCopy = useCallback((s) => showStatus(s === 'error' ? 'error' : 'success', t(s === 'error' ? 'app.status.copy.error' : 'app.status.copy.success')), [showStatus, t]);
  const handleDownload = useCallback((s) => showStatus(s === 'error' ? 'error' : 'success', t(s === 'error' ? 'app.status.download.error' : 'app.status.download.success')), [showStatus, t]);
  const handleSectionClick = useCallback((id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), []);
  const handleMainScroll = useCallback((e) => { const { scrollTop, scrollHeight, clientHeight } = e.currentTarget; const p = document.getElementById('presets'); if (p && scrollTop <= p.offsetTop + 10) return setActiveSection('presets'); if (Math.ceil(scrollTop + clientHeight) >= scrollHeight) return setActiveSection(SECTIONS[SECTIONS.length - 1].id); if (observerActiveRef.current) setActiveSection(observerActiveRef.current); }, []);
  useEffect(() => { const root = document.querySelector('.scrollable-sections'); if (!root) return; const ids = SECTIONS.map(s => s.id); const observer = new IntersectionObserver(entries => { entries.forEach(e => e.isIntersecting ? visibleSectionsRef.current.add(e.target.id) : visibleSectionsRef.current.delete(e.target.id)); const first = ids.find(id => visibleSectionsRef.current.has(id)); if (first) { observerActiveRef.current = first; setActiveSection(first); } }, { root, rootMargin: '-20% 0px -60% 0px', threshold: 0 }); ids.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); }); return () => { observer.disconnect(); if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current); }; }, []);
  return <div className="app-container"><header className="app-header"><div className="app-header-title"><div><h1>{t('app.title')}</h1><p>{t('app.subtitle')}</p></div></div><div className="app-version">{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'}</div></header><div className="app-layout"><aside className="nav-column"><SectionNav activeSection={activeSection} onSectionClick={handleSectionClick} /></aside><main className="main-content">{status && <div className={`status-${status.type}`}><div className="status-content"><div>{status.type === 'success' && <CheckCircle size={16} />}{status.type === 'warning' && <AlertTriangle size={16} />}{status.type === 'error' && <XCircle size={16} />}<span>{status.message}</span></div>{status.type === 'success' && <div className="status-sub"><Info size={12} />{t('app.status.success.sub')}</div>}</div></div>}<div className="scrollable-sections" onScroll={handleMainScroll}><ThemeLanguageSwitcher className="mobile-switcher" /><UserManual /><div id="presets"><PresetsSection config={config} setConfig={updateConfig} resetPresetRef={resetPresetRef} /></div><div id="system-info"><SystemInfoSection config={config} setConfig={updateConfig} errors={errors} /></div><div id="partitioning"><PartitionSection config={config} setConfig={updateConfig} errors={errors} /></div><div id="bypasses"><BypassSection config={config} setConfig={updateConfig} /></div><div id="wifi"><WifiSection config={config} setConfig={updateConfig} errors={errors} /></div><div id="user-account"><UserAccountSection config={config} setConfig={updateConfig} errors={errors} /></div><div id="personalization"><PersonalizationSection config={config} setConfig={updateConfig} /></div><div id="privacy"><PrivacySection config={config} setConfig={updateConfig} /></div><div id="performance"><PerformanceSection config={config} setConfig={updateConfig} /></div><div id="bloatware"><BloatwareSection config={config} setConfig={updateConfig} /></div><div id="custom-scripts"><CustomScriptsSection config={config} setConfig={updateConfig} errors={errors} /></div></div><div className="action-bar"><button className="btn btn-secondary" onClick={handleReset}><RotateCcw size={16} />{t('app.reset.btn')}</button><button className="btn btn-primary" onClick={handleGenerate}><Play size={16} fill="currentColor" />{t('app.generate.btn')}</button></div></main><aside className="preview-column"><XmlPreview xml={xml} onCopy={handleCopy} onDownload={handleDownload} /></aside></div></div>;
}
