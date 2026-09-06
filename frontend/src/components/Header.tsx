import React from 'react';
import Icon from './Icon';

interface HeaderProps {
  activeTabTitle: string;
  onRefresh: () => void;
  refreshing: boolean;
  onGoHome?: () => void;
  onTogglePresentation: () => void;
  isPresentation: boolean;
  onOpenCustomChartModal: () => void;
  onOpenAIAnalyst: () => void;
  onOpenShareModal?: () => void;
  userPermission?: string;
  currentUser?: any;
  onOpenSecurityModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTabTitle,
  onRefresh,
  refreshing,
  onTogglePresentation,
  isPresentation,
  onOpenCustomChartModal,
  onOpenAIAnalyst,
  onOpenShareModal,
  userPermission,
  currentUser,
  onOpenSecurityModal,
  onLogout
}) => {
  return (
    <header className="h-16 bg-[#0B0F19] border-b border-slate-800/80 px-6 flex items-center justify-between z-20 flex-shrink-0">
      {/* Left: Active workspace title */}
      <div className="flex items-center space-x-4">
        <h1 className="text-sm font-semibold text-white tracking-tight flex items-center space-x-2">
          <span>{activeTabTitle}</span>
        </h1>
      </div>

      {/* Right: Actions (Cleaned, uncluttered executive toolbar) */}
      <div className="flex items-center space-x-2">
        {/* Universal Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          title="Refresh analytical queries and re-execute DuckDB cache"
        >
          <Icon name="refresh-cw" className={`w-3.5 h-3.5 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>

        {/* Presentation Mode */}
        <button
          onClick={onTogglePresentation}
          className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isPresentation
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Toggle Fullscreen Executive Presentation"
        >
          <Icon name="presentation" className="w-3.5 h-3.5 text-slate-400" />
          <span>Presentation</span>
        </button>

        {/* Share Dataset Button */}
        {onOpenShareModal && (
          <button
            onClick={onOpenShareModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/60 text-xs font-medium text-slate-200 hover:text-white transition-all shadow-sm group"
            title="Share this dataset with colleagues (Generate View or Editor link)"
          >
            <Icon name="share-2" className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300" />
            <span>Share</span>
            {userPermission && userPermission !== 'owner' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-semibold ${
                userPermission === 'editor'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {userPermission}
              </span>
            )}
          </button>
        )}

        {/* Add Custom Chart */}
        <button
          onClick={onOpenCustomChartModal}
          className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-all shadow-sm"
        >
          <Icon name="plus" className="w-3.5 h-3.5 text-white" />
          <span>Add Custom Chart</span>
        </button>

        {/* Ask AI Analyst */}
        <button
          onClick={onOpenAIAnalyst}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
        >
          <Icon name="sparkles" className="w-3.5 h-3.5 text-indigo-400" />
          <span>Ask AI Analyst</span>
        </button>

      </div>
    </header>
  );
};

export default Header;
