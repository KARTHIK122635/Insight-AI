import React from 'react';
import Icon from './Icon';

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreDashboard?: () => void;
  onOpenSample?: () => void;
}

export const IntroModal: React.FC<IntroModalProps> = ({
  isOpen,
  onClose,
  onExploreDashboard,
  onOpenSample,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151c] border border-darkborder rounded-3xl p-6 w-full max-w-3xl shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-darkborder">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white font-black text-sm shadow">
              IA
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>InsightAI Architecture &amp; Intelligence Guide</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                  v2.0 PRO
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                AI-native analytics platform engineered for zero arithmetic hallucinations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-darkborder hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#181c26] border border-darkborder space-y-2">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Icon name="binary" className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Dual-Engine Architecture</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Combines <strong className="text-slate-200">DuckDB columnar OLAP</strong> for vectorized in-memory query execution with <strong className="text-slate-200">MongoDB document persistence</strong> for chat history, metadata, and custom chart saving.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181c26] border border-darkborder space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Icon name="check" className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Deterministic Accuracy</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              All statistical aggregates (Mean, Median, Interquartile Range, Pearson Correlation, Z-scores) are computed directly in C++ vector pipelines—guaranteeing 0 arithmetic hallucinations.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181c26] border border-darkborder space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Icon name="trending-up" className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">What-If Commercial Modeling</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Live multi-parameter simulation calculates real-time margins, volumes, and revenue deltas, paired with linear regression trend forecasting.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#181c26] border border-darkborder space-y-2">
            <div className="flex items-center space-x-2 text-purple-400">
              <Icon name="move" className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Spatial Figma Gestures</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Touch-enabled spatial analytics desk featuring card swiping, spring physics, and 3D isometric layer dissection.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Close Guide
          </button>
          <button
            onClick={() => {
              onClose();
              if (onExploreDashboard) onExploreDashboard();
              if (onOpenSample) onOpenSample();
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow"
          >
            Explore Executive Studio →
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntroModal;
