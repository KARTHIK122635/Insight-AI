import React, { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import EChartComponent from '../components/EChartComponent';
import * as api from '../services/api';

// 1. Descriptive Statistics Lab
export const DescriptiveStatisticsLabView: React.FC<{ stats: any }> = ({ stats }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const columnMap = stats && stats.columns
    ? stats.columns
    : (() => {
        const map: Record<string, any> = {};
        (stats?.measures || []).forEach((entry: any) => {
          const name = entry?.column || entry?.name;
          if (name) map[name] = entry;
        });
        (stats?.dimensions || []).forEach((entry: any) => {
          const name = entry?.column || entry?.name;
          if (name) map[name] = { ...entry, type: entry?.type || 'CATEGORY' };
        });
        return map;
      })();

  if (!stats || Object.keys(columnMap).length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-darkborder rounded-2xl bg-darkpanel">
        <Icon name="binary" className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-xs text-slate-400">Loading comprehensive parametric statistics...</p>
      </div>
    );
  }

  const columns = Object.entries(columnMap).filter(([name]) =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="bg-darkpanel border border-darkborder rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white">Descriptive Statistics Lab</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full parametric &amp; non-parametric distributions across all numerical and categorical columns
          </p>
        </div>
        <input
          type="text"
          placeholder="Filter columns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-darksubpanel border border-darkborder text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
        />
      </div>

      <div className="bg-darkpanel border border-darkborder rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-darkborder bg-darksubpanel/70 text-slate-400 text-[11px] uppercase">
                <th className="p-3.5 pl-5 font-bold">Column Name</th>
                <th className="p-3.5">Data Type</th>
                <th className="p-3.5">Count</th>
                <th className="p-3.5">Mean</th>
                <th className="p-3.5">Standard Deviation</th>
                <th className="p-3.5">Minimum</th>
                <th className="p-3.5">Median</th>
                <th className="p-3.5">Maximum</th>
                <th className="p-3.5">Skewness</th>
                <th className="p-3.5 pr-5">Missing Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-darkborder/50 text-slate-300">
              {columns.map(([name, data]: [string, any]) => (
                <tr key={name} className="hover:bg-darksubpanel/50 transition-colors">
                  <td className="p-3.5 pl-5 font-semibold text-white">{name}</td>
                  <td className="p-3.5 text-slate-400">{data.type || 'NUMERIC'}</td>
                  <td className="p-3.5">{data.count?.toLocaleString() || '-'}</td>
                  <td className="p-3.5 text-indigo-300">{data.mean != null ? Number(data.mean).toFixed(2) : '-'}</td>
                  <td className="p-3.5 text-slate-400">{data.std != null ? Number(data.std).toFixed(2) : '-'}</td>
                  <td className="p-3.5">{data.min != null ? Number(data.min).toFixed(2) : '-'}</td>
                  <td className="p-3.5 text-cyan-300">{data.median != null ? Number(data.median).toFixed(2) : '-'}</td>
                  <td className="p-3.5">{data.max != null ? Number(data.max).toFixed(2) : '-'}</td>
                  <td className="p-3.5">{data.skewness != null ? Number(data.skewness).toFixed(2) : '-'}</td>
                  <td className="p-3.5 pr-5 text-rose-400">{data.null_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 2. Data Cleaning & Wrangling Lab
export const DataCleaningLabView: React.FC<{
  datasetId: string;
  onApplyCleaning: (action: string) => void;
  cleaningStatus?: string | null;
}> = ({ onApplyCleaning, cleaningStatus }) => {
  return (
    <div className="space-y-6">
      <div className="bg-darkpanel border border-darkborder rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-white">Data Cleaning &amp; Wrangling Lab</h2>
        <p className="text-xs text-slate-400 mt-1">
          Automated transformations executed via DuckDB columnar memory with zero loss of source integrity
        </p>

        {cleaningStatus && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
            <Icon name="check" className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{cleaningStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-5 rounded-2xl border border-darkborder bg-darksubpanel flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400">
                <Icon name="trash-2" className="w-4 h-4" />
                <h4 className="text-sm font-bold text-white">Deduplicate Rows</h4>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Remove fully redundant duplicate records across all composite keys.
              </p>
            </div>
            <button
              onClick={() => onApplyCleaning('deduplicate')}
              className="mt-4 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              Run Deduplication
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-darkborder bg-darksubpanel flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-cyan-400">
                <Icon name="wrench" className="w-4 h-4" />
                <h4 className="text-sm font-bold text-white">Impute Missing Values</h4>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Fill null numeric values with column median, and categoricals with mode.
              </p>
            </div>
            <button
              onClick={() => onApplyCleaning('impute_median')}
              className="mt-4 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors"
            >
              Impute Null Values
            </button>
          </div>

          <div className="p-5 rounded-2xl border border-darkborder bg-darksubpanel flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-purple-400">
                <Icon name="alert-triangle" className="w-4 h-4" />
                <h4 className="text-sm font-bold text-white">Filter Extreme Outliers</h4>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Clamp values outside ±3 standard deviations (99.7% confidence interval).
              </p>
            </div>
            <button
              onClick={() => onApplyCleaning('clamp_outliers')}
              className="mt-4 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-colors"
            >
              Clamp Outliers (±3σ)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. Relationships & Correlation Map
export const RelationshipsLabView: React.FC<{ correlationData: any }> = ({ correlationData }) => {
  if (!correlationData || !correlationData.options) {
    return (
      <div className="p-8 text-center border border-dashed border-darkborder rounded-2xl bg-darkpanel">
        <Icon name="network" className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-xs text-slate-400">Computing multi-variable Pearson correlation matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-darkpanel border border-darkborder rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-bold text-white">Relationship &amp; Correlation Map</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Pairwise Pearson correlation coefficients identifying co-variance between dimensions
        </p>

        <div className="mt-6">
          <EChartComponent options={correlationData.options} className="graph-box" />
        </div>
      </div>
    </div>
  );
};

// 4. Anomaly & Outlier Lab
export const AnomalyLabView: React.FC<{ anomalyData: any }> = ({ anomalyData }) => {
  if (!anomalyData) {
    return (
      <div className="p-8 text-center border border-dashed border-darkborder rounded-2xl bg-darkpanel">
        <Icon name="alert-triangle" className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-xs text-slate-400">Scanning dataset for statistical anomalies...</p>
      </div>
    );
  }

  const anomalies = anomalyData.anomalies || [];

  return (
    <div className="space-y-6">
      <div className="bg-darkpanel border border-darkborder rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-darkborder">
          <div>
            <h2 className="text-base font-bold text-white">Anomaly &amp; Outlier Lab</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              3-Sigma parametric boundaries and Isolation Forest scoring
            </p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono font-bold text-rose-400">
            {anomalies.length} Anomalies Flagged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {anomalies.map((anom: any, idx: number) => (
            <div key={idx} className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">{anom.column}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                  {anom.severity || 'HIGH DEVIATION'}
                </span>
              </div>
              <div className="text-lg font-mono font-bold text-rose-400 mt-2">
                Value: {anom.value}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 font-mono">
                {anom.reason || 'Exceeds ±3.2 standard deviations from cohort median'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 5. Dataset Explorer Grid
export const DatasetExplorerGridView: React.FC<{ rows: any[]; columns: string[] }> = ({ rows, columns }) => {
  const [page, setPage] = useState(0);
  const pageSize = 20;

  if (!rows || rows.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-darkborder rounded-2xl bg-darkpanel">
        <Icon name="table" className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-xs text-slate-400">No tabular rows available to display.</p>
      </div>
    );
  }

  const paginatedRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(rows.length / pageSize);

  return (
    <div className="space-y-4">
      <div className="bg-darkpanel border border-darkborder rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Dataset Explorer Grid</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Displaying {rows.length.toLocaleString()} total rows across {columns.length} attributes
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg border border-darkborder hover:bg-slate-800 disabled:opacity-40"
          >
            <Icon name="chevron-left" className="w-3.5 h-3.5" />
          </button>
          <span>Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded-lg border border-darkborder hover:bg-slate-800 disabled:opacity-40"
          >
            <Icon name="chevron-right" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="bg-darkpanel border border-darkborder rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-darkborder bg-darksubpanel/70 text-slate-400 text-[11px] uppercase">
                {columns.map(c => (
                  <th key={c} className="p-3 pl-4 font-bold whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-darkborder/50 text-slate-300">
              {paginatedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-darksubpanel/50 transition-colors">
                  {columns.map(c => (
                    <td key={c} className="p-3 pl-4 whitespace-nowrap truncate max-w-[220px]">
                      {String(row[c] != null ? row[c] : '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const renderInlineMarkdown = (text: string, keyPrefix: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key} className="rounded bg-black/30 px-1 py-0.5 font-mono text-cyan-300">{part.slice(1, -1)}</code>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
};

const AssistantMessage: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split(/\r?\n/);

  return (
    <div className="space-y-2 leading-relaxed font-sans text-xs">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={`space-${index}`} className="h-1" />;

        if (trimmed.startsWith('### ')) {
          return <h4 key={index} className="pt-1 text-sm font-bold text-white">{renderInlineMarkdown(trimmed.slice(4), `heading-${index}`)}</h4>;
        }

        if (trimmed.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-400" />
              <span>{renderInlineMarkdown(trimmed.slice(2), `bullet-${index}`)}</span>
            </div>
          );
        }

        return <p key={index} className="m-0">{renderInlineMarkdown(trimmed, `line-${index}`)}</p>;
      })}
    </div>
  );
};

// 6. Artificial Intelligence Analyst Chat View
export const AIAnalystView: React.FC<{
  messages: Array<{
    role: 'user' | 'assistant';
    text: string;
    sql?: string;
    followups?: string[];
    provider?: string;
    duration_ms?: number;
  }>;
  onSendMessage: (msg: string) => void;
  loading: boolean;
  onOpenSettings?: () => void;
  datasetSelected?: boolean;
}> = ({ messages, onSendMessage, loading, onOpenSettings, datasetSelected = true }) => {
  const [input, setInput] = useState('');
  const [copiedSql, setCopiedSql] = useState<string | null>(null);
  const [aiEngineStatus, setAiEngineStatus] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.fetchAIConfig().then(setAiEngineStatus).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleCopySql = (sqlText: string) => {
    navigator.clipboard.writeText(sqlText);
    setCopiedSql(sqlText);
    setTimeout(() => setCopiedSql(null), 2500);
  };

  const quickStarters = [
    '💡 How can I increase profits?',
    '🎯 Where should I concentrate to grow my business?',
    '🏆 What are the top performers?',
    '📊 Summarize this dataset'
  ];

  return (
    <div className="h-[680px] bg-darkpanel border border-darkborder rounded-2xl p-5 flex flex-col justify-between shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-darkborder flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Icon name="sparkles" className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white">InsightAI Analytics Assistant</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                aiEngineStatus?.gemini?.configured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
              }`}>
                {aiEngineStatus?.gemini?.configured ? '⚡ Google Gemini Active' : '💎 Grounded DuckDB Engine'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Zero Arithmetic Hallucination • Verified DuckDB Analytical Calculations
            </p>
          </div>
        </div>

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-darksubpanel hover:bg-slate-800 border border-darkborder text-xs text-indigo-300 hover:text-white transition-colors"
            title="Configure Google Gemini API Key or Models"
          >
            <Icon name="key" className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Key Settings</span>
          </button>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4 pr-1">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl max-w-2xl text-xs space-y-2.5 ${
              m.role === 'user'
                ? 'ml-auto bg-indigo-600 text-white shadow-md'
                : 'mr-auto bg-darksubpanel border border-darkborder text-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between font-semibold text-[10px] uppercase opacity-75">
              <span>{m.role === 'user' ? 'You' : 'InsightAI Business Analyst'}</span>
              {m.duration_ms !== undefined && (
                <span className="font-mono text-[10px] text-cyan-400">
                  {m.duration_ms.toFixed(1)}ms DuckDB
                </span>
              )}
            </div>

            {m.role === 'assistant' ? <AssistantMessage text={m.text} /> : (
              <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">{m.text}</div>
            )}

            {m.sql && (
              <details className="mt-2 rounded-xl border border-darkborder bg-black/20 px-3 py-2">
                <summary className="cursor-pointer text-[10px] text-slate-400">Technical details</summary>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Verified calculation query</span>
                    <button onClick={() => handleCopySql(m.sql!)} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                      {copiedSql === m.sql ? 'Copied' : 'Copy query'}
                    </button>
                  </div>
                  <pre className="p-2.5 rounded-xl bg-black/70 border border-darkborder text-cyan-300 font-mono text-[11px] overflow-x-auto select-all"><code>{m.sql}</code></pre>
                </div>
              </details>
            )}

            {/* Interactive Suggested Followups */}
            {m.followups && m.followups.length > 0 && (
              <div className="pt-2 border-t border-darkborder/50 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Suggested Follow-up Questions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {m.followups.map((f, fIdx) => (
                    <button
                      key={fIdx}
                      onClick={() => !loading && onSendMessage(f)}
                      disabled={loading}
                      className="px-2.5 py-1 rounded-lg bg-darkpanel hover:bg-slate-800 border border-darkborder hover:border-indigo-500/50 text-[11px] text-slate-300 hover:text-white transition-all text-left"
                    >
                      <span>💬 {f}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="mr-auto bg-darksubpanel border border-darkborder p-4 rounded-2xl flex items-center space-x-2.5 text-xs text-slate-300">
            <Icon name="refresh-cw" className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Executing DuckDB analytical vector calculations and generating insights...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Starters (if less than 3 messages) */}
      {messages.length <= 2 && (
        <div className="py-2 flex flex-wrap gap-1.5">
          {quickStarters.map((qs, i) => (
            <button
              key={i}
              onClick={() => !loading && onSendMessage(qs)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-darksubpanel hover:bg-slate-800 border border-darkborder hover:border-indigo-500/40 text-[11px] text-slate-300 hover:text-white transition-all shadow-sm"
            >
              {qs}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="pt-3 border-t border-darkborder flex items-center space-x-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask any analytical question (e.g. 'What are the top 5 products by revenue?', 'Summarize this data')..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-darksubpanel border border-darkborder text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
            disabled={loading || !input.trim() || !datasetSelected}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
        >
          <span>Ask AI</span>
          <Icon name="send" className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
