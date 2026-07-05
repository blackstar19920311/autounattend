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
import React, { useRef, useState, useEffect } from 'react';

export default function SegmentedControl({ options, value, onChange, label }) {
  const containerRef = useRef(null);
  const [sliderStyle, setSliderStyle] = useState({ opacity: 0 });

  useEffect(() => {
    const updateSlider = () => {
      if (!containerRef.current) return;
      const activeIndex = options.findIndex(o => o.value === value);
      if (activeIndex === -1) return;

      const buttons = containerRef.current.querySelectorAll('.segmented-option');
      const activeEl = buttons[activeIndex];
      
      if (activeEl) {
        setSliderStyle({
          opacity: 1,
          left: `${activeEl.offsetLeft}px`,
          top: `${activeEl.offsetTop}px`,
          width: `${activeEl.offsetWidth}px`,
          height: `${activeEl.offsetHeight}px`,
        });
      }
    };

    updateSlider();
    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [value, options]);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % options.length;
      onChange(options[nextIndex].value);
      const buttons = containerRef.current.querySelectorAll('.segmented-option');
      if (buttons[nextIndex]) buttons[nextIndex].focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
      const buttons = containerRef.current.querySelectorAll('.segmented-option');
      if (buttons[prevIndex]) buttons[prevIndex].focus();
    }
  };

  return (
    <div className="segmented-wrapper">
      {label && <p className="segmented-label" aria-hidden="true">{label}</p>}
      <div className="segmented-control" role="radiogroup" aria-label={label} ref={containerRef}>
        <div className="segmented-slider" style={sliderStyle} aria-hidden="true" />
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
