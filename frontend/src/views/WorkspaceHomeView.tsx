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
  const [activeRecentTab, setActiveRecentTab] = useState<'recent' | 'shared' | 'mongodb'>('recent');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [recommendedIndex, setRecommendedIndex] = useState(0);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'rows' | 'quality'>('recent');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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

  const sharedEnterpriseDatasets = [
    {
      id: 'shared_retail',
      name: 'Retail_Omnichannel_Commerce_Report.csv',
      domain: 'Retail & E-Commerce Commerce',
      created_at: 'Shared by Enterprise Admin',
      rows_count: 160,
      columns_count: 9,
      domain_key: 'retail'
    },
    {
      id: 'shared_saas',
      name: 'Cloud_SaaS_Recurring_Revenue_Metrics.csv',
      domain: 'Cloud Software & Subscriptions',
      created_at: 'Shared by Finance Committee',
      rows_count: 140,
      columns_count: 9,
      domain_key: 'saas'
    },
    {
      id: 'shared_healthcare',
      name: 'Clinical_Treatment_Encounters.csv',
      domain: 'Healthcare & Clinical Medicine',
      created_at: 'Shared by Operations Lead',
      rows_count: 120,
      columns_count: 9,
      domain_key: 'healthcare'
    }
  ];

  const sortedDatasets = [...datasets]
    .filter(d =>
      d.name.toLowerCase().includes(keywordFilter.toLowerCase()) ||
      (d.domain && d.domain.toLowerCase().includes(keywordFilter.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'rows') return (b.rows_count || 0) - (a.rows_count || 0);
      if (sortBy === 'quality') return (b.quality_score || 100) - (a.quality_score || 100);
      return 0; // default recent
    });

  const filteredShared = sharedEnterpriseDatasets.filter(d =>
    d.name.toLowerCase().includes(keywordFilter.toLowerCase()) ||
    d.domain.toLowerCase().includes(keywordFilter.toLowerCase())
  );

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

      {/* SECTION 3: Recent Files & Datasets Table (Matching Power BI) */}
      <div className="space-y-4 pt-2">
        {/* Header Controls: Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-darkborder pb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveRecentTab('recent')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeRecentTab === 'recent'
                  ? 'bg-slate-200 text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-darksubpanel'
              }`}
            >
              <Icon name="refresh-cw" className="w-3 h-3" />
              <span>Recent</span>
            </button>

            <button
              onClick={() => setActiveRecentTab('shared')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeRecentTab === 'shared'
                  ? 'bg-slate-200 text-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-darksubpanel'
              }`}
            >
              <Icon name="network" className="w-3 h-3" />
              <span>Shared with me</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter by keyword"
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-darkpanel border border-darkborder text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 w-48 sm:w-60"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                🔍
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-darkpanel border border-darkborder text-xs text-slate-300 hover:bg-darksubpanel transition-colors"
              >
                <Icon name="filter" className="w-3 h-3 text-slate-400" />
                <span>
                  Filter: {sortBy === 'recent' ? 'Recent' : sortBy === 'name' ? 'Name' : sortBy === 'rows' ? 'Rows' : 'Quality'}
                </span>
                <span className="text-[10px] text-slate-500">▼</span>
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-darkpanel border border-darkborder rounded-xl shadow-xl z-30 py-1.5 text-xs divide-y divide-darkborder/50">
                  <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Sort Datasets
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setSortBy('recent'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-darksubpanel flex items-center justify-between transition-colors ${sortBy === 'recent' ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
                    >
                      <span>Date Accessed (Recent)</span>
                      {sortBy === 'recent' && <span>✓</span>}
                    </button>
                    <button
                      onClick={() => { setSortBy('name'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-darksubpanel flex items-center justify-between transition-colors ${sortBy === 'name' ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
                    >
                      <span>Name (A - Z)</span>
                      {sortBy === 'name' && <span>✓</span>}
                    </button>
                    <button
                      onClick={() => { setSortBy('rows'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-darksubpanel flex items-center justify-between transition-colors ${sortBy === 'rows' ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
                    >
                      <span>Total Rows (High to Low)</span>
                      {sortBy === 'rows' && <span>✓</span>}
                    </button>
                    <button
                      onClick={() => { setSortBy('quality'); setShowFilterDropdown(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-darksubpanel flex items-center justify-between transition-colors ${sortBy === 'quality' ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
                    >
                      <span>Quality Score (High to Low)</span>
                      {sortBy === 'quality' && <span>✓</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area: Datasets List or Illustrated Empty State */}
        {activeRecentTab === 'recent' && (
          sortedDatasets.length > 0 ? (
            <div className="bg-darkpanel border border-darkborder rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-darkborder bg-darksubpanel/70 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="p-3.5 pl-5">Name</th>
                    <th className="p-3.5">Domain / Industry</th>
                    <th className="p-3.5">Date accessed</th>
                    <th className="p-3.5">Storage Engine</th>
                    <th className="p-3.5">Rows &amp; Dimensions</th>
                    <th className="p-3.5 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-darkborder/50 text-slate-300 font-mono">
                  {sortedDatasets.map((ds) => {
                    const isActive = ds.id === activeDatasetId;
                    return (
                      <tr
                        key={ds.id}
                        onClick={() => onSelectDataset(ds.id)}
                        className={`hover:bg-darksubpanel/60 transition-colors cursor-pointer ${
                          isActive ? 'bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="p-3.5 pl-5 font-semibold text-white flex items-center space-x-2.5">
                          <span className="text-base flex-shrink-0">
                            {ds.name.toLowerCase().includes('mongo') ? '🍃' : ds.name.endsWith('.xlsx') || ds.name.endsWith('.xls') ? '📗' : '📄'}
                          </span>
                          <span className="truncate max-w-[240px] font-sans font-bold" title={ds.name}>
                            {ds.name}
                          </span>
                        </td>

                        <td className="p-3.5 font-sans text-slate-300">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] border border-darkborder">
                            {ds.domain || 'Financial Services & Banking'}
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-400 text-[11px]">
                          {ds.created_at || 'Today'}
                        </td>

                        <td className="p-3.5 text-slate-300">
                          <span className="inline-flex items-center space-x-1 text-[11px] text-cyan-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            <span>DuckDB In-Memory</span>
                          </span>
                        </td>

                        <td className="p-3.5 text-slate-400 text-[11px]">
                          {ds.rows_count?.toLocaleString() || '150'} rows × {ds.columns_count || '12'} cols
                        </td>

                        <td className="p-3.5 pr-5 text-right font-sans">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDataset(ds.id);
                                onOpenStudio();
                              }}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                            >
                              Open Report →
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete dataset "${ds.name}"?`)) {
                                  onDeleteDataset(ds.id);
                                }
                              }}
                              className="p-1 rounded hover:text-rose-400 text-slate-500 transition-colors"
                              title="Delete dataset"
                            >
                              <Icon name="trash-2" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Faithful Power BI Illustrated Empty State */
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="relative w-28 h-28 mb-4 flex items-center justify-center">
                <div className="w-24 h-20 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-2xl flex items-center justify-center relative">
                  <div className="w-16 h-10 rounded-xl bg-slate-700/60 border border-slate-600/40 flex items-center justify-center">
                    <div className="flex space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    </div>
                  </div>
                  <span className="absolute -top-3 left-6 text-amber-300 text-base animate-pulse">✦</span>
                  <span className="absolute -top-1 right-5 text-cyan-300 text-xs animate-pulse">✧</span>
                  <span className="absolute -top-4 right-10 text-white text-sm">✦</span>
                </div>
              </div>
              <h4 className="text-base font-bold text-slate-200">No recent files</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Open a report or start by selecting a data source above.
              </p>
            </div>
          )
        )}

        {/* SHARED WITH ME TAB */}
        {activeRecentTab === 'shared' && (
          filteredShared.length > 0 ? (
            <div className="bg-darkpanel border border-darkborder rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-darkborder bg-darksubpanel/70 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="p-3.5 pl-5">Shared Dataset</th>
                    <th className="p-3.5">Domain</th>
                    <th className="p-3.5">Shared By</th>
                    <th className="p-3.5">Schema Size</th>
                    <th className="p-3.5 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-darkborder/50 text-slate-300 font-mono">
                  {filteredShared.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-darksubpanel/60 transition-colors"
                    >
                      <td className="p-3.5 pl-5 font-semibold text-white flex items-center space-x-2.5">
                        <span className="text-base">🌐</span>
                        <span className="truncate max-w-[260px] font-sans font-bold" title={item.name}>
                          {item.name}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans text-slate-300">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] border border-darkborder">
                          {item.domain}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {item.created_at}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {item.rows_count} rows × {item.columns_count} cols
                      </td>
                      <td className="p-3.5 pr-5 text-right font-sans">
                        <button
                          onClick={() => onLoadSampleData && onLoadSampleData(item.domain_key)}
                          className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
                        >
                          Load to Studio →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-xs">
              No matching shared enterprise datasets found.
            </div>
          )
        )}

        {/* MONGODB COLLECTIONS TAB */}
        {activeRecentTab === 'mongodb' && (
          <div className="bg-darkpanel border border-darkborder rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl">
                  🍃
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">MongoDB Cluster Synchronization</h4>
                  <p className="text-xs text-slate-400">
                    Direct live document query and DuckDB columnar memory replication.
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenMongoModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                Configure Cluster Connection
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-darksubpanel/60 border border-darkborder space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Cluster Status</span>
                <p className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{mongoStatus?.connected ? 'Cluster Connected' : 'Ready to Connect'}</span>
                </p>
                <p className="text-[11px] text-slate-500">{mongoStatus?.database || 'analytics_db'}</p>
              </div>

              <div className="p-4 rounded-xl bg-darksubpanel/60 border border-darkborder space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Synced Collections</span>
                <p className="text-sm font-bold text-slate-200">
                  {mongoStatus?.collections?.length || 3} Collections
                </p>
                <p className="text-[11px] text-slate-500">
                  orders, transactions, user_events
                </p>
              </div>

              <div className="p-4 rounded-xl bg-darksubpanel/60 border border-darkborder space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Instant Ingestion</span>
                <button
                  onClick={() => onLoadSampleData && onLoadSampleData('finance')}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-semibold text-center transition-colors"
                >
                  Stream Sample MongoDB Batch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceHomeView;
