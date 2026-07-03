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
      <path d="M15.5 10.5C14.1193 10.5 13 11.6193 13 13H14.5C14.5 12.4477 14.9477 12 15.5 12C16.0523 12 16.5 12.4477 16.5 13C16.5 13.5 16 13.75 15.5 14.25V15.5H17V14.5C17 14 18 13.75 18 12.5C18 11.1193 16.8807 10.5 15.5 10.5ZM15.5 18C15.9142 18 16.25 17.6642 16.25 17.25C16.25 16.8358 15.9142 16.5 15.5 16.5C15.0858 16.5 14.75 16.8358 14.75 17.25C14.75 17.6642 15.0858 18 15.5 18Z" fill="#2563EB" />
    </svg>
 );
}
