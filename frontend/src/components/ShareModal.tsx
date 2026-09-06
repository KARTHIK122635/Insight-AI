import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import * as api from '../services/api';

interface ShareModalProps {
  datasetId: string;
  datasetName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  datasetId,
  datasetName,
  isOpen,
  onClose,
}) => {
  const [permission, setPermission] = useState<'view' | 'editor'>('view');
  const [label, setLabel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeShares, setActiveShares] = useState<any[]>([]);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing share links for this dataset
  const loadShares = async () => {
    if (!datasetId) return;
    try {
      const res = await api.listDatasetShares(datasetId);
      setActiveShares(res.shares || []);
    } catch {
      // Not owner or error
      setActiveShares([]);
    }
  };

  useEffect(() => {
    if (isOpen && datasetId) {
      loadShares();
      setGeneratedLink(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen, datasetId]);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.createShareLink(datasetId, permission, label.trim() || undefined);
      const origin = window.location.origin;
      const fullUrl = `${origin}/?share=${res.share_token}`;
      setGeneratedLink(fullUrl);
      setLabel('');
      await loadShares();
    } catch (err: any) {
      setError(err.message || 'Failed to generate share link.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevoke = async (token: string) => {
    try {
      await api.revokeShareLink(token);
      await loadShares();
      if (generatedLink && generatedLink.includes(token)) {
        setGeneratedLink(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to revoke link.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Icon name="share-2" className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Share Dataset</h3>
              <p className="text-xs text-slate-400 truncate max-w-[340px]">{datasetName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-600/40 text-rose-300 flex items-center gap-2">
              <Icon name="alert-triangle" className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Access Permission Selector */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-medium">Select Access Permission Level</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPermission('view')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  permission === 'view'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                    <span>👁️</span> Viewer
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Read-Only</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Recipients can explore executive dashboards, view KPIs, and run AI queries without modifying the data.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPermission('editor')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  permission === 'editor'
                    ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                    <span>✏️</span> Editor
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">Collaborative</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Recipients can perform data cleaning, apply transforms, run what-if simulations, and build custom charts.
                </p>
              </button>
            </div>
          </div>

          {/* Optional Label Input & Generate Button */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Optional label (e.g. Q3 Finance Review)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
            />
            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icon name="link" className="w-3.5 h-3.5" />
              )}
              <span>Create Share Link</span>
            </button>
          </div>

          {/* Newly Generated Link Display */}
          {generatedLink && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <Icon name="check-circle" className="w-3.5 h-3.5" />
                  Link ready to share ({permission.toUpperCase()})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-300 select-all focus:outline-none"
                />
                <button
                  onClick={() => handleCopyLink(generatedLink)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  <Icon name={copied ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Existing Active Share Links */}
          {activeShares.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-slate-400 font-medium block">Active Share Links for this Dataset</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {activeShares.map((s) => {
                  const url = `${window.location.origin}/?share=${s.share_token}`;
                  return (
                    <div
                      key={s.share_token}
                      className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded uppercase font-semibold ${
                              s.permission === 'editor'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {s.permission}
                          </span>
                          <span className="text-slate-300 font-medium truncate">
                            {s.label || 'Share Link'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{url}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleCopyLink(url)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Copy Link"
                        >
                          <Icon name="copy" className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRevoke(s.share_token)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition-colors"
                          title="Revoke Link"
                        >
                          <Icon name="trash-2" className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enterprise Privacy Note */}
          <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-800/80 flex items-start gap-2">
            <Icon name="shield" className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
            <span>
              <strong>Private & Scoped:</strong> Only users with this link will have access. Their activity will be authenticated with their personal Google identity under the permission level you set.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
