import { useLanguage } from '../i18n/LanguageContext';
import React, { useState, useId } from 'react'

/**
 * Fluent Design input mező
 * Támogatja: jelszó show/hide, suffix, hibaüzenet, max hossz
 */
export default function InputField({ 
  label, placeholder, value, onChange, type = 'text', 
  error, suffix, required, disabled, id, maxLength,
  onSuffixClick, suffixIcon, style, className
}) {
  const { t } = useLanguage();

  const [showPassword, setShowPassword] = useState(true)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  const fallbackId = useId();
  const effectiveId = id || fallbackId;
  const errorId = error ? `${effectiveId}-error` : undefined;

  return (
    <div className={`input-wrapper ${error ? 'input-wrapper--error' : ''} ${className || ''}`} style={style}>
      {label && (
        <label htmlFor={effectiveId} className="input-label">
          {label}
          {required && <span className="input-required"> *</span>}
        </label>
      )}
      <div className="input-container">
        <input
          id={effectiveId}
          type={inputType}
          className="input-field"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete="off"
          aria-invalid={!!error}
          aria-errormessage={errorId}
        />
        {suffix && (
          <span className="input-suffix">{suffix}</span>
        )}
        {suffixIcon && onSuffixClick && (
          <button type="button" className="input-suffix-btn" onClick={onSuffixClick} title={t('input.regenerate')}>
            {suffixIcon}
          </button>
        )}
        {isPassword && (
          <button 
            type="button" 
            className="input-suffix-btn" 
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? t('input.hidePassword') : t('input.showPassword')}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error && <p id={errorId} className="input-error">{error}</p>}
    </div>
  )
}
