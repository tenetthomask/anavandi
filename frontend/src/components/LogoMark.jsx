import React from 'react';

export default function LogoMark({ size = 40, color = "currentColor", className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M175.5 32H336.5L480 175.5V336.5L336.5 480H175.5L32 336.5V175.5L175.5 32ZM185.5 64L64 185.5V326.5L185.5 448H326.5L448 326.5V185.5L326.5 64H185.5ZM160 175.5L256 271.5L352 175.5H288L256 207.5L224 175.5H160ZM352 336.5L256 240.5L160 336.5H224L256 304.5L288 336.5H352Z" 
        fill={color} 
      />
    </svg>
  );
}
