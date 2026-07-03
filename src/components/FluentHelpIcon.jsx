import React from 'react';

export default function FluentHelpIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g fill="#2563EB">
        <circle cx="8.5" cy="8.5" r="7.5" />
        <path d="M 5 14.5 L 1.2 16.8 C 0.8 17.0 0.5 16.3 0.8 16.0 L 2.8 12.5 Z" />
      </g>
      <g fill="#93C5FD">
        <circle cx="15.5" cy="15.5" r="8.5" />
        <path d="M 20.5 22 L 23.5 23.5 C 23.9 23.7 24.1 23.1 23.8 22.8 L 22.2 19.8 Z" />
      </g>
      {/* Question Mark */}
      <path 
        d="M13.5 13C13.5 11.5 14.5 11 15.5 11C16.5 11 17.5 11.5 17.5 13C17.5 14.5 15.5 15 15.5 16" 
        stroke="#2563EB" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <circle cx="15.5" cy="18.5" r="1.4" fill="#2563EB" />
    </svg>
 );
}
