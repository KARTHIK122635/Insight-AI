import React, { useState, useRef } from 'react';
import Icon from '../components/Icon';

export interface DatasetItem {
  id: string;
  name: string;
  rows_count?: number;
  columns_count?: number;
  domain?: string;
  quality_score?: number;
  created_at?: string;
}

interface WorkspaceHomeViewProps {
  datasets: DatasetItem[];
  activeDatasetId: string;
  onSelectDataset: (id: string) => void;
  onUploadFile: (file: File) => void;
  onDeleteDataset: (id: string) => void;
  onOpenStudio: () => void;
  uploading: boolean;
  onOpenMongoModal?: () => void;
  onLoadSampleData?: (domainKey?: string) => void;
  onStartBlankReport?: () => void;
  onOpenOneLake?: () => void;
  onOpenSQLStudio?: () => void;
  onOpenIntro?: () => void;
  onNavigateTab?: (tabId: string) => void;
  mongoStatus?: any;
}

export const WorkspaceHomeView: React.FC<WorkspaceHomeViewProps> = ({
  datasets,
  activeDatasetId,
  onSelectDataset,
  onUploadFile,
  onDeleteDataset,
  onOpenStudio,
  uploading,
  onOpenMongoModal,
  onLoadSampleData,
  onStartBlankReport,
  onOpenOneLake,
  onOpenSQLStudio,
  onOpenIntro,
  onNavigateTab,
  mongoStatus
}) => {
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [recommendedOpen, setRecommendedOpen] = useState(true);
  const [recommendedIndex, setRecommendedIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const excelInputRef = useRef<HTMLInputElement | null>(null);
  const genericInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const recommendedCards = [
    {
      id: 'rec_1',
      category: 'Getting started',
      title: 'Intro—What is InsightAI?',
      description: 'Unified AI-native analytics, DuckDB vector acceleration, and real-time executive dashboard intelligence.',
      iconType: 'diagram'
    },
    {
      id: 'rec_2',
      category: 'What-If Simulation',
      title: 'Real-Time Commercial Modeling',
      description: 'Adjust price, volume, and costs with instantaneous DuckDB vector delta calculations.',
      iconType: 'sliders'
    },
    {
      id: 'rec_3',
      category: 'Spatial Gestures',
      title: 'Figma Physics & 3D Dissection',
      description: 'Organize metrics with freeform spatial desk, swipe gestures, and isometric depth layers.',
      iconType: 'gestures'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-12 select-none text-slate-100 font-sans">
      {/* Hidden File Inputs for Targeted Triggers */}
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onUploadFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />
      <input
        ref={genericInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.parquet,.json"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onUploadFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* HERO UPLOAD ZONE: Prominent Drag & Drop Data Ingestion */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-3xl border-2 transition-all p-8 flex flex-col items-center justify-center text-center group shadow-xl ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/50 scale-[1.01] shadow-indigo-500/20'
            : 'border-darkborder bg-gradient-to-b from-[#131722] via-[#0f121a] to-[#0c0f17] hover:border-indigo-500/50'
        }`}
      >
        <div className="relative z-10 flex flex-col items-center max-w-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" x2="12" y1="3" y2="15"/>
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Upload Your Dataset to Start Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Drag &amp; drop any CSV, Excel, Parquet, or JSON file here for instant DuckDB columnar indexing and dashboard generation.
            </p>
          </div>

          {/* Formats Badges */}
          <div className="flex items-center space-x-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">.CSV</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">.XLSX</span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">.PARQUET</span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">.JSON</span>
          </div>

          {/* Action Trigger */}
          <div className="pt-1">
            {uploading ? (
              <div className="flex items-center space-x-2.5 px-6 py-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 text-xs font-semibold animate-pulse shadow-lg">
                <Icon name="refresh-cw" className="w-4 h-4 text-indigo-400 animate-spin" />
                <span>Ingesting &amp; compiling dataset into DuckDB engine...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => genericInputRef.current?.click()}
                className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center space-x-2 cursor-pointer active:scale-95"
              >
                <Icon name="plus" className="w-4 h-4 text-white" />
                <span>Browse &amp; Upload Data File</span>
              </button>
            )}
          </div>

          {/* Sample dataset quick loaders */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-[11px] text-slate-500">Or quick-start with sample data:</span>
            <button
              type="button"
              onClick={() => onLoadSampleData && onLoadSampleData('retail')}
              className="px-3 py-1 rounded-xl bg-darkpanel hover:bg-slate-800 border border-darkborder hover:border-emerald-500/40 text-slate-300 hover:text-white text-[11px] transition-colors flex items-center space-x-1.5"
            >
              <span>🛍️</span>
              <span>Retail &amp; E-Commerce</span>
            </button>
            <button
              type="button"
              onClick={() => onLoadSampleData && onLoadSampleData('saas')}
              className="px-3 py-1 rounded-xl bg-darkpanel hover:bg-slate-800 border border-darkborder hover:border-blue-500/40 text-slate-300 hover:text-white text-[11px] transition-colors flex items-center space-x-1.5"
            >
              <span>☁️</span>
              <span>B2B SaaS Metrics</span>
            </button>
            <button
              type="button"
              onClick={() => onLoadSampleData && onLoadSampleData('healthcare')}
              className="px-3 py-1 rounded-xl bg-darkpanel hover:bg-slate-800 border border-darkborder hover:border-purple-500/40 text-slate-300 hover:text-white text-[11px] transition-colors flex items-center space-x-1.5"
            >
              <span>🏥</span>
              <span>Healthcare Encounters</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Select a data source or start with a blank report */}
      <div className="space-y-3">
        <button
          onClick={() => setSourcesOpen(!sourcesOpen)}
          className="flex items-center space-x-2 text-sm font-semibold text-slate-200 hover:text-white transition-colors group"
        >
          <span className="text-slate-400 group-hover:text-slate-200 text-xs transition-transform duration-200" style={{ transform: sourcesOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            ▼
          </span>
          <span className="tracking-tight">Select a data source or start with a blank report</span>
        </button>

        {sourcesOpen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* 1. Blank Report */}
            <button
              onClick={onStartBlankReport || onOpenStudio}
              className="p-4 rounded-xl border border-darkborder bg-darkpanel hover:bg-darksubpanel hover:border-slate-600 transition-all flex flex-col items-center justify-center text-center group h-32 shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" x2="8" y1="13" y2="13"/>
                  <line x1="16" x2="8" y1="17" y2="17"/>
                  <line x1="10" x2="8" y1="9" y2="9"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Blank report</span>
            </button>

            {/* 2. Excel Workbook */}
            <button
              onClick={() => excelInputRef.current?.click()}
              className="p-4 rounded-xl border border-darkborder bg-darkpanel hover:bg-darksubpanel hover:border-emerald-500/60 transition-all flex flex-col items-center justify-center text-center group h-32 shadow-sm"
              title="Open Excel Spreadsheet (.xlsx, .xls)"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <line x1="3" x2="21" y1="9" y2="9"/>
                  <line x1="3" x2="21" y1="15" y2="15"/>
                  <line x1="9" x2="9" y1="9" y2="21"/>
                  <line x1="15" x2="15" y1="9" y2="21"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Excel workbook</span>
            </button>

            {/* 3. SQL Studio / DuckDB Engine */}
            <button
              onClick={onOpenSQLStudio || onOpenStudio}
              className="p-4 rounded-xl border border-darkborder bg-darkpanel hover:bg-darksubpanel hover:border-blue-500/60 transition-all flex flex-col items-center justify-center text-center group h-32 shadow-sm"
              title="Open SQL Studio & Run Queries on DuckDB Engine"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
                  <path d="M3 12A9 3 0 0 0 21 12"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">SQL Studio</span>
            </button>

            {/* 4. Learn with Sample Data */}
            <button
              onClick={() => onLoadSampleData && onLoadSampleData('finance')}
              className="p-4 rounded-xl border border-darkborder bg-darkpanel hover:bg-darksubpanel hover:border-purple-500/60 transition-all flex flex-col items-center justify-center text-center group h-32 shadow-sm"
              title="Ingest Financial Portfolio Sample Data"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Sample Data</span>
            </button>

            {/* 5. Upload File (CSV, Parquet, JSON) */}
            <button
              onClick={() => genericInputRef.current?.click()}
              className="p-4 rounded-xl border border-darkborder bg-darkpanel hover:bg-darksubpanel hover:border-indigo-500/60 transition-all flex flex-col items-center justify-center text-center group h-32 shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2 group-hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" x2="12" y1="8" y2="16"/>
                  <line x1="8" x2="16" y1="12" y2="12"/>
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-200 leading-tight">Upload Data File</span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 2: Recommended Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setRecommendedOpen(!recommendedOpen)}
            className="flex items-center space-x-2 text-sm font-semibold text-slate-200 hover:text-white transition-colors group"
          >
            <span className="text-slate-400 group-hover:text-slate-200 text-xs transition-transform duration-200" style={{ transform: recommendedOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
              ▼
            </span>
            <span className="tracking-tight">Recommended</span>
          </button>

          {recommendedOpen && (
            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={() => setRecommendedIndex(Math.max(0, recommendedIndex - 1))}
                disabled={recommendedIndex === 0}
                className="p-1 rounded hover:bg-darksubpanel disabled:opacity-30 transition-colors"
              >
                ‹
              </button>
              <button
                onClick={() => setRecommendedIndex(Math.min(recommendedCards.length - 1, recommendedIndex + 1))}
                disabled={recommendedIndex >= recommendedCards.length - 1}
                className="p-1 rounded hover:bg-darksubpanel disabled:opacity-30 transition-colors"
              >
                ›
              </button>
            </div>
          )}
        </div>

        {recommendedOpen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedCards.map((rec, idx) => (
              <div
                key={rec.id}
                onClick={() => {
                  if (rec.id === 'rec_1') onOpenIntro?.();
                  else if (rec.id === 'rec_2') onNavigateTab?.('what_if');
                  else if (rec.id === 'rec_3') onNavigateTab?.('spatial_gestures');
                }}
                className="p-5 rounded-2xl border border-darkborder bg-darkpanel hover:border-indigo-500/60 transition-all flex flex-col justify-between h-56 shadow-sm cursor-pointer group"
              >
                <div>
                  <span className="text-[11px] font-medium text-slate-400">{rec.category}</span>
                  
                  {/* Central Diagram Illustration exactly matching Power BI reference */}
                  {rec.iconType === 'diagram' && (
                    <div className="my-3 h-24 rounded-xl bg-darksubpanel/70 border border-darkborder flex items-center justify-center relative overflow-hidden group-hover:border-slate-600 transition-colors">
                      <div className="relative w-32 h-20 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs shadow">
                          📊
                        </div>
                        {/* Orbiting mini tool icons connected by dashed ring */}
                        <div className="absolute inset-0 rounded-full border border-dashed border-slate-600/40 pointer-events-none" />
                        <span className="absolute -top-1 left-1/2 -translate-x-1/2 text-[10px]">🌲</span>
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px]">🗄️</span>
                        <span className="absolute top-1/2 -left-1 -translate-y-1/2 text-[10px]">📈</span>
                        <span className="absolute top-1/2 -right-1 -translate-y-1/2 text-[10px]">📁</span>
                      </div>
                    </div>
                  )}

                  {rec.iconType === 'sliders' && (
                    <div className="my-3 h-24 rounded-xl bg-darksubpanel/70 border border-darkborder flex items-center justify-center group-hover:border-slate-600 transition-colors">
                      <div className="space-y-1.5 w-40">
                        <div className="h-1.5 bg-indigo-500/30 rounded-full overflow-hidden">
                          <div className="w-3/4 h-full bg-indigo-500 rounded-full"></div>
                        </div>
                        <div className="h-1.5 bg-cyan-500/30 rounded-full overflow-hidden">
                          <div className="w-1/2 h-full bg-cyan-400 rounded-full"></div>
                        </div>
                        <div className="h-1.5 bg-emerald-500/30 rounded-full overflow-hidden">
                          <div className="w-4/5 h-full bg-emerald-400 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {rec.iconType === 'gestures' && (
                    <div className="my-3 h-24 rounded-xl bg-darksubpanel/70 border border-darkborder flex items-center justify-center group-hover:border-slate-600 transition-colors">
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-cyan-300 border border-cyan-500/30">Desk</span>
                        <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-indigo-300 border border-indigo-500/30">Slide</span>
                        <span className="px-2 py-1 rounded bg-slate-800 text-[10px] font-mono text-purple-300 border border-purple-500/30">3D Depth</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-darkborder/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 flex items-center space-x-1">
                    <span>{rec.title}</span>
                    <span className="text-[10px]">↗</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceHomeView;
