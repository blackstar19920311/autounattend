import React from 'react';

export default function FluentHelpIcon({ size = 20, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Light Blue Chat Bubble (Left-pointing tail) */}
      <path 
        d="M12 2C6.48 2 2 6.48 2 12C2 13.8 2.5 15.5 3.37 16.92L2.17 21.1C2 21.6 2.4 22 2.9 21.83L7.08 20.63C8.5 21.5 10.2 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" 
        fill="#93C5FD"
      />
      
      {/* Question Mark (System Font for perfect shape) */}
      <text 
        x="12" 
        y="12" 
        dy="0.35em"
        fontSize="15" 
        fontWeight="bold" 
        fontFamily="Segoe UI, system-ui, sans-serif" 
        fill="#2563EB" 
        textAnchor="middle"
      >
        ?
      </text>
    </svg>
 );
}
