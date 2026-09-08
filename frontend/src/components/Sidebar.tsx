import React from 'react';
import Icon from './Icon';
import BrandLogo from './BrandLogo';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
}

interface SidebarProps {
  navItems: NavItem[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  datasetMeta: any;
  datasets: any[];
  activeDatasetId: string;
  onSelectDataset: (id: string) => void;
  onOpenUpload: () => void;
  onOpenAbout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  datasetMeta,
  datasets,
  activeDatasetId,
  onSelectDataset,
  onOpenUpload,
  onOpenAbout
}) => {
  return (
    <aside
      className={`bg-darksidebar border-r border-darkborder flex flex-col justify-between transition-all duration-300 z-30 flex-shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Top */}
      <div>
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-darkborder">
          <BrandLogo collapsed={collapsed} size="sm" onClick={() => onSelectTab('workspace_home')} />

          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg border border-darkborder hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Top Upload Action Button */}
        <div className="p-3 border-b border-darkborder/60">
          <button
            onClick={() => {
              onSelectTab('workspace_home');
              onOpenUpload();
            }}
            className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md hover:shadow-indigo-500/25 text-xs font-bold transition-all duration-200 group ${
              collapsed ? 'px-2' : 'px-3'
            }`}
            title="Upload CSV, Excel, Parquet, or JSON dataset"
          >
            <Icon name="upload-cloud" className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
            {!collapsed && <span>Upload Dataset</span>}
          </button>
        </div>

        {/* Dataset Quick Telemetry */}
        {!collapsed && datasetMeta && (
          <div className="p-3 mx-3 my-3 rounded-xl bg-darkpanel border border-darkborder">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate max-w-[120px]" title={datasetMeta.name}>
                {datasetMeta.name}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                (datasetMeta.healthScore ?? 100) >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                (datasetMeta.healthScore ?? 100) >= 65 ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' :
                (datasetMeta.healthScore ?? 100) >= 50 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                'text-rose-400 bg-rose-500/10 border-rose-500/20'
              }`}>
                {datasetMeta.healthScore ? `${datasetMeta.healthScore}/100` : '100/100'}
              </span>
            </div>
            <div className="text-[10px] text-indigo-300 mt-1 truncate">
              {datasetMeta.domain || 'Financial Services & Banking'}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              {datasetMeta.rows?.toLocaleString() || '150'} rows
            </div>
          </div>
        )}

        {/* Nav Items List */}
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                className={`w-full flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon name={item.icon} className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Switcher */}
      {!collapsed && datasets.length > 0 && (
        <div className="p-3 border-t border-darkborder">
          <label className="block text-[10px] text-slate-500 font-semibold mb-1 uppercase tracking-wider">Switch Dataset</label>
          <select
            value={activeDatasetId}
            onChange={(e) => onSelectDataset(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-darkpanel border border-darkborder text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            {datasets.map(ds => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
