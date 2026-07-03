import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { BookOpen, ChevronDown } from 'lucide-react';

export default function UserManual() {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="user-manual-card" style={{ marginBottom: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '16px', 
          fontWeight: 'bold', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '1.05rem', 
          backgroundColor: 'var(--accent-subtle)', 
          color: 'var(--accent)', 
          transition: 'background-color 0.2s ease, border-bottom 0.2s ease',
          borderBottom: isOpen ? '1px solid var(--border-color)' : '1px solid transparent'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-light)'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'}
      >
        <BookOpen size={20} />
        <span style={{ flex: 1 }}>{t('manual.title')}</span>
        <ChevronDown size={20} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateRows: isOpen ? '1fr' : '0fr', 
        transition: 'grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
      }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px', lineHeight: '1.6', fontSize: '0.95rem', backgroundColor: 'var(--bg-card)' }}>
            
            {language === 'hu' ? (
              <>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>Hogyan használd az Autounattend Generátort?</h3>
                <ol style={{ paddingLeft: '24px', margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-primary)' }}>
                  <li>
                    <strong>Állítsd be a paramétereket:</strong> Használd az <em>Előre elkészített profilokat (Presets)</em> a gyors kezdéshez, vagy menj végig az űrlap szekcióin manuálisan és szabd testre az igényeid szerint.
                  </li>
                  <li>
                    <strong>Generáld le az XML-t:</strong> Kattints az oldal alján található <strong>XML Generálása</strong> gombra. A kész konfigurációs kód meg fog jelenni a jobb oldali panelen.
                  </li>
                  <li>
                    <strong>Töltsd le a fájlt:</strong> Kattints a <strong>Letöltés</strong> gombra a jobb oldali panel fejlécében. Fontos: A fájl neve szigorúan <code>autounattend.xml</code> kell, hogy legyen!
                  </li>
                  <li>
                    <strong>Másold a pendrive-ra:</strong> Helyezd a letöltött <code>autounattend.xml</code> fájlt a megírt Windows telepítő pendrive <strong>gyökérkönyvtárába</strong> (pontosan oda, ahol a <code>setup.exe</code> is található).
                  </li>
                  <li>
                    <strong>Telepítsd a Windowst:</strong> Indítsd el a számítógépet a pendrive-ról. A Windows telepítője automatikusan felismeri a fájlt, és a megadott beállítások alapján, emberi beavatkozás (Next-Next gombok nyomkodása) nélkül telepíti a rendszert és a kiválasztott alkalmazásokat.
                  </li>
                </ol>
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', borderLeft: '4px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
                  <strong>💡 Fontos tudnivalók:</strong>
                  <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>A telepítés során a gép többször is újraindulhat magától. Ez normális.</li>
                    <li>Az egyéni szkriptek (pl. alkalmazások letöltése, takarítás) az <strong>első felhasználói bejelentkezéskor</strong> fognak lefutni egy fekete parancssor ablakban. Kérlek, <strong>ne zárd be</strong> ezt az ablakot, várd meg amíg magától befejezi a munkát és eltűnik! Minden egyes szkript lefutása után egy felugró ablak (PowerShell popup) tájékoztat majd arról, hogy az adott telepítés sikeres vagy sikertelen volt.</li>
                  </ul>
                </div>
                <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'rgba(255, 69, 58, 0.1)', borderRadius: '8px', borderLeft: '4px solid #ff453a', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
                  <strong>⚠️ Kiemelten fontos:</strong>
                  <p style={{ margin: 0 }}>
                    Kérjük, <strong>várja meg az összes szkript lefutását és a felugró üzeneteket</strong>, mielőtt használni kezdené a gépet vagy újraindítaná azt! Ellenkező esetben a háttérben futó folyamatok megszakadhatnak, és a telepítés nem lesz teljes.
                  </p>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>How to use the Autounattend Generator?</h3>
                <ol style={{ paddingLeft: '24px', margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-primary)' }}>
                  <li>
                    <strong>Set your parameters:</strong> Use the <em>Pre-made Profiles (Presets)</em> for a quick start, or go through the form sections manually to customize your settings.
                  </li>
                  <li>
                    <strong>Generate the XML:</strong> Click the <strong>Generate XML</strong> button at the bottom of the page. The completed configuration code will appear in the right panel.
                  </li>
                  <li>
                    <strong>Download the file:</strong> Click the <strong>Download</strong> button in the right panel's header. Important: The file name must strictly be <code>autounattend.xml</code>!
                  </li>
                  <li>
                    <strong>Copy to USB:</strong> Place the downloaded <code>autounattend.xml</code> file into the <strong>root directory</strong> of your bootable Windows installation USB drive (exactly where <code>setup.exe</code> is located).
                  </li>
                  <li>
                    <strong>Install Windows:</strong> Boot the computer from the USB drive. The Windows installer will automatically detect the file and install the OS and selected apps based on your settings, without requiring any human interaction.
                  </li>
                </ol>
                <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', borderLeft: '4px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
                  <strong>💡 Important Notes:</strong>
                  <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>The computer may restart several times during the installation. This is normal.</li>
                    <li>Custom scripts (e.g., app downloads, cleanup) will run in a black command prompt window upon the <strong>first user login</strong>. Please <strong>do not close</strong> this window; wait until it finishes its tasks and closes automatically! After each script runs, a popup message (PowerShell popup) will appear informing you whether the installation was successful or unsuccessful.</li>
                  </ul>
                </div>
                <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: 'rgba(255, 69, 58, 0.1)', borderRadius: '8px', borderLeft: '4px solid #ff453a', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
                  <strong>⚠️ Extremely Important:</strong>
                  <p style={{ margin: 0 }}>
                    Please <strong>wait for all scripts to finish and all popup messages to appear</strong> before starting to use the computer or restarting it! Otherwise, the background processes may be interrupted and the installation will be incomplete.
                  </p>
                </div>
              </>
            )}
            
          </div>
        </div>
      </div>
      
    </div>
  );
}
