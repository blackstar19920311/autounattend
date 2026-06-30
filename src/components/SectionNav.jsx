import { useLanguage } from '../i18n/LanguageContext';
import React from 'react'
import { SECTIONS } from '../data/sections'

/**
 * Szekció navigáció - bal oldali menü asztali nézetben,
 * vízszintes scrollozható sáv mobilon
 */
const ICON_COLORS = {
  'presets': '#06b6d4',         // Cyan
  'system-info': '#3b82f6',     // Blue
  'partitioning': '#f59e0b',    // Amber
  'bypasses': '#ef4444',        // Red
  'wifi': '#10b981',            // Emerald
  'user-account': '#8b5cf6',    // Violet
  'personalization': '#ec4899', // Pink
  'privacy': '#6366f1',         // Indigo
  'performance': '#f97316',     // Orange
  'bloatware': '#14b8a6',       // Teal
  'custom-scripts': '#eab308'   // Yellow
};

/* Inline SVG zászlók */
function HungarianFlag() {
  return (
    <svg width="24" height="16" viewBox="0 0 24 16" style={{ borderRadius: '2px', boxShadow: '0 0 1px rgba(0,0,0,0.2)' }}>
      <rect width="24" height="5.33" fill="#CE2939" />
      <rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
      <rect y="10.66" width="24" height="5.34" fill="#477050" />
    </svg>
  );
}

function EnglishFlag() {
  return (
    <svg width="24" height="16" viewBox="0 0 60 30" style={{ borderRadius: '2px', boxShadow: '0 0 1px rgba(0,0,0,0.2)' }}>
      <clipPath id="t"><rect width="60" height="30"/></clipPath>
      <g clipPath="url(#t)">
        <rect width="60" height="30" fill="#012169"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#t)"/>
        <path d="M30,0V30M0,15H60" stroke="#fff" strokeWidth="10"/>
        <path d="M30,0V30M0,15H60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  );
}

export default function SectionNav({ activeSection, onSectionClick }) {
  const { t, language, setLanguage } = useLanguage();

  return (
    <nav className="section-nav">
      {/* Nyelválasztó */}
      <div className="lang-switcher">
        <button
          type="button"
          className={`lang-btn ${language === 'hu' ? 'lang-btn--active' : ''}`}
          onClick={() => setLanguage('hu')}
          title="Magyar"
          aria-label="Magyar nyelv"
        >
          <HungarianFlag />
        </button>
        <button
          type="button"
          className={`lang-btn ${language === 'en' ? 'lang-btn--active' : ''}`}
          onClick={() => setLanguage('en')}
          title="English"
          aria-label="English language"
        >
          <EnglishFlag />
        </button>
      </div>

      <div className="nav-label">{t('app.nav.sections')}</div>
      <ul className="section-nav-list">
        {SECTIONS.map(section => {
          const isActive = activeSection === section.id;
          
          return (
            <li key={section.id}>
              <button
                className={`section-nav-item ${isActive ? 'section-nav-item--active' : ''}`}
                onClick={() => onSectionClick(section.id)}
                type="button"
                aria-current={isActive ? 'true' : undefined}
              >
                <span 
                  className="section-nav-icon"
                  style={{
                    color: ICON_COLORS[section.id],
                    filter: isActive ? 'drop-shadow(0 0 4px rgba(255,255,255,0.1))' : 'none'
                  }}
                >
                  {section.icon}
                </span>
                <span className="section-nav-label">{t(section.labelKey)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      
    </nav>
  );
}
