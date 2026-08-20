import React from 'react';

interface GULogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const GULogo: React.FC<GULogoProps> = ({ 
  className = "w-10 h-10", 
  size,
  showText = false 
}) => {
  return (
    <div 
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox="0 0 240 240"
        className="w-full h-full drop-shadow-md overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Deep 3D Outer Drop Shadow */}
          <filter id="guRealistic3DShadow" x="-20%" y="-20%" width="145%" height="145%">
            <feDropShadow dx="3" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.55" />
            <feDropShadow dx="-1" dy="-1" stdDeviation="3" floodColor="#ffffff" floodOpacity="0.15" />
          </filter>

          {/* Red 3D Beveled Gradient */}
          <linearGradient id="guRed3D" x1="15%" y1="15%" x2="85%" y2="85%">
            <stop offset="0%" stopColor="#FF4A4A" />
            <stop offset="30%" stopColor="#E60000" />
            <stop offset="75%" stopColor="#C40000" />
            <stop offset="100%" stopColor="#8A0000" />
          </linearGradient>

          {/* Red Specular Highlight for 3D Curve */}
          <linearGradient id="guRedHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <stop offset="35%" stopColor="#FF6B6B" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7A0000" stopOpacity="0" />
          </linearGradient>

          {/* Black / Dark Charcoal 3D Beveled Gradient */}
          <linearGradient id="guBlack3D" x1="15%" y1="15%" x2="85%" y2="85%">
            <stop offset="0%" stopColor="#4A4E54" />
            <stop offset="35%" stopColor="#25272B" />
            <stop offset="70%" stopColor="#151618" />
            <stop offset="100%" stopColor="#080809" />
          </linearGradient>

          {/* Black Specular Highlight */}
          <linearGradient id="guBlackHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#555860" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Master 3D Group */}
        <g filter="url(#guRealistic3DShadow)">
          
          {/* ======================================================== */}
          {/* 1. OUTER SPLIT RING - RED TOP-LEFT ARC                   */}
          {/* ======================================================== */}
          {/* Base 3D Red Outer Arc */}
          <path
            d="M 174 38 
               C 134 -2, 58 4, 24 46
               C -8 86, -4 154, 40 196 
               L 52 182
               C 14 146, 12 88, 40 54
               C 70 18, 134 14, 166 48
               Z"
            fill="url(#guRed3D)"
          />
          {/* Top-Edge 3D Highlight on Red Arc */}
          <path
            d="M 174 38 
               C 134 -2, 58 4, 24 46
               C -8 86, -4 154, 40 196 
               L 44 191
               C 1 151, -2 89, 28 50
               C 60 10, 133 4, 171 42
               Z"
            fill="url(#guRedHighlight)"
            opacity="0.75"
          />

          {/* ======================================================== */}
          {/* 2. OUTER SPLIT RING - BLACK BOTTOM-RIGHT ARC             */}
          {/* ======================================================== */}
          {/* Base 3D Black Outer Arc */}
          <path
            d="M 188 56 
               C 230 96, 230 166, 186 208
               C 146 248, 76 244, 42 208
               L 54 194
               C 84 226, 146 230, 180 196
               C 216 160, 216 102, 178 68
               Z"
            fill="url(#guBlack3D)"
          />
          {/* 3D Highlight on Black Arc */}
          <path
            d="M 188 56 
               C 230 96, 230 166, 186 208
               C 146 248, 76 244, 42 208
               L 45 204
               C 78 238, 145 242, 183 204
               C 224 164, 224 98, 184 60
               Z"
            fill="url(#guBlackHighlight)"
            opacity="0.8"
          />

          {/* ======================================================== */}
          {/* 3. INNER MONOGRAM 'G' (3D RED EMBOSSED)                  */}
          {/* ======================================================== */}
          <path
            d="M 136 70 
               C 114 44, 72 44, 48 68
               C 24 92, 24 134, 48 158
               C 72 182, 108 180, 126 156
               L 114 126
               L 100 126
               L 100 98
               L 136 98
               L 136 156
               C 108 194, 56 196, 26 166
               C -4 136, -4 84, 26 54
               C 56 24, 114 22, 148 56
               Z"
            fill="url(#guRed3D)"
          />
          {/* 'G' Top-Left 3D Specular Highlight */}
          <path
            d="M 148 56
               C 114 22, 56 24, 26 54
               C -4 84, -4 136, 26 166
               L 30 160
               C 2 132, 2 86, 30 58
               C 58 30, 112 28, 144 60
               Z"
            fill="url(#guRedHighlight)"
            opacity="0.85"
          />

          {/* ======================================================== */}
          {/* 4. INNER MONOGRAM 'U' / 'J' (3D BLACK/CHARCOAL EMBOSSED) */}
          {/* ======================================================== */}
          <path
            d="M 124 98 
               L 148 98 
               L 148 152 
               C 148 174, 162 182, 178 182 
               C 194 182, 206 174, 206 152 
               L 206 98 
               L 230 98 
               L 230 152 
               C 230 188, 206 206, 178 206 
               C 148 206, 124 188, 124 152 
               Z"
            fill="url(#guBlack3D)"
          />
          {/* 'U' Top-Left 3D Specular Highlight */}
          <path
            d="M 124 98
               L 148 98
               L 148 104
               L 128 104
               L 128 152
               C 128 184, 150 200, 178 200
               L 178 206
               C 148 206, 124 188, 124 152
               Z"
            fill="url(#guBlackHighlight)"
            opacity="0.9"
          />

        </g>
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
            GRADEUP <span className="text-red-600">STUDY</span>
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Mock Test Portal
          </span>
        </div>
      )}
    </div>
  );
};

export interface BrandLogoProps {
  src?: string | null;
  className?: string;
  size?: number;
  alt?: string;
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  src,
  className = "w-10 h-10",
  size,
  alt = "Gradeup Study Logo",
  showText = false
}) => {
  const [hasError, setHasError] = React.useState(false);

  // Reset error state if src changes
  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  const isCustomLogo = Boolean(
    src && 
    src.trim() !== '' && 
    src !== '/logo.png' && 
    src !== '/logo.svg' && 
    !hasError
  );

  if (!isCustomLogo) {
    return <GULogo className={className} size={size} showText={showText} />;
  }

  return (
    <div 
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <img
        src={src!}
        alt={alt}
        className="w-full h-full object-contain drop-shadow-sm"
        onError={() => setHasError(true)}
      />
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white">
            GRADEUP <span className="text-red-600">STUDY</span>
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Mock Test Portal
          </span>
        </div>
      )}
    </div>
  );
};

