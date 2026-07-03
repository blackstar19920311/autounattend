import React, { useId } from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Windows 11 stílusú checkbox komponens
 * Lekerekített sarkokkal és kék kijelöléssel
 */
export default function Checkbox({ label, checked, onChange, disabled = false, id, tooltip }) {
  const fallbackId = useId();
  const effectiveId = id || fallbackId;

  return (
    <label className={`checkbox ${disabled ? 'checkbox--disabled' : ''}`} htmlFor={effectiveId}>
      <input
        type="checkbox"
        id={effectiveId}
        checked={checked}
        onChange={e => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="checkbox-input"
      />
      <span className="checkbox-box">
        <svg className="checkbox-check" viewBox="0 0 12 10" fill="none">
          <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="checkbox-label">{label}</span>
        {tooltip && (
          <div className="tooltip-container" onClick={(e) => e.preventDefault()}>
            <HelpCircle size={16} className="tooltip-icon" />
            <div className="tooltip-text">{tooltip}</div>
          </div>
        )}
      </div>
    </label>
  )
}
