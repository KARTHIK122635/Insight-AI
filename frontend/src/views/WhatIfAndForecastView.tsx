import React from 'react';
import Icon from '../components/Icon';
import EChartComponent from '../components/EChartComponent';

interface WhatIfAndForecastViewProps {
  datasetMeta: any;
  params: {
    price_change_pct: number;
    volume_change_pct: number;
    discount_change_pct: number;
    cost_change_pct: number;
  };
  setParams: React.Dispatch<React.SetStateAction<{
    price_change_pct: number;
    volume_change_pct: number;
    discount_change_pct: number;
    cost_change_pct: number;
  }>>;
  result: any;
  whatIfLoading: boolean;
  forecastData: any;
  forecastLoading: boolean;
  onSimulate: (params: any) => void;
  forecastPeriods?: number;
  onPeriodsChange?: (periods: number) => void;
  onRecalculateForecast?: (periods?: number) => void;
  whatIfError?: string | null;
  forecastError?: string | null;
}

export const WhatIfAndForecastView: React.FC<WhatIfAndForecastViewProps> = ({
  params,
  setParams,
  result,
  whatIfLoading,
  forecastData,
  forecastLoading,
  onSimulate,
  forecastPeriods = 6,
  onPeriodsChange,
  onRecalculateForecast,
  whatIfError,
  forecastError
}) => {
  const handleSlider = (key: string, val: string) => {
    const updated = { ...params, [key]: parseFloat(val) };
    setParams(updated);
    onSimulate(updated);
  };

  const handleReset = () => {
    const resetParams = {
      price_change_pct: 0,
      volume_change_pct: 0,
      discount_change_pct: 0,
      cost_change_pct: 0
    };
    setParams(resetParams);
    onSimulate(resetParams);
  };

  const hasSimulated = result && result.simulated && typeof result.simulated.revenue !== 'undefined';
  const hasImpact = result && result.impact && typeof result.impact.revenue_delta !== 'undefined';
  const hasForecast = forecastData && forecastData.options && forecastData.direction;

  const fmtCurrency = (val: number | undefined) => {
    if (val == null) return '$0';
    return '$' + Number(val).toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  const fmtDelta = (delta: number | undefined, pct: number | undefined) => {
    if (delta == null) return '+$0 (0%)';
    const sign = delta >= 0 ? '+' : '';
    return `${sign}${fmtCurrency(delta)} (${sign}${Number(pct || 0).toFixed(1)}%)`;
  };

  const directionStr = hasForecast ? String(forecastData.direction).toUpperCase() : 'PROJECTED';
  const slopeVal = (forecastData && forecastData.trend_slope != null) ? forecastData.trend_slope.toFixed(2) : 'N/A';

  return (
    <div className="space-y-6">
      {/* Top: Interactive What-If Scenario Simulator */}
      <div className="bg-darkpanel border border-darkborder rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-darkborder">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <h2 className="text-lg font-bold text-white tracking-tight">Interactive What-If Scenario Simulator</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Adjust commercial parameters to simulate revenue and net profit delta in real-time via DuckDB
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-darkborder bg-darksubpanel hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors flex items-center space-x-1.5"
            >
              <Icon name="refresh-cw" className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Parameters</span>
            </button>
            <button
              onClick={() => onSimulate(params)}
              disabled={whatIfLoading}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-sm flex items-center space-x-1.5"
            >
              <Icon name="sparkles" className={`w-3.5 h-3.5 text-indigo-200 ${whatIfLoading ? 'animate-spin' : ''}`} />
              <span>Recalculate Impact</span>
            </button>
          </div>
        </div>

        {whatIfError && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-2">
            <Icon name="alert-triangle" className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Notice: {whatIfError}</span>
          </div>
        )}

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Price Slider */}
          <div className="bg-darksubpanel/70 border border-darkborder rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-200">Price Adjustment</span>
              <span className={`text-xs font-mono font-bold ${params.price_change_pct >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                {params.price_change_pct > 0 ? `+${params.price_change_pct}%` : `${params.price_change_pct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={params.price_change_pct}
              onChange={(e) => handleSlider('price_change_pct', e.target.value)}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>-30%</span>
              <span>Baseline</span>
              <span>+30%</span>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="bg-darksubpanel/70 border border-darkborder rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-200">Volume / Units</span>
              <span className={`text-xs font-mono font-bold ${params.volume_change_pct >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                {params.volume_change_pct > 0 ? `+${params.volume_change_pct}%` : `${params.volume_change_pct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="1"
              value={params.volume_change_pct}
              onChange={(e) => handleSlider('volume_change_pct', e.target.value)}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>-30%</span>
              <span>Baseline</span>
              <span>+30%</span>
            </div>
          </div>

          {/* Discount Slider */}
          <div className="bg-darksubpanel/70 border border-darkborder rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-200">Discount Rate</span>
              <span className={`text-xs font-mono font-bold ${params.discount_change_pct <= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {params.discount_change_pct > 0 ? `+${params.discount_change_pct}%` : `${params.discount_change_pct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-25"
              max="25"
              step="1"
              value={params.discount_change_pct}
              onChange={(e) => handleSlider('discount_change_pct', e.target.value)}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>-25%</span>
              <span>Baseline</span>
              <span>+25%</span>
            </div>
          </div>

          {/* Cost Slider */}
          <div className="bg-darksubpanel/70 border border-darkborder rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-200">Operating Costs</span>
              <span className={`text-xs font-mono font-bold ${params.cost_change_pct <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {params.cost_change_pct > 0 ? `+${params.cost_change_pct}%` : `${params.cost_change_pct}%`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="1"
              value={params.cost_change_pct}
              onChange={(e) => handleSlider('cost_change_pct', e.target.value)}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>-20%</span>
              <span>Baseline</span>
              <span>+20%</span>
            </div>
          </div>
        </div>

        {/* Real-time Projected KPI Output Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Projected Revenue */}
          <div className="bg-gradient-to-br from-indigo-950/30 to-darksubpanel border border-indigo-500/20 rounded-2xl p-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Projected Revenue</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {hasSimulated ? fmtCurrency(result.simulated.revenue) : '$0'}
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs font-mono font-medium">
              <Icon name="trending-up" className={`w-3.5 h-3.5 ${hasImpact && result.impact.revenue_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className={hasImpact && result.impact.revenue_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {hasImpact ? fmtDelta(result.impact.revenue_delta, result.impact.revenue_pct) : '+$0 (0%)'}
              </span>
            </div>
          </div>

          {/* Projected Net Profit */}
          <div className="bg-gradient-to-br from-cyan-950/30 to-darksubpanel border border-cyan-500/20 rounded-2xl p-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Projected Net Profit</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {hasSimulated ? fmtCurrency(result.simulated.net_profit) : '$0'}
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs font-mono font-medium">
              <Icon name="trending-up" className={`w-3.5 h-3.5 ${hasImpact && result.impact.profit_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span className={hasImpact && result.impact.profit_delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {hasImpact ? fmtDelta(result.impact.profit_delta, result.impact.profit_pct) : '+$0 (0%)'}
              </span>
            </div>
          </div>

          {/* Simulated Margin */}
          <div className="bg-gradient-to-br from-purple-950/30 to-darksubpanel border border-purple-500/20 rounded-2xl p-5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Simulated Margin</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {hasSimulated ? `${Number(result.simulated.margin_pct || 0).toFixed(2)}%` : '0.00%'}
            </div>
            <div className="mt-2 flex items-center space-x-1.5 text-xs font-mono font-medium text-slate-400">
              <span>Margin Delta: </span>
              <span className={hasImpact && result.impact.margin_delta_pts >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {hasImpact ? `${result.impact.margin_delta_pts >= 0 ? '+' : ''}${result.impact.margin_delta_pts} pts` : '0 pts'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Predictive Time-Series Forecasting Engine */}
      <div className="bg-darkpanel border border-darkborder rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-darkborder">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h3 className="text-base font-bold text-white">Predictive Time-Series Forecasting</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Extrapolation with confidence interval error bands via DuckDB Vector Analytics
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {hasForecast && (
              <span className="px-3 py-1 rounded-lg bg-slate-800 border border-darkborder text-[11px] font-mono text-cyan-300 flex items-center space-x-1.5">
                <span>Trajectory: {directionStr} (Slope: {slopeVal})</span>
              </span>
            )}

            {onRecalculateForecast && (
              <button
                onClick={() => onRecalculateForecast(forecastPeriods)}
                disabled={forecastLoading}
                className="px-3 py-1.5 rounded-xl border border-darkborder bg-darksubpanel hover:bg-slate-800 text-xs font-medium text-slate-300 transition-all flex items-center space-x-1.5"
              >
                <Icon name="refresh-cw" className={`w-3.5 h-3.5 text-cyan-400 ${forecastLoading ? 'animate-spin' : ''}`} />
                <span>Re-Forecast</span>
              </button>
            )}
          </div>
        </div>

        {forecastError && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-cyan-300 text-xs flex items-center space-x-2">
            <Icon name="sparkles" className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>Notice: {forecastError}. Sequence projection fallback active.</span>
          </div>
        )}

        <div className="mt-4">
          {forecastLoading ? (
            <div className="h-72 flex flex-col items-center justify-center space-y-3">
              <Icon name="refresh-cw" className="w-8 h-8 text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-400">Computing predictive extrapolation...</span>
            </div>
          ) : hasForecast ? (
            <EChartComponent options={forecastData.options} className="modal-chart-box" />
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-center p-6 border border-dashed border-darkborder rounded-xl">
              <Icon name="trending-up" className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-xs text-slate-400">No forecast calculated yet. Click Re-Forecast above to compute trend extrapolation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatIfAndForecastView;
