import React from 'react';

export default function AnimatedCollapse({ 
  show, 
  children, 
  marginTop = '0px', 
  marginBottom = '0px',
  transitionDuration = '0.4s',
  style = {},
  className = ''
}) {
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
      <div style={{ overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
