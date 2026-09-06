import React from 'react';
import Icon from './Icon';

interface OneLakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDomain?: (domain: string) => void;
  onIngestDataset?: (domain: string) => void;
  loading?: boolean;
}

export const OneLakeModal: React.FC<OneLakeModalProps> = ({
  isOpen,
  onClose,
  onSelectDomain,
  onIngestDataset,
  loading = false,
}) => {
  if (!isOpen) return null;

  const handleIngest = (id: string) => {
    if (onSelectDomain) onSelectDomain(id);
    if (onIngestDataset) onIngestDataset(id);
    onClose();
  };

  const catalogItems = [
    {
      id: 'finance',
      title: 'Financial Portfolio Transactions',
      domain: 'Financial Services & Capital Markets',
      rows: '150 records',
      cols: '8 attributes',
      description: 'Asset classes (Equities, Currencies, Real Estate), capital volume, realized profit margins, and clearing fees.',
      icon: '📊',
      color: 'from-amber-500/20 to-amber-600/5',
      borderColor: 'border-amber-500/30',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    },
    {
      id: 'healthcare',
      title: 'Clinical Healthcare Encounters',
      domain: 'Healthcare & Clinical Medicine',
      rows: '120 records',
      cols: '9 attributes',
      description: 'Patient admissions, length of stay, clinical departments, treatment expenditures, and insurance claim approvals.',
      icon: '🏥',
      color: 'from-emerald-500/20 to-emerald-600/5',
      borderColor: 'border-emerald-500/30',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'saas',
      title: 'SaaS Recurring Revenue & Churn',
      domain: 'Cloud Software & Subscriptions',
      rows: '140 records',
      cols: '9 attributes',
      description: 'Monthly recurring revenue (MRR), net expansion, user seats, churn probability scores, and global subscription tiers.',
      icon: '☁️',
      color: 'from-cyan-500/20 to-cyan-600/5',
      borderColor: 'border-cyan-500/30',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    },
    {
      id: 'supply_chain',
      title: 'Supply Chain & Freight Logistics',
      domain: 'Logistics & Global Supply Chain',
      rows: '130 records',
      cols: '9 attributes',
      description: 'Global carrier dispatch, transit lead times, freight values, shipping cost metrics, and on-time delivery ratios.',
      icon: '🚢',
      color: 'from-blue-500/20 to-blue-600/5',
      borderColor: 'border-blue-500/30',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    },
    {
      id: 'hr',
      title: 'Human Resources Workforce Analytics',
      domain: 'People Operations & Workforce',
      rows: '120 records',
      cols: '10 attributes',
      description: 'Workforce departments, tenure, base compensation, performance bonuses, locations, and retention status.',
      icon: '👥',
      color: 'from-purple-500/20 to-purple-600/5',
      borderColor: 'border-purple-500/30',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    },
    {
      id: 'retail',
      title: 'Omnichannel Retail Commerce',
      domain: 'Retail & E-Commerce Commerce',
      rows: '160 records',
      cols: '9 attributes',
      description: 'Customer segments, product categories, sales revenue, operating profit margins, quantities, and discount rates.',
      icon: '🛒',
      color: 'from-rose-500/20 to-rose-600/5',
      borderColor: 'border-rose-500/30',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#12151c] border border-darkborder rounded-3xl p-6 w-full max-w-4xl shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-darkborder">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Icon name="cloud" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>OneLake Data Hub Catalog</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  Cloud Ingestion
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select an enterprise schema to ingest directly into DuckDB in-memory columnar vector store.
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

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {catalogItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border ${item.borderColor} bg-gradient-to-b ${item.color} bg-[#181c26] flex flex-col justify-between hover:border-slate-500 transition-all group`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{item.icon}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${item.badgeColor}`}>
                    {item.rows}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h4>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {item.domain}
                </div>
                <p className="text-xs text-slate-300/80 mt-2 line-clamp-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-darkborder/50 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">{item.cols}</span>
                <button
                  onClick={() => handleIngest(item.id)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors flex items-center space-x-1.5"
                >
                  <span>Ingest Table</span>
                  <Icon name="chevron-right" className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-3 rounded-2xl bg-darksubpanel border border-darkborder flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Zero-latency local DuckDB vectorization • Automatic data profiling &amp; semantic quality auditing</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">FastAPI Ingest</span>
        </div>
      </div>
    </div>
  );
};

export default OneLakeModal;
