import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelect({ value, options, onChange, style, disabled, size }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  const sizeClass = size === 'small' ? 'small' : '';

  return (
    <div className="custom-select-container" ref={containerRef} style={style}>
      <button 
        type="button" 
        className={`custom-select-trigger ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${sizeClass}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{selectedOption ? selectedOption.label : ''}</span>
        <ChevronDown size={18} className={`custom-select-icon ${isOpen ? 'open' : ''}`} />
      </button>
      
      <div className={`custom-select-dropdown ${isOpen ? 'open' : ''}`}>
        {options.map(option => (
          <div 
            key={option.value}
            className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  );
}
