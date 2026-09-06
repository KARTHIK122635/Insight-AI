import React, { useState, useRef } from 'react';
import Icon from '../components/Icon';

interface SpatialGestureStudioViewProps {
  datasetMeta: any;
  activeDatasetId: string;
}

export const SpatialGestureStudioView: React.FC<SpatialGestureStudioViewProps> = () => {
  const [activeTemplate, setActiveTemplate] = useState<'spatial_desk' | 'slide_gestures' | 'pinch_explode' | 'radial_orbit'>('spatial_desk');
  const [deviceViewport, setDeviceViewport] = useState<'laptop' | 'mobile'>('laptop');

  // Template 1: Spatial Desk state
  const [deskCards, setDeskCards] = useState([
    { id: 'card_1', title: 'Executive Sales Velocity', value: '$1,842,500', trend: '+14.2% YoY', x: 40, y: 30, color: 'border-cyan-500/40 bg-cyan-950/20 shadow-cyan-900/20' },
    { id: 'card_2', title: 'Customer Churn Risk', value: '2.4% Optimal', trend: '-0.8% variance', x: 380, y: 50, color: 'border-indigo-500/40 bg-indigo-950/20 shadow-indigo-900/20' },
    { id: 'card_3', title: 'DuckDB Columnar Scan', value: '1.4ms Latency', trend: 'SIMD Optimized', x: 200, y: 220, color: 'border-emerald-500/40 bg-emerald-950/20 shadow-emerald-900/20' }
  ]);
  const [draggingCard, setDraggingCard] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Template 2: Slide Gestures state
  const [slideCards, setSlideCards] = useState([
    { id: 'sc_1', title: 'High Margin Revenue Cluster #1042', status: 'Healthy Run', records: '48,290 Rows', offset: 0 },
    { id: 'sc_2', title: 'Outlier Detection in APAC', status: '3 Anomalies Flagged', records: '+340% Deviation', offset: 0 },
    { id: 'sc_3', title: 'Forecast Checkpoint Q3', status: 'Slope +12.4', records: '95% Confidence Band', offset: 0 },
  ]);

  // Template 3: Pinch & Explode state
  const [explodeDistance, setExplodeDistance] = useState(65);

  // Template 4: Radial Orbit state
  const [radialActive, setRadialActive] = useState(false);
  const radialItems = [
    { id: 'r_copilot', label: 'AI Copilot', icon: 'sparkles', color: 'text-emerald-400 border-emerald-500/40' },
    { id: 'r_deck', label: 'Snapshot Deck', icon: 'presentation', color: 'text-rose-400 border-rose-500/40' },
    { id: 'r_kpi', label: 'KPI Telemetry', icon: 'trending-up', color: 'text-cyan-400 border-cyan-500/40' },
    { id: 'r_whatif', label: 'What-If Slicer', icon: 'sliders', color: 'text-indigo-400 border-indigo-500/40' },
    { id: 'r_forecast', label: 'Trend Forecast', icon: 'trending-up', color: 'text-purple-400 border-purple-500/40' },
    { id: 'r_sql', label: 'DuckDB SQL', icon: 'binary', color: 'text-amber-400 border-amber-500/40' }
  ];

  // Drag handlers for Spatial Desk
  const handlePointerDown = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    setDraggingCard(id);
    const card = deskCards.find(c => c.id === id);
    if (card) {
      dragOffset.current = {
        x: e.clientX - card.x,
        y: e.clientY - card.y
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingCard) return;
    const newX = Math.max(10, Math.min(650, e.clientX - dragOffset.current.x));
    const newY = Math.max(10, Math.min(380, e.clientY - dragOffset.current.y));
    setDeskCards(prev => prev.map(c => c.id === draggingCard ? { ...c, x: newX, y: newY } : c));
  };

  const handlePointerUp = () => {
    setDraggingCard(null);
  };

  const toggleSlideCard = (id: string) => {
    setSlideCards(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, offset: c.offset === -140 ? 0 : -140 };
      }
      return c;
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Navigation */}
      <div className="bg-darkpanel border border-darkborder rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-darkborder">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h2 className="text-lg font-bold text-white tracking-tight">Spatial Gesture Studio</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase">
                Figma Template System
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Physics-driven interactive templates: Spatial Desk, Slide Gestures, Pinch &amp; Explode, and Radial Orbit
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            {/* Viewport switcher */}
            <div className="flex items-center bg-darksubpanel border border-darkborder rounded-xl p-1">
              <button
                onClick={() => setDeviceViewport('laptop')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  deviceViewport === 'laptop' ? 'bg-slate-800 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon name="monitor" className="w-3.5 h-3.5" />
                <span>Laptop Canvas</span>
              </button>
              <button
                onClick={() => setDeviceViewport('mobile')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  deviceViewport === 'mobile' ? 'bg-slate-800 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon name="smartphone" className="w-3.5 h-3.5" />
                <span>Mobile Handset</span>
              </button>
            </div>

            <button
              onClick={() => {
                setDeskCards([
                  { id: 'card_1', title: 'Executive Sales Velocity', value: '$1,842,500', trend: '+14.2% YoY', x: 40, y: 30, color: 'border-cyan-500/40 bg-cyan-950/20 shadow-cyan-900/20' },
                  { id: 'card_2', title: 'Customer Churn Risk', value: '2.4% Optimal', trend: '-0.8% variance', x: 380, y: 50, color: 'border-indigo-500/40 bg-indigo-950/20 shadow-indigo-900/20' },
                  { id: 'card_3', title: 'DuckDB Columnar Scan', value: '1.4ms Latency', trend: 'SIMD Optimized', x: 200, y: 220, color: 'border-emerald-500/40 bg-emerald-950/20 shadow-emerald-900/20' }
                ]);
                setSlideCards(prev => prev.map(c => ({ ...c, offset: 0 })));
                setExplodeDistance(65);
                setRadialActive(false);
              }}
              className="px-3 py-1.5 rounded-xl border border-darkborder bg-darksubpanel hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors flex items-center space-x-1.5"
            >
              <Icon name="refresh-cw" className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Canvas</span>
            </button>
          </div>
        </div>

        {/* 4 Template Navigation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <button
            onClick={() => setActiveTemplate('spatial_desk')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTemplate === 'spatial_desk'
                ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-400/30 text-white'
                : 'border-darkborder bg-darksubpanel/60 text-slate-400 hover:text-slate-200 hover:bg-darksubpanel'
            }`}
          >
            <div className="flex items-center justify-between">
              <Icon name="move" className={`w-4 h-4 ${activeTemplate === 'spatial_desk' ? 'text-cyan-400' : 'text-slate-500'}`} />
              {activeTemplate === 'spatial_desk' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
            </div>
            <div className="text-xs font-bold mt-2">Spatial Desk</div>
            <div className="text-[10px] text-slate-500">Hold &amp; Drag Physics</div>
          </button>

          <button
            onClick={() => setActiveTemplate('slide_gestures')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTemplate === 'slide_gestures'
                ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-400/30 text-white'
                : 'border-darkborder bg-darksubpanel/60 text-slate-400 hover:text-slate-200 hover:bg-darksubpanel'
            }`}
          >
            <div className="flex items-center justify-between">
              <Icon name="sliders" className={`w-4 h-4 ${activeTemplate === 'slide_gestures' ? 'text-cyan-400' : 'text-slate-500'}`} />
              {activeTemplate === 'slide_gestures' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
            </div>
            <div className="text-xs font-bold mt-2">Slide Gestures</div>
            <div className="text-[10px] text-slate-500">Swipe Left Actions</div>
          </button>

          <button
            onClick={() => setActiveTemplate('pinch_explode')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTemplate === 'pinch_explode'
                ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-400/30 text-white'
                : 'border-darkborder bg-darksubpanel/60 text-slate-400 hover:text-slate-200 hover:bg-darksubpanel'
            }`}
          >
            <div className="flex items-center justify-between">
              <Icon name="layers" className={`w-4 h-4 ${activeTemplate === 'pinch_explode' ? 'text-cyan-400' : 'text-slate-500'}`} />
              {activeTemplate === 'pinch_explode' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
            </div>
            <div className="text-xs font-bold mt-2">Pinch &amp; Explode</div>
            <div className="text-[10px] text-slate-500">3D Layer Depth</div>
          </button>

          <button
            onClick={() => setActiveTemplate('radial_orbit')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTemplate === 'radial_orbit'
                ? 'border-cyan-500/60 bg-cyan-950/20 ring-1 ring-cyan-400/30 text-white'
                : 'border-darkborder bg-darksubpanel/60 text-slate-400 hover:text-slate-200 hover:bg-darksubpanel'
            }`}
          >
            <div className="flex items-center justify-between">
              <Icon name="radio" className={`w-4 h-4 ${activeTemplate === 'radial_orbit' ? 'text-cyan-400' : 'text-slate-500'}`} />
              {activeTemplate === 'radial_orbit' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>}
            </div>
            <div className="text-xs font-bold mt-2">Radial Orbit</div>
            <div className="text-[10px] text-slate-500">Hold to Spin Menu</div>
          </button>
        </div>
      </div>

      {/* Main Interactive Workspace (Laptop Canvas vs Mobile Handset) */}
      <div className={`transition-all duration-300 flex justify-center ${deviceViewport === 'mobile' ? 'py-4' : ''}`}>
        <div className={deviceViewport === 'mobile' ? 'w-full max-w-[390px] border-[6px] border-slate-700 rounded-[44px] overflow-hidden shadow-2xl bg-black relative p-4 min-h-[640px]' : 'w-full'}>
          {deviceViewport === 'mobile' && (
            <div className="flex justify-between items-center px-4 py-2 border-b border-darkborder/50 text-[10px] font-mono text-slate-400 mb-4">
              <span>9:41</span>
              <div className="w-16 h-3.5 bg-slate-800 rounded-full"></div>
              <span>5G</span>
            </div>
          )}

          {/* TEMPLATE 1: Spatial Desk */}
          {activeTemplate === 'spatial_desk' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Template 01: Spatial Desk — Hold &amp; Drag to Organize
                </div>
                <div className="text-[10px] font-mono text-slate-500 bg-darkpanel px-2 py-0.5 rounded border border-darkborder">
                  Snap Physics: Active
                </div>
              </div>

              <div
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative w-full h-[460px] bg-black/80 rounded-2xl border border-darkborder overflow-hidden select-none touch-none"
                style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, #222226 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }}
              >
                {deskCards.map(c => {
                  const isDragged = draggingCard === c.id;
                  return (
                    <div
                      key={c.id}
                      onPointerDown={(e) => handlePointerDown(c.id, e)}
                      style={{
                        position: 'absolute',
                        left: `${c.x}px`,
                        top: `${c.y}px`,
                        cursor: isDragged ? 'grabbing' : 'grab',
                        transform: isDragged ? 'scale(1.05)' : 'scale(1)',
                        zIndex: isDragged ? 50 : 10,
                        transition: isDragged ? 'none' : 'box-shadow 0.2s, border-color 0.2s'
                      }}
                      className={`p-4 rounded-2xl border ${c.color} backdrop-blur-md shadow-xl select-none w-56 flex flex-col justify-between`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">[Drag]</span>
                        <span className="text-[9px] font-mono text-cyan-400">Snap Aligned</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200 mt-2">{c.title}</div>
                      <div className="text-xl font-bold font-mono text-white mt-1">{c.value}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-2 flex justify-between">
                        <span>{c.trend}</span>
                        <span>X:{c.x} Y:{c.y}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TEMPLATE 2: Slide Gestures */}
          {activeTemplate === 'slide_gestures' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Template 02: Slide Gestures — Swipe Left to Expose Nodes
                </div>
                <div className="text-[10px] font-mono text-slate-500 bg-darkpanel px-2 py-0.5 rounded border border-darkborder">
                  Swipe Threshold: 60px
                </div>
              </div>

              <div className="space-y-3">
                {slideCards.map(sc => (
                  <div key={sc.id} className="relative overflow-hidden rounded-2xl border border-darkborder bg-darkpanel">
                    {/* Underlying Quick Actions */}
                    <div className="absolute inset-y-0 right-0 w-[140px] flex items-center justify-end px-3 space-x-2 bg-darksubpanel">
                      <button className="w-8 h-8 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white flex items-center justify-center shadow">
                        <Icon name="pin" className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-8 h-8 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white flex items-center justify-center shadow">
                        <Icon name="filter" className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-8 h-8 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white flex items-center justify-center shadow">
                        <Icon name="trash-2" className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Sliding Surface */}
                    <div
                      onClick={() => toggleSlideCard(sc.id)}
                      style={{
                        transform: `translateX(${sc.offset}px)`,
                        transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
                      }}
                      className="relative z-10 p-4 bg-darkpanel hover:bg-darksubpanel cursor-pointer flex items-center justify-between select-none"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-slate-500">#{sc.id.split('_')[1]}</span>
                          <span className="text-xs font-semibold text-slate-200">{sc.title}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{sc.status}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-1">{sc.records}</div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {sc.offset < 0 ? (
                          <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded-lg">
                            Tap to Close
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 border border-darkborder px-2 py-1 rounded-lg">
                            Swipe Left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 px-2">
                <span>Swipe or click any card to expose underlying action buttons</span>
                <button onClick={() => setSlideCards(prev => prev.map(c => ({ ...c, offset: 0 })))} className="hover:text-cyan-400">
                  Reset All Cards
                </button>
              </div>
            </div>
          )}

          {/* TEMPLATE 3: Pinch & Explode */}
          {activeTemplate === 'pinch_explode' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Template 03: Pinch &amp; Explode — Spread to Dissect Depth
                </div>
                <div className="text-[10px] font-mono text-slate-500 bg-darkpanel px-2 py-0.5 rounded border border-darkborder">
                  Parallax Zoom: 2.4x
                </div>
              </div>

              {/* Slider for explosion distance */}
              <div className="flex items-center space-x-4 bg-darkpanel border border-darkborder p-3 rounded-xl">
                <span className="text-xs font-mono text-slate-400 flex-shrink-0">Explode Separation:</span>
                <input
                  type="range"
                  min="0"
                  max="120"
                  value={explodeDistance}
                  onChange={(e) => setExplodeDistance(parseInt(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-purple-400 w-12 text-right">{explodeDistance}px</span>
                <button
                  onClick={() => setExplodeDistance(explodeDistance === 0 ? 80 : 0)}
                  className="px-2.5 py-1 rounded-lg bg-darksubpanel border border-darkborder text-[11px] font-mono text-slate-300 hover:text-white"
                >
                  {explodeDistance === 0 ? 'Explode' : 'Collapse'}
                </button>
              </div>

              {/* 3D Perspective Isometric Canvas */}
              <div
                className="w-full h-[400px] bg-black/90 rounded-2xl border border-darkborder flex items-center justify-center overflow-hidden relative select-none"
                style={{ perspective: '900px' }}
              >
                <div
                  style={{
                    transform: 'rotateX(55deg) rotateZ(-30deg)',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.3s ease'
                  }}
                  className="relative w-72 h-44"
                >
                  {/* Layer 3: Presentation Deck */}
                  <div
                    style={{
                      transform: `translateZ(${explodeDistance * 2}px)`,
                      transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    className="absolute inset-0 rounded-2xl border border-cyan-500/60 bg-cyan-950/40 backdrop-blur-md p-4 shadow-2xl flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase">L3 — Executive Presentation</span>
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Executive Revenue Velocity</div>
                      <div className="text-lg font-bold font-mono text-cyan-300">$2,418,920</div>
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">+18.4% Lift</div>
                  </div>

                  {/* Layer 2: Aggregated Metrics */}
                  <div
                    style={{
                      transform: `translateZ(${explodeDistance}px)`,
                      transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    className="absolute inset-0 rounded-2xl border border-dashed border-indigo-500/50 bg-indigo-950/30 backdrop-blur-sm p-4 shadow-xl flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase">L2 — Analytical Aggregation</span>
                      <span className="text-[9px] font-mono text-indigo-400">SUM / GROUP BY</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-300">
                      Aggregated 14 dimensions into 6 executive summary nodes
                    </div>
                    <div className="text-[9px] font-mono text-indigo-400">Zero arithmetic variance</div>
                  </div>

                  {/* Layer 1: DuckDB Columnar Base */}
                  <div
                    style={{
                      transform: 'translateZ(0px)',
                      transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}
                    className="absolute inset-0 rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4 shadow-lg flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-purple-300 uppercase">L1 — DuckDB Columnar Storage</span>
                      <span className="text-[9px] font-mono text-purple-400">C++ Engine</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Raw Ingested Tuples: Arrow Table IPC in Memory
                    </div>
                    <div className="text-[9px] font-mono text-purple-300">Thread Count: 8 Cores</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TEMPLATE 4: Radial Orbit */}
          {activeTemplate === 'radial_orbit' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Template 04: Radial Orbit — Hold Down to Spin Up Satellites
                </div>
                <div className="text-[10px] font-mono text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/30">
                  Orbital Frequency: 1.2 rad/s
                </div>
              </div>

              <div className="relative w-full h-[400px] bg-black/90 rounded-2xl border border-darkborder flex items-center justify-center overflow-hidden select-none">
                {/* Orbital Ring Guide */}
                <div
                  className={`absolute w-72 h-72 rounded-full border border-dashed border-slate-700/50 transition-all duration-500 ${
                    radialActive ? 'scale-100 opacity-100' : 'scale-75 opacity-30'
                  }`}
                />

                {/* Satellite Nodes */}
                {radialItems.map((item, idx) => {
                  const angle = (idx / radialItems.length) * (2 * Math.PI);
                  const radius = radialActive ? 135 : 0;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;

                  return (
                    <div
                      key={item.id}
                      style={{
                        transform: `translate(${x}px, ${y}px)`,
                        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
                        opacity: radialActive ? 1 : 0,
                        pointerEvents: radialActive ? 'auto' : 'none'
                      }}
                      className={`absolute p-2.5 rounded-xl border bg-darksubpanel/90 backdrop-blur-md flex items-center space-x-2 shadow-xl ${item.color}`}
                    >
                      <Icon name={item.icon} className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold text-slate-200 whitespace-nowrap">{item.label}</span>
                    </div>
                  );
                })}

                {/* Central Trigger Hub */}
                <button
                  onClick={() => setRadialActive(!radialActive)}
                  className={`w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center shadow-2xl transition-all cursor-pointer relative z-20 ${
                    radialActive
                      ? 'border-amber-400 bg-amber-950/40 text-amber-300 scale-105 shadow-amber-900/30'
                      : 'border-slate-700 bg-darkpanel text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                    {radialActive ? '[HOLD]' : '[PRESS]'}
                  </span>
                  <span className="text-[11px] font-bold mt-0.5">
                    {radialActive ? 'SPUN UP' : 'HOLD'}
                  </span>
                  <div className={`w-3 h-1 rounded-full mt-1 ${radialActive ? 'bg-amber-400' : 'bg-slate-600'}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpatialGestureStudioView;
