import React, { useId } from 'react';
import FluentHelpIcon from './FluentHelpIcon';

/**
 * Windows 11 stílusú kapcsoló (toggle/switch) komponens.
 * 
 * @param {string}   label       - A kapcsoló felirata
 * @param {string}   description - Opcionális leírás a felirat alatt
 * @param {boolean}  checked     - Bekapcsolt állapot
 * @param {function} onChange    - Állapotváltozás callback (új boolean értékkel)
 * @param {boolean}  disabled    - Letiltott állapot
 * @param {string}   id          - HTML id az akadálymentesítéshez
 * @param {string}   tooltip     - Opcionális lebegő súgó szöveg
 */
export default function Toggle({ label, description, checked, onChange, disabled = false, id, tooltip }) {
  const fallbackId = useId();
  const effectiveId = id || fallbackId;
  const descId = description ? `${effectiveId}-desc` : undefined;

  return (
    <div className={`toggle-wrapper ${disabled ? 'toggle--disabled' : ''}`}>
      <div className="toggle-text">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor={effectiveId} className="toggle-label">{label}</label>
          {tooltip && (
            <div className="tooltip-container">
              <FluentHelpIcon size={16} className="tooltip-icon" />
              <span className="tooltip-text">{tooltip}</span>
            </div>
          )}
        </div>
        {description && <p id={descId} className="toggle-description">{description}</p>}
      </div>
      <button
        id={effectiveId}
        role="switch"
        aria-checked={checked}
        aria-describedby={descId}
        className={`toggle ${checked ? 'toggle--active' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        type="button"
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  )
}
