import React, { useState } from 'react';
import Icon from './Icon';
import * as api from '../services/api';

interface SQLStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName?: string;
}

export const SQLStudioModal: React.FC<SQLStudioModalProps> = ({
  isOpen,
  onClose,
  datasetName,
}) => {
  const [query, setQuery] = useState('SELECT * FROM dataset LIMIT 15;');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleRunQuery = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const data = await api.executeSQL(query);
      const elapsed = Math.round(performance.now() - start);
      setResults(data);
      setExecTimeMs(elapsed);
    } catch (err: any) {
      setError(err.message || 'SQL execution failed');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    { label: 'Select Top 15', sql: 'SELECT * FROM dataset LIMIT 15;' },
    { label: 'Row Count & Metrics', sql: 'SELECT COUNT(*) AS total_rows FROM dataset;' },
    { label: 'Column Profiling', sql: 'DESCRIBE dataset;' },
    { label: 'Distinct Records', sql: 'SELECT DISTINCT * FROM dataset LIMIT 10;' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151c] border border-darkborder rounded-3xl p-6 w-full max-w-5xl shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-darkborder">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Icon name="database" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>SQL Server &amp; DuckDB Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  OLAP Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Target View: <span className="font-mono text-indigo-300 font-bold">dataset</span> ({datasetName || 'Active Table'})
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

        {/* Query Input Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-300">Quick Templates:</span>
              {sampleQueries.map((q) => (
                <button
                  key={q.label}
                  onClick={() => setQuery(q.sql)}
                  className="px-2.5 py-1 rounded-lg bg-darksubpanel border border-darkborder hover:border-blue-500 text-[11px] text-slate-300 transition-colors"
                >
                  {q.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleRunQuery}
              disabled={loading || !query.trim()}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center space-x-1.5 shadow"
            >
              {loading ? (
                <>
                  <Icon name="refresh-cw" className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Icon name="send" className="w-3.5 h-3.5" />
                  <span>Run SQL Query</span>
                </>
              )}
            </button>
          </div>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            className="w-full font-mono text-xs bg-[#0b0e14] border border-darkborder rounded-2xl p-4 text-emerald-300 focus:outline-none focus:border-blue-500 custom-scrollbar shadow-inner"
            placeholder="Write standard ANSI SQL query (e.g. SELECT * FROM dataset LIMIT 20;)"
          />
        </div>

        {/* Status / Errors */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <Icon name="alert-triangle" className="w-4 h-4 flex-shrink-0" />
            <span className="font-mono">{error}</span>
          </div>
        )}

        {/* Results Grid */}
        {results && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-200">Query Output:</span>
                <span className="font-mono text-emerald-400 font-bold">{results.rows?.length || 0} rows</span>
              </div>
              {execTimeMs !== null && (
                <span className="font-mono text-[11px] text-slate-400">
                  Execution time: <strong className="text-cyan-300">{execTimeMs} ms</strong>
                </span>
              )}
            </div>

            <div className="max-h-72 overflow-auto custom-scrollbar border border-darkborder rounded-2xl bg-[#0b0e14]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-darkborder bg-darksubpanel text-slate-300 sticky top-0">
                    {(results.columns || (results.rows && results.rows[0] ? Object.keys(results.rows[0]) : [])).map((col: string) => (
                      <th key={col} className="p-2.5 font-bold whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-darkborder/50 text-slate-300">
                  {(results.rows || []).map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-slate-800/40">
                      {Object.values(row).map((val: any, cIdx: number) => (
                        <td key={cIdx} className="p-2.5 whitespace-nowrap">
                          {String(val !== null && val !== undefined ? val : 'NULL')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 rounded-2xl bg-darksubpanel border border-darkborder flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>DuckDB columnar OLAP engine with zero-copy vectorized execution</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};

export default SQLStudioModal;
