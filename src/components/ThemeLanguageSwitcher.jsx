import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { Moon, Sun } from 'lucide-react';

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

export default function ThemeLanguageSwitcher({ className = '' }) {
  const { language, setLanguage } = useLanguage();
  
  const [isDark, setIsDark] = useState(() => {
    try {
      const theme = localStorage.getItem('theme');
      if (theme) return theme === 'dark';
    } catch (e) {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('theme', 'dark'); } catch (e) {}
    } else {
      root.removeAttribute('data-theme');
      try { localStorage.setItem('theme', 'light'); } catch (e) {}
    }
    
    const handleThemeChange = (e) => {
        if (e.detail && e.detail.isDark !== undefined) {
            setIsDark(e.detail.isDark);
        }
    };
    window.addEventListener('theme-sync', handleThemeChange);
    return () => window.removeEventListener('theme-sync', handleThemeChange);
  }, [isDark]);

  const toggleTheme = (event) => {
    const newTheme = !isDark;
    const isAppearanceTransition = document.startViewTransition
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isAppearanceTransition) {
      setIsDark(newTheme);
      window.dispatchEvent(new CustomEvent('theme-sync', { detail: { isDark: newTheme } }));
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setIsDark(newTheme);
      window.dispatchEvent(new CustomEvent('theme-sync', { detail: { isDark: newTheme } }));
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];
      
      document.documentElement.animate(
        { clipPath: clipPath },
        {
          duration: 500,
          easing: 'ease-out',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    });
  };

  return (
    <div className={`theme-switch-container ${className}`}>
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

      <div className="theme-switch-wrapper">
        <button 
          type="button" 
          className="theme-switch" 
          onClick={toggleTheme}
          aria-label={isDark ? "Világos téma" : "Sötét téma"}
          title={isDark ? "Világos téma bekapcsolása" : "Sötét téma bekapcsolása"}
        >
          <span className="theme-switch-icon" style={{ visibility: isDark ? 'hidden' : 'visible' }}>
            <Moon size={14} strokeWidth={2.5} />
          </span>
          <span className="theme-switch-icon" style={{ visibility: isDark ? 'visible' : 'hidden' }}>
            <Sun size={14} strokeWidth={2.5} />
          </span>
          <div className="theme-switch-thumb">
            <span className="theme-switch-thumb-icon">
              {isDark ? <Moon size={14} strokeWidth={2.5} /> : <Sun size={14} strokeWidth={2.5} />}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
