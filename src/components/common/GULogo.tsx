import React from 'react';

interface GULogoProps {
  className?: string;
  size?: number;
}

export const GULogo: React.FC<GULogoProps> = ({ className = "w-10 h-10", size }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="guShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.35" />
        </filter>
        <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF2E2E" />
          <stop offset="100%" stopColor="#C80000" />
        </linearGradient>
        <linearGradient id="blackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2A2D32" />
          <stop offset="100%" stopColor="#0B0C0E" />
        </linearGradient>
      </defs>

      <g filter="url(#guShadow)">
        {/* Outer Red Arc (Top Left) */}
        <path
          d="M 140,25 A 75,75 0 1,0 45,160"
          stroke="url(#redGrad)"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />

        {/* Outer Black Arc (Bottom Right) */}
        <path
          d="M 155,40 A 75,75 0 0,1 60,175"
          stroke="url(#blackGrad)"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />

        {/* Stylized 'G' - Red */}
        <path
          d="M 115,62 C 85,55 52,72 48,102 C 44,132 70,152 100,140 C 112,135 116,122 116,108 L 88,108 L 88,90 L 132,90 C 134,115 125,148 95,158 C 55,170 28,138 32,98 C 36,58 80,38 122,46 Z"
          fill="url(#redGrad)"
        />

        {/* Stylized 'U' - Black */}
        <path
          d="M 100,90 L 118,90 L 118,125 C 118,140 128,148 142,148 C 156,148 166,140 166,125 L 166,90 L 184,90 L 184,126 C 184,152 165,166 142,166 C 118,166 100,152 100,126 Z"
          fill="url(#blackGrad)"
        />
      </g>
    </svg>
  );
};
