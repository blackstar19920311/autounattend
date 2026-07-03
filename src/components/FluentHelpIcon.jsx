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
      
      {/* Question Mark (Centered at 12,12 and scaled up) */}
      <g transform="translate(12, 12) scale(1.15) translate(-10, -10)">
        <path 
          d="M10.011 5.721c-1.393 0-2.484.97-2.484 2.128 0 .487.382.903.882.903.497 0 .894-.413.894-.9 0-.585.503-1.045 1.189-1.045.719 0 1.25.434 1.25 1.05 0 .611-.531.86-1.12 1.341-.572.464-1.223 1.125-1.223 2.186 0 .463.38.865.862.865.485 0 .878-.396.878-.857 0-.573.551-.89 1.166-1.383.67-.542 1.558-1.26 1.558-2.52 0-1.637-1.464-2.768-3.048-2.768zm-.122 7.026a1.272 1.272 0 100 2.544 1.272 1.272 0 000-2.544z" 
          fill="#2563EB" 
        />
      </g>
    </svg>
 );
}
