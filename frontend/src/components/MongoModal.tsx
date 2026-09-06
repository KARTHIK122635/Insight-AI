import React, { useState } from 'react';
import Icon from './Icon';
import * as api from '../services/api';

interface MongoModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: any;
  onStatusUpdated: () => void;
  activeDatasetId?: string;
  activeDatasetName?: string;
  onDatasetImported: (datasetId: string) => void;
}

export const MongoModal: React.FC<MongoModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusUpdated,
  activeDatasetId,
  activeDatasetName,
  onDatasetImported
}) => {
  const [tab, setTab] = useState<'connect' | 'import' | 'export'>('connect');
  
  // Connect state
  const [uri, setUri] = useState('');
  const [database, setDatabase] = useState('insight_ai');
  const [connecting, setConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Import state
  const [importCollection, setImportCollection] = useState('');
  const [importDatasetName, setImportDatasetName] = useState('');
  const [importLimit, setImportLimit] = useState(5000);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Export state
  const [exportCollection, setExportCollection] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uri.trim()) return;
    setConnecting(true);
    setConnectMessage(null);
    try {
      const res = await api.connectMongo(uri.trim(), database.trim());
      if (res.status === 'connected') {
        setConnectMessage({ type: 'success', text: `Connected to MongoDB database "${res.database}".` });
      } else {
        setConnectMessage({ type: 'error', text: res.message || 'Could not connect. Operating in standby mode.' });
      }
      onStatusUpdated();
    } catch (err: any) {
      setConnectMessage({ type: 'error', text: err.message || 'Connection attempt failed.' });
    } finally {
      setConnecting(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importCollection.trim()) return;
    setImporting(true);
    setImportMessage(null);
    try {
      const res = await api.importMongoCollection(
        importCollection.trim(),
        importDatasetName.trim() || undefined,
        importLimit
      );
      setImportMessage({ type: 'success', text: res.message });
      onStatusUpdated();
      if (res.dataset_id) {
        setTimeout(() => {
          onDatasetImported(res.dataset_id);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setImportMessage({ type: 'error', text: err.message || 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exportCollection.trim() || !activeDatasetId) return;
    setExporting(true);
    setExportMessage(null);
    try {
      const res = await api.exportMongoDataset(exportCollection.trim(), activeDatasetId);
      setExportMessage({ type: 'success', text: res.message });
      onStatusUpdated();
    } catch (err: any) {
      setExportMessage({ type: 'error', text: err.message || 'Export failed.' });
    } finally {
      setExporting(false);
    }
  };

  const isConnected = status && status.connected;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-darkpanel border border-darkborder rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-darkborder">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
              🍃
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">MongoDB Document Database</h3>
              <p className="text-[11px] text-slate-400">Persistence, collection ingestion &amp; dual-engine syncing</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl border border-darkborder hover:bg-slate-800 text-slate-400 hover:text-slate-200">
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Status Telemetry Card */}
        <div className="p-4 rounded-2xl bg-darksubpanel border border-darkborder flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-xs font-bold text-white">
                {isConnected ? 'MongoDB Active (Connected)' : 'MongoDB Standby (Local Memory)'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Database: <span className="text-slate-200">{status?.database || 'insight_ai'}</span> | Collections: <span className="text-slate-200">{status?.collections_count || 0}</span>
            </div>
          </div>
          <div className="text-[10px] font-mono px-2 py-1 rounded bg-black/40 border border-darkborder text-slate-400 truncate max-w-[150px]">
            {status?.uri || 'Not Configured'}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-darkborder space-x-4 text-xs font-semibold">
          <button
            onClick={() => setTab('connect')}
            className={`pb-2 transition-all ${
              tab === 'connect' ? 'border-b-2 border-emerald-400 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cluster Connection
          </button>
          <button
            onClick={() => setTab('import')}
            className={`pb-2 transition-all ${
              tab === 'import' ? 'border-b-2 border-emerald-400 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Import Collection
          </button>
          <button
            onClick={() => setTab('export')}
            className={`pb-2 transition-all ${
              tab === 'export' ? 'border-b-2 border-emerald-400 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Export to Mongo
          </button>
        </div>

        {/* Tab 1: Connect */}
        {tab === 'connect' && (
          <form onSubmit={handleConnect} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">MongoDB Connection URI</label>
              <input
                type="text"
                value={uri}
                onChange={(e) => setUri(e.target.value)}
                placeholder="mongodb+srv://username:password@cluster.mongodb.net/ or mongodb://localhost:27017"
                className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Supports MongoDB Atlas connection strings or local mongod instances.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Database</label>
              <input
                type="text"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="insight_ai"
                className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {connectMessage && (
              <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                connectMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}>
                <Icon name={connectMessage.type === 'success' ? 'check' : 'alert-triangle'} className="w-4 h-4 flex-shrink-0" />
                <span>{connectMessage.text}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-darkborder text-slate-400 hover:text-slate-200 text-xs font-medium"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={connecting || !uri.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
              >
                {connecting && <Icon name="refresh-cw" className="w-3.5 h-3.5 animate-spin" />}
                <span>{connecting ? 'Connecting...' : 'Connect to MongoDB'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Import */}
        {tab === 'import' && (
          <form onSubmit={handleImport} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Collection Name to Ingest</label>
              <input
                type="text"
                value={importCollection}
                onChange={(e) => setImportCollection(e.target.value)}
                placeholder="e.g. customer_accounts, transactions, device_telemetry"
                className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                BSON documents will be flattened into tabular columns and indexed in DuckDB memory.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Custom Dataset Name (Optional)</label>
                <input
                  type="text"
                  value={importDatasetName}
                  onChange={(e) => setImportDatasetName(e.target.value)}
                  placeholder="e.g. MongoDB Q3 Accounts"
                  className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Limit</label>
                <input
                  type="number"
                  value={importLimit}
                  onChange={(e) => setImportLimit(parseInt(e.target.value) || 5000)}
                  className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {importMessage && (
              <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                importMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}>
                <Icon name={importMessage.type === 'success' ? 'check' : 'alert-triangle'} className="w-4 h-4 flex-shrink-0" />
                <span>{importMessage.text}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-darkborder text-slate-400 hover:text-slate-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={importing || !importCollection.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
              >
                {importing && <Icon name="refresh-cw" className="w-3.5 h-3.5 animate-spin" />}
                <span>{importing ? 'Importing Documents...' : 'Import into DuckDB'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Export */}
        {tab === 'export' && (
          <form onSubmit={handleExport} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-darksubpanel border border-darkborder">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Active Dataset Source</span>
              <span className="text-xs font-bold text-white font-mono mt-0.5 block">
                {activeDatasetName || 'No Dataset Selected'}
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Target MongoDB Collection Name</label>
              <input
                type="text"
                value={exportCollection}
                onChange={(e) => setExportCollection(e.target.value)}
                placeholder="e.g. exported_analytics, executive_summary"
                className="w-full px-3 py-2 rounded-xl bg-darksubpanel border border-darkborder text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {exportMessage && (
              <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                exportMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}>
                <Icon name={exportMessage.type === 'success' ? 'check' : 'alert-triangle'} className="w-4 h-4 flex-shrink-0" />
                <span>{exportMessage.text}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-darkborder text-slate-400 hover:text-slate-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={exporting || !exportCollection.trim() || !activeDatasetId}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow"
              >
                {exporting && <Icon name="refresh-cw" className="w-3.5 h-3.5 animate-spin" />}
                <span>{exporting ? 'Exporting...' : 'Export Dataset to MongoDB'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default MongoModal;
