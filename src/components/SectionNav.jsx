import { useLanguage } from '../i18n/LanguageContext';
import React, { useState, useEffect } from 'react';
import { SECTIONS } from '../data/sections';
import { Moon, Sun } from 'lucide-react';

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

import ThemeLanguageSwitcher from './ThemeLanguageSwitcher';

export default function SectionNav({ activeSection, onSectionClick }) {
  const { t } = useLanguage();

  return (
    <nav className="section-nav">
      {/* Felső sáv: Nyelválasztó és Téma kapcsoló (csak asztalon, mert mobilon a section-nav el van rejtve) */}
      <ThemeLanguageSwitcher className="desktop-switcher" />

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
