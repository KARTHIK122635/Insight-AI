import React from 'react';
import Icon from './Icon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetMeta: any;
  mongoStatus: any;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  datasetMeta,
  mongoStatus,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151c] border border-darkborder rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-darkborder">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white font-black text-sm shadow">
              IA
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>About InsightAI Intelligence Platform</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  v2.0 PRO
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic Columnar OLAP + Distributed Document Engine
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

        {/* System Specs List */}
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3.5 rounded-2xl bg-darksubpanel border border-darkborder flex items-center justify-between">
            <span className="text-slate-400">Primary Analytics Engine</span>
            <span className="text-indigo-400 font-bold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>DuckDB Columnar In-Memory Vectorizer</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-darksubpanel border border-darkborder flex items-center justify-between">
            <span className="text-slate-400">Database Layer</span>
            <span className="text-emerald-400 font-bold flex items-center space-x-1.5">
              <span className="text-sm">🍃</span>
              <span>
                {mongoStatus?.connected ? `MongoDB (${mongoStatus.database || 'Active'})` : 'MongoDB Standby (In-Memory Fallback)'}
              </span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-darksubpanel border border-darkborder flex items-center justify-between">
            <span className="text-slate-400">Active Loaded Dataset</span>
            <span className="text-cyan-300 font-bold truncate max-w-[240px]">
              {datasetMeta ? `${datasetMeta.name} (${datasetMeta.rows} rows)` : 'No Dataset Selected'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-darksubpanel border border-darkborder flex items-center justify-between">
            <span className="text-slate-400">Frontend Technology</span>
            <span className="text-white font-bold">React 18 + Vite + Tailwind CSS</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-darksubpanel border border-darkborder flex items-center justify-between">
            <span className="text-slate-400">Data Visualization</span>
            <span className="text-amber-400 font-bold">Apache ECharts 5.x</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">Build 2026.09 • Fully Compliant with Zero Short-Forms Rule</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
