import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  collapsed?: boolean;
  className?: string;
  showText?: boolean;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  collapsed = false,
  className = '',
  showText = true,
  onClick
}) => {
  const iconPixelSizes = {
    sm: 28,
    md: 34,
    lg: 42
  };
  const iconSize = iconPixelSizes[size];

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      title={onClick ? "Go to Home (Upload)" : undefined}
      className={`flex items-center space-x-3 select-none ${onClick ? 'cursor-pointer hover:opacity-90 active:scale-[0.99] transition-all group' : ''} ${className}`}
    >
      {/* High-Tech Vector Emblem */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center group"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_2px_8px_rgba(99,102,241,0.35)] transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            <linearGradient id="logo-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
            <linearGradient id="logo-grad-accent" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <filter id="logo-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Hexagonal Structure */}
          <polygon
            points="32,4 56,18 56,46 32,60 8,46 8,18"
            fill="#090D16"
            stroke="url(#logo-grad-primary)"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Isometric Inner Dimensional Facets */}
          <polygon
            points="32,8 52,20 32,32 12,20"
            fill="url(#logo-grad-primary)"
            fillOpacity="0.4"
            stroke="#38BDF8"
            strokeWidth="1.2"
          />
          <polygon
            points="12,20 32,32 32,56 12,44"
            fill="url(#logo-grad-accent)"
            fillOpacity="0.25"
            stroke="#6366F1"
            strokeWidth="1.2"
          />
          <polygon
            points="32,32 52,20 52,44 32,56"
            fill="url(#logo-grad-primary)"
            fillOpacity="0.55"
            stroke="#8B5CF6"
            strokeWidth="1.2"
          />

          {/* Glowing Neural Center Spark */}
          <circle cx="32" cy="32" r="5.5" fill="#38BDF8" filter="url(#logo-glow-filter)" />
          <circle cx="32" cy="32" r="2.8" fill="#FFFFFF" />

          {/* Neural Vector Traces */}
          <line x1="32" y1="32" x2="32" y2="14" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="14" r="2" fill="#38BDF8" />

          <line x1="32" y1="32" x2="46" y2="40" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
          <circle cx="46" cy="40" r="2" fill="#8B5CF6" />

          <line x1="32" y1="32" x2="18" y2="40" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
          <circle cx="18" cy="40" r="2" fill="#06B6D4" />
        </svg>
      </div>

      {/* Typography Lockup (hidden when collapsed or showText is false) */}
      {!collapsed && showText && (
        <div className="flex flex-col min-w-0 leading-tight">
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-[15px] text-white tracking-tight">
              Insight<span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">AI</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 tracking-wider">
              PRO
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium tracking-wide">
            Intelligence Platform
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandLogo;
