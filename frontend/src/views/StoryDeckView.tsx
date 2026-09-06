import React, { useEffect, useState } from 'react';
import Icon from '../components/Icon';
import EChartComponent from '../components/EChartComponent';

interface StoryDeckViewProps {
  story: any;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  onExport: () => void;
}

const narrativeLines = (content: string) => content.split(/\r?\n/).map((line, index) => {
  const trimmed = line.trim();
  if (!trimmed) return <div key={index} className="h-2" />;
  const bullet = /^[•*-]\s/.test(trimmed);
  return (
    <div key={index} className={bullet ? 'flex items-start gap-3' : ''}>
      {bullet && <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-cyan-300" />}
      <p className="m-0">{bullet ? trimmed.replace(/^[•*-]\s*/, '') : trimmed}</p>
    </div>
  );
});

export const StoryDeckView: React.FC<StoryDeckViewProps> = ({ story, loading, error, onGenerate, onExport }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sections = story?.sections || [];
  const activeSection = sections[activeIndex];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setActiveIndex(index => Math.max(0, index - 1));
      if (event.key === 'ArrowRight') setActiveIndex(index => Math.min(sections.length - 1, index + 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sections.length]);

  if (loading) {
    return <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-darkborder rounded-3xl bg-darkpanel space-y-4"><Icon name="refresh-cw" className="w-8 h-8 text-indigo-400 animate-spin" /><div><h2 className="text-base font-bold text-white">Building your story deck</h2><p className="text-xs text-slate-400 mt-1">Combining verified insights, narrative, and charts.</p></div></div>;
  }

  if (error) {
    return <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-rose-500/30 rounded-3xl bg-rose-500/5 space-y-4"><Icon name="alert-triangle" className="w-8 h-8 text-rose-400" /><p className="max-w-lg text-xs text-rose-300">{error}</p><button onClick={onGenerate} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white">Try Again</button></div>;
  }

  if (!story || sections.length === 0) {
    return <div className="h-96 flex flex-col items-center justify-center text-center p-8 border border-dashed border-darkborder rounded-3xl bg-darkpanel space-y-4"><Icon name="presentation" className="w-10 h-10 text-indigo-400" /><div><h2 className="text-base font-bold text-white">Create an evidence-backed story</h2><p className="text-xs text-slate-400 mt-1 max-w-md">Turn the active dataset into an eight-part executive narrative.</p></div><button onClick={onGenerate} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white">Generate Story Deck</button></div>;
  }

  const title = activeSection.title.replace(/^\d+\.\s*/, '');

  return (
    <div className="space-y-6">
      <header className="story-deck-hero rounded-3xl border border-indigo-400/20 p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-cyan-300 font-semibold"><span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />Executive narrative · verified dataset evidence</div>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white mt-3">{story.dataset_name || 'Executive Intelligence Story'}</h2>
            <p className="text-sm text-slate-300 mt-3 max-w-2xl">{story.story?.executive_summary || 'A concise, evidence-backed readout of the active dataset.'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0"><button onClick={onGenerate} className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-200 hover:bg-white/10 flex items-center gap-1.5"><Icon name="refresh-cw" className="w-3.5 h-3.5" /> Rebuild</button><button onClick={onExport} className="px-3 py-2 rounded-xl bg-cyan-300 hover:bg-cyan-200 text-xs font-bold text-slate-950 flex items-center gap-1.5"><Icon name="file-text" className="w-3.5 h-3.5" /> Export</button></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">{[['Chapters', sections.length], ['Current lens', activeSection.badge || 'Overview'], ['Evidence mode', 'Deterministic'], ['Domain', story.domain || 'General analytics']].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-black/15 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div><div className="text-sm font-semibold text-white mt-1 truncate">{value}</div></div>)}</div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5 items-start">
        <aside className="bg-darkpanel border border-darkborder rounded-2xl p-3 lg:sticky lg:top-4"><div className="px-3 py-2 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Chapters</div><div className="space-y-1">{sections.map((section: any, index: number) => <button key={section.id || index} onClick={() => setActiveIndex(index)} className={`w-full flex items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${activeIndex === index ? 'bg-indigo-500/15 text-white border border-indigo-400/30' : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><span className={`font-mono text-[10px] mt-0.5 ${activeIndex === index ? 'text-cyan-300' : 'text-slate-600'}`}>{String(index + 1).padStart(2, '0')}</span><span className="text-xs font-semibold leading-4">{section.title.replace(/^\d+\.\s*/, '')}</span></button>)}</div><div className="mt-4 px-3 pt-3 border-t border-darkborder text-[10px] text-slate-500">Use the arrow keys or chapter list to move through the deck.</div></aside>

        <article className="bg-darkpanel border border-darkborder rounded-2xl overflow-hidden"><div className="p-6 md:p-8 border-b border-darkborder bg-gradient-to-br from-indigo-950/35 via-darkpanel to-darkpanel"><div className="flex items-start justify-between gap-4"><div><span className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-semibold">{activeSection.badge}</span><h3 className="text-xl md:text-2xl font-bold text-white mt-2">{title}</h3></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-slate-400">{String(activeIndex + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}</span></div></div>
          <div className="p-6 md:p-8 space-y-7"><div className="max-w-3xl space-y-3 text-[15px] leading-7 text-slate-200">{narrativeLines(activeSection.content)}</div>
            {activeSection.actions_list?.length > 0 && <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{activeSection.actions_list.map((action: string, index: number) => <div key={index} className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"><div className="text-[10px] uppercase tracking-widest text-amber-300">Priority {index + 1}</div><p className="text-xs leading-5 text-slate-200 mt-2">{action}</p></div>)}</div>}
            {activeSection.chart?.options && <div className="rounded-2xl border border-darkborder bg-black/15 p-4 md:p-5"><div className="flex items-center justify-between gap-3 mb-2"><div><div className="text-xs font-semibold text-white">Evidence view</div><div className="text-[11px] text-slate-500">Chart generated from the active dataset</div></div><span className="text-[10px] font-mono text-cyan-300">VERIFIED</span></div><EChartComponent options={activeSection.chart.options} className="chart-box" /></div>}
            <div className="flex items-center justify-between pt-2 border-t border-darkborder"><button disabled={activeIndex === 0} onClick={() => setActiveIndex(index => Math.max(0, index - 1))} className="px-3 py-2 rounded-xl border border-darkborder text-xs text-slate-300 disabled:opacity-30">Previous</button><span className="text-[10px] text-slate-500">Chapter {activeIndex + 1} of {sections.length}</span><button disabled={activeIndex === sections.length - 1} onClick={() => setActiveIndex(index => Math.min(sections.length - 1, index + 1))} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white disabled:opacity-30">Next Chapter</button></div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default StoryDeckView;
