import React from 'react';
import Icon from './Icon';

interface FlowControlStepperProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  datasetName?: string;
}

export const FlowControlStepper: React.FC<FlowControlStepperProps> = ({
  activeTab,
  onSelectTab,
  datasetName
}) => {
  const steps = [
    { id: 'workspace_home', step: '1', label: 'Data Ingest' },
    { id: 'dashboard', step: '2', label: 'Executive Command' },
    { id: 'growth_opportunities', step: '3', label: 'Growth & Leakage' },
    { id: 'what_if', step: '4', label: 'Scenario Planner' },
    { id: 'chat', step: '5', label: 'AI Business Analyst' },
    { id: 'story_deck', step: '6', label: 'Board Deck' },
  ];

  return (
    <div className="bg-darkpanel border-b border-darkborder px-4 py-2 flex items-center justify-between overflow-x-auto custom-scrollbar flex-shrink-0">
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 flex items-center space-x-1 flex-shrink-0">
          <Icon name="network" className="w-3.5 h-3.5 text-indigo-400" />
          <span>Pipeline Flow:</span>
        </span>
        <div className="flex items-center space-x-1.5 flex-nowrap">
          {steps.map((s, idx) => {
            const isActive = activeTab === s.id;
            return (
              <React.Fragment key={s.id}>
                {idx > 0 && <span className="text-slate-600 font-mono text-[10px]">→</span>}
                <button
                  onClick={() => onSelectTab(s.id)}
                  className={`flex items-center space-x-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm ring-1 ring-indigo-400/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title={`Navigate to Step ${s.step}: ${s.label}`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {s.step}
                  </span>
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {datasetName && (
        <div className="hidden lg:flex items-center space-x-2 text-[11px] text-slate-400 flex-shrink-0 ml-4">
          <span className="text-slate-500">Active Dataset:</span>
          <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-darkborder truncate max-w-[200px]">
            {datasetName}
          </span>
        </div>
      )}
    </div>
  );
};

export default FlowControlStepper;
