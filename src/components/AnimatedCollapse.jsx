import React, { useState, useEffect } from 'react';

export default function AnimatedCollapse({ 
  show, 
  children, 
  marginTop = '0px', 
  marginBottom = '0px',
  transitionDuration = '0.4s',
  style = {},
  className = ''
}) {
  const [overflow, setOverflow] = useState('hidden');

  useEffect(() => {
    let timeout;
    if (show) {
      // Wait for the open animation to finish, then allow overflow
      const durationMs = parseFloat(transitionDuration) * 1000 || 400;
      timeout = setTimeout(() => {
        setOverflow('visible');
      }, durationMs);
    } else {
      // Immediately hide overflow when collapsing starts
      setOverflow('hidden');
    }
    return () => clearTimeout(timeout);
  }, [show, transitionDuration]);

  return (
    <div 
      className={className}
      style={{
        display: 'grid',
        gridTemplateRows: show ? '1fr' : '0fr',
        transition: `all ${transitionDuration} linear`,
        opacity: show ? 1 : 0,
        marginTop: show ? marginTop : '0px',
        marginBottom: show ? marginBottom : '0px',
        ...style
      }}
    >
      <div style={{ overflow, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
