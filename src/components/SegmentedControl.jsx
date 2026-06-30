/**
 * Szegmentált vezérlő (Segmented Control) komponens.
 * Windows 11 stílusú „pill" választó — a kiválasztott elem
 * fehér hátteret és árnyékot kap egy szürke sávon belül.
 * 
 * @param {Array}    options  - Választási lehetőségek: [{ label, value }, ...]
 * @param {*}        value    - Aktuálisan kiválasztott érték
 * @param {function} onChange - Értékváltozás callback (új értékkel)
 * @param {string}   label    - Opcionális címke a vezérlő felett
 */
import React, { useRef } from 'react';

export default function SegmentedControl({ options, value, onChange, label }) {
  const containerRef = useRef(null);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      onChange(options[nextIndex].value);
      const nextButton = containerRef.current.children[nextIndex];
      if (nextButton) nextButton.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
      const prevButton = containerRef.current.children[prevIndex];
      if (prevButton) prevButton.focus();
    }
  };
  return (
    <div className="segmented-wrapper">
      {label && <p className="segmented-label" aria-hidden="true">{label}</p>}
      <div className="segmented-control" role="radiogroup" aria-label={label} ref={containerRef}>
        {options.map((option, index) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={`segmented-option ${isSelected ? 'segmented-option--active' : ''}`}
              onClick={() => onChange(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  )
}
