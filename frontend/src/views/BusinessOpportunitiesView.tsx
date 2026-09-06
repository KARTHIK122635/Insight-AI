import React from 'react';
import Icon from '../components/Icon';

interface BusinessOpportunitiesViewProps {
  datasetMeta: any;
  opportunitiesData: {
    opportunities?: Array<{
      id: string;
      title: string;
      category: string;
      potential: string;
      description: string;
      strategic_play: string;
    }>;
    leakage?: Array<{
      id: string;
      type: string;
      severity: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      estimated_leakage: string;
      remedy: string;
    }>;
  } | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenWhatIf?: () => void;
}

export const BusinessOpportunitiesView: React.FC<BusinessOpportunitiesViewProps> = ({
  datasetMeta,
  opportunitiesData,
  loading,
  onRefresh,
  onOpenWhatIf
}) => {
  const opportunities = opportunitiesData?.opportunities || [];
  const leakage = opportunitiesData?.leakage || [];

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-darkborder rounded-3xl bg-darkpanel space-y-4 select-none">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Icon name="refresh-cw" className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Scanning for Growth Vectors &amp; Margin Risks</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            DuckDB is cross-referencing segment margins, order distributions, and discount elasticity across {datasetMeta?.rows?.toLocaleString() || 'all'} records...
          </p>
        </div>
      </div>
    );
  }

  const criticalCount = leakage.filter(l => l.severity === 'critical').length;
  const warningCount = leakage.filter(l => l.severity === 'warning').length;

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Icon name="sparkles" className="w-3.5 h-3.5 text-indigo-400" />
            <span>Autonomous Commercial Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Growth Vectors &amp; Profit Leakage Radar
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Algorithmic audit of revenue drivers, margin erosion, and expansion plays for {datasetMeta?.name || 'the active business'}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <Icon name="refresh-cw" className="w-3.5 h-3.5 text-slate-400" />
            <span>Re-Audit</span>
          </button>
          {onOpenWhatIf && (
            <button
              onClick={onOpenWhatIf}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md hover:shadow-indigo-500/25"
            >
              <Icon name="trending-up" className="w-3.5 h-3.5 text-white" />
              <span>Simulate Fix in What-If</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0F1523] border border-emerald-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Growth Opportunities</span>
            <div className="text-2xl font-bold text-white">{opportunities.length} Identified</div>
            <p className="text-[11px] text-slate-400">High-yield market vectors</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Icon name="trending-up" className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1523] border border-rose-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Profit Leakage Points</span>
            <div className="text-2xl font-bold text-white">{leakage.length} Flagged</div>
            <p className="text-[11px] text-slate-400">{criticalCount} critical, {warningCount} warnings</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Icon name="alert-triangle" className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1523] border border-indigo-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">Strategic Priority</span>
            <div className="text-2xl font-bold text-white">Action Ready</div>
            <p className="text-[11px] text-slate-400">Automated executive playbook</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Icon name="shield" className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid: Opportunities vs Leakage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Growth Vectors */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>High-Yield Growth Opportunities</span>
            </h3>
            <span className="text-xs text-slate-400">{opportunities.length} expansion paths</span>
          </div>

          {opportunities.length === 0 ? (
            <div className="p-8 rounded-2xl bg-darkpanel border border-darkborder text-center text-slate-500 text-xs">
              No distinct growth outliers detected in this slice.
            </div>
          ) : (
            opportunities.map((opp, idx) => (
              <div
                key={opp.id || idx}
                className="p-5 rounded-2xl bg-darkpanel border border-slate-800 hover:border-emerald-500/40 transition-all shadow-md space-y-3 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {opp.category}
                    </span>
                    <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {opp.title}
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400 shrink-0 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    {opp.potential}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {opp.description}
                </p>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
                  <Icon name="check-circle" className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200">Recommended Executive Play: </span>
                    <span>{opp.strategic_play}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Revenue Leakage Radar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Revenue &amp; Profit Leakage Radar</span>
            </h3>
            <span className="text-xs text-slate-400">{leakage.length} active risks</span>
          </div>

          {leakage.length === 0 ? (
            <div className="p-8 rounded-2xl bg-darkpanel border border-darkborder text-center text-slate-500 text-xs">
              Zero critical margin leakages detected across this dataset.
            </div>
          ) : (
            leakage.map((leak, idx) => {
              const isCrit = leak.severity === 'critical';
              return (
                <div
                  key={leak.id || idx}
                  className={`p-5 rounded-2xl bg-darkpanel border transition-all shadow-md space-y-3 group ${
                    isCrit ? 'border-rose-500/40 hover:border-rose-500' : 'border-amber-500/30 hover:border-amber-500/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isCrit
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {leak.type} &bull; {leak.severity.toUpperCase()}
                      </span>
                      <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                        {leak.title}
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400 shrink-0 bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-500/30">
                      {leak.estimated_leakage}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {leak.description}
                  </p>

                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2">
                    <Icon name="alert-triangle" className={`w-4 h-4 shrink-0 mt-0.5 ${isCrit ? 'text-rose-400' : 'text-amber-400'}`} />
                    <div>
                      <span className="font-semibold text-slate-200">Prescribed Remedy: </span>
                      <span>{leak.remedy}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessOpportunitiesView;
