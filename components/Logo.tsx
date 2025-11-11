import React from 'react';

type LogoProps = {
  className?: string;
};

export const Logo = ({ className }: LogoProps) => (
  <svg 
    viewBox="0 0 100 80" 
    className={className}
    aria-label="Logo Era Uma Vez!"
    role="img"
  >
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#fde047' }} /> {/* Yellow */}
        <stop offset="50%" style={{ stopColor: '#f472b6' }} /> {/* Pink */}
        <stop offset="100%" style={{ stopColor: '#a78bfa' }} /> {/* Violet */}
      </linearGradient>
    </defs>
    
    {/* Magic Swirl and Stars */}
    <g fill="url(#logo-gradient)">
      {/* Star 1 (big) */}
      <path d="M50 2 L54 18 L70 22 L54 26 L50 42 L46 26 L30 22 L46 18 Z" />
      {/* Star 2 (small) */}
      <path transform="translate(75, 5) scale(0.5)" d="M50 2 L54 18 L70 22 L54 26 L50 42 L46 26 L30 22 L46 18 Z" />
       {/* Star 3 (small) */}
      <path transform="translate(25, 15) scale(0.4)" d="M50 2 L54 18 L70 22 L54 26 L50 42 L46 26 L30 22 L46 18 Z" />
    </g>

    {/* Book */}
    <path 
      d="M50,78 C25,78 10,68 10,50 L10,30 C10,30 25,25 50,30 C75,25 90,30 90,30 L90,50 C90,68 75,78 50,78 Z M50,32 C30,35 15,40 15,50 C15,65 30,73 50,73 C70,73 85,65 85,50 C85,40 70,35 50,32 Z" 
      fill="rgba(30, 41, 59, 0.4)"
      stroke="rgba(203, 213, 225, 0.8)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Center line */}
    <line x1="50" y1="30" x2="50" y2="78" stroke="rgba(203, 213, 225, 0.8)" strokeWidth="3" strokeLinecap="round"/>

  </svg>
);