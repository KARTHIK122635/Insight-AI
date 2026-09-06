import React, { useState } from 'react';
import Icon from '../components/Icon';
import EChartComponent from '../components/EChartComponent';

interface ExecutiveDashboardViewProps {
  dashboard: any;
  datasetMeta: any;
  slicers: Record<string, any>;
  onSlicerChange: (key: string, val: any) => void;
  onResetSlicers: () => void;
  onOpenCustomChartModal: () => void;
  customCharts: any[];
  onDeleteCustomChart: (index: number) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  executiveBriefing?: {
    health_score?: number;
    health_label?: string;
    health_status?: 'healthy' | 'stable' | 'warning' | 'critical';
    domain?: string;
    summary?: string;
    strategic_takeaways?: string[];
    action_items?: string[];
    metrics?: {
      total_revenue?: number;
      total_profit?: number;
      margin_pct?: number;
      growth_pct?: number;
      total_records?: number;
    };
  } | null;
  onNavigateToOpportunities?: () => void;
}

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  dashboard,
  datasetMeta,
  slicers,
  onSlicerChange,
  onResetSlicers,
  onOpenCustomChartModal,
  customCharts,
  onDeleteCustomChart,
  loading = false,
  error = null,
  onRetry,
  executiveBriefing,
  onNavigateToOpportunities
}) => {
  const [drilldownChart, setDrilldownChart] = useState<any>(null);

  // 1. Loading State with Active Progress
  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-darkborder rounded-3xl bg-darkpanel space-y-4 select-none">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <Icon name="refresh-cw" className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Computing Executive Dashboard Analytics</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            DuckDB is running vectorized aggregations across {datasetMeta?.rows?.toLocaleString() || 'all'} records with zero arithmetic hallucinations.
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State with Retry Button
  if (error) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-rose-500/30 rounded-3xl bg-rose-500/5 space-y-4 select-none">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
          <Icon name="alert-triangle" className="w-6 h-6 text-rose-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Dashboard Generation Notice</h3>
          <p className="text-xs text-rose-300 mt-1 max-w-md font-mono">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center space-x-2"
          >
            <Icon name="refresh-cw" className="w-3.5 h-3.5" />
            <span>Retry Metric Calculation</span>
          </button>
        )}
      </div>
    );
  }

  // 3. Fallback Empty State with Interactive Trigger
  if (!dashboard) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-dashed border-darkborder rounded-3xl bg-darkpanel space-y-4 select-none">
        <Icon name="layout-dashboard" className="w-12 h-12 text-slate-600" />
        <div>
          <h3 className="text-base font-bold text-white">Executive Dashboard Ready</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            DuckDB in-memory OLAP view initialized. Click below to execute multi-dimensional aggregates.
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center space-x-2"
          >
            <Icon name="refresh-cw" className="w-3.5 h-3.5" />
            <span>Compute Executive Analytics</span>
          </button>
        )}
      </div>
    );
  }

  const kpis = dashboard.kpis || [];
  const charts = dashboard.charts || [];
  
  // Normalize slicers: support both dict { col: [vals] } and array [ { column, sample_values } ]
  const filters: Array<{ column: string; sample_values: string[] }> = dashboard.slicers
    ? Object.entries(dashboard.slicers).map(([col, vals]: [string, any]) => ({
        column: col,
        sample_values: Array.isArray(vals) ? vals : [],
      }))
    : (dashboard.available_filters || []);

  return (
    <div className="space-y-6">
      {/* 0. Executive Strategic Briefing Hero Banner */}
      {executiveBriefing && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/25 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-indigo-500/20">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Icon name="sparkles" className="w-3.5 h-3.5 text-indigo-400" />
                <span>Executive Strategic Briefing • {executiveBriefing.domain || 'Enterprise Portfolio'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                C-Suite Decision &amp; Commercial Health Review
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {executiveBriefing.summary || 'Vectorized DuckDB analytics scan completed across all business dimensions.'}
              </p>
            </div>

            {/* Health Score Pill / Gauge */}
            <div className="flex items-center gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shrink-0 shadow-inner">
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
                <span className={`text-2xl font-black font-mono ${
                  (executiveBriefing.health_score ?? 75) >= 80 ? 'text-emerald-400' :
                  (executiveBriefing.health_score ?? 75) >= 65 ? 'text-indigo-400' :
                  (executiveBriefing.health_score ?? 75) >= 50 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {executiveBriefing.health_score ?? 75}
                </span>
                <span className="absolute bottom-1 text-[8px] font-mono text-slate-500 uppercase tracking-widest font-bold">/100</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Commercial Health
                </span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  (executiveBriefing.health_score ?? 75) >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  (executiveBriefing.health_score ?? 75) >= 65 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                  (executiveBriefing.health_score ?? 75) >= 50 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {executiveBriefing.health_label || 'Stable Operations'}
                </span>
                {onNavigateToOpportunities && (
                  <button
                    onClick={onNavigateToOpportunities}
                    className="block text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline font-semibold mt-1 text-left"
                  >
                    View Growth &amp; Leakage Radar →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Strategic Takeaways & Action Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* 3 Strategic Takeaways */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Icon name="award" className="w-4 h-4 text-indigo-400" />
                <span className="tracking-wide uppercase text-[11px]">3 Executive Takeaways</span>
              </div>
              <div className="space-y-2.5">
                {(executiveBriefing.strategic_takeaways || []).map((t: string, i: number) => (
                  <div key={i} className="flex items-start space-x-2.5 text-xs text-slate-300 leading-relaxed">
                    <span className="w-5 h-5 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                      {i + 1}
                    </span>
                    <span dangerouslySetInnerHTML={{
                      __html: t.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                    }} />
                  </div>
                ))}
              </div>
            </div>

            {/* 3 Prioritized Action Items */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Icon name="target" className="w-4 h-4 text-emerald-400" />
                <span className="tracking-wide uppercase text-[11px]">Prioritized Decision Levers</span>
              </div>
              <div className="space-y-2.5">
                {(executiveBriefing.action_items || []).map((a: string, i: number) => (
                  <div key={i} className="flex items-start space-x-2.5 text-xs text-slate-300 leading-relaxed">
                    <span className="w-5 h-5 rounded-md bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                      <Icon name="check" className="w-3 h-3" />
                    </span>
                    <span dangerouslySetInnerHTML={{
                      __html: a.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slicers & Global Filter Bar */}
      {filters.length > 0 && (
        <div className="bg-darkpanel border border-darkborder rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 flex-shrink-0">
            <Icon name="filter" className="w-4 h-4 text-indigo-400" />
            <span>Interactive Data Slicers:</span>
          </div>

          <div className="flex items-center space-x-3 overflow-x-auto custom-scrollbar w-full flex-wrap gap-y-2">
            {filters.map((f: any) => (
              <div key={f.column} className="flex items-center space-x-1.5 bg-darksubpanel border border-darkborder px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-mono text-slate-400">{f.column}:</span>
                <select
                  value={slicers[f.column] || 'ALL'}
                  onChange={(e) => onSlicerChange(f.column, e.target.value === 'ALL' ? null : e.target.value)}
                  className="bg-transparent text-xs text-slate-200 border-none focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-darkpanel text-slate-300">All Values</option>
                  {(f.sample_values || []).map((v: any) => (
                    <option key={String(v)} value={String(v)} className="bg-darkpanel text-slate-300">
                      {String(v)}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <button
              onClick={onResetSlicers}
              className="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1 rounded-xl border border-darkborder bg-darksubpanel transition-colors flex items-center space-x-1"
            >
              <Icon name="x" className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Full-Form KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi: any, idx: number) => {
          const isPos = String(kpi.trend_direction || '').toLowerCase() === 'up' || String(kpi.change || '').startsWith('+');
          return (
            <div
              key={idx}
              className="bg-darkpanel border border-darkborder rounded-2xl p-5 hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold block truncate">
                  {kpi.label || kpi.title}
                </span>
                <div className="text-2xl font-extrabold text-white mt-1 font-mono tracking-tight">
                  {kpi.formatted_value || kpi.value}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-darkborder/50 flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-500">{kpi.subtitle || 'Real-time Aggregate'}</span>
                {kpi.change && (
                  <span className={`flex items-center space-x-0.5 font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span>{kpi.change}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart: any, idx: number) => (
          <div key={idx} className="bg-darkpanel border border-darkborder rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-darkborder">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">{chart.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{chart.description || 'DuckDB Cross-Tabular Analysis'}</p>
              </div>
              <button
                onClick={() => setDrilldownChart(chart)}
                className="p-1.5 rounded-lg border border-darkborder hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                title="Expand Fullscreen View"
              >
                <Icon name="maximize-2" className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4">
              <EChartComponent options={chart.options} className="chart-box" />
            </div>
          </div>
        ))}

        {/* Custom User Charts */}
        {customCharts.map((chart: any, idx: number) => (
          <div key={`custom_${idx}`} className="bg-darkpanel border border-indigo-500/30 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-darkborder">
              <div className="flex items-center space-x-2">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold uppercase">Custom</span>
                <h4 className="text-sm font-bold text-white">{chart.title}</h4>
              </div>
              <button
                onClick={() => onDeleteCustomChart(idx)}
                className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                title="Remove Chart"
              >
                <Icon name="trash-2" className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4">
              <EChartComponent options={chart.options} className="chart-box" />
            </div>
          </div>
        ))}
      </div>

      {/* Drilldown Modal */}
      {drilldownChart && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-darkpanel border border-darkborder rounded-3xl p-6 w-full max-w-4xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-darkborder">
              <div>
                <h3 className="text-base font-bold text-white">{drilldownChart.title}</h3>
                <p className="text-xs text-slate-400">{drilldownChart.description || 'Full-fidelity Interactive Exploration'}</p>
              </div>
              <button
                onClick={() => setDrilldownChart(null)}
                className="p-1.5 rounded-xl border border-darkborder hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>

            <EChartComponent options={drilldownChart.options} className="modal-chart-box" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveDashboardView;
