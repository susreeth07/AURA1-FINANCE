import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { LayoutGrid, Eye, EyeOff, Pin, ChevronUp, ChevronDown, X, Check, GripVertical } from 'lucide-react';

export interface WidgetConfig {
  id: string;
  label: string;
  isVisible: boolean;
  isPinned: boolean;
  order: number;
}

interface DashboardPersonalizationPanelProps {
  widgetConfig: WidgetConfig[];
  onSave: (config: WidgetConfig[]) => void;
  onClose: () => void;
}

export const DashboardPersonalizationPanel = React.memo<DashboardPersonalizationPanelProps>(({
  widgetConfig, onSave, onClose,
}) => {
  const [localConfig, setLocalConfig] = useState<WidgetConfig[]>(() =>
    [...widgetConfig].sort((a, b) => a.order - b.order)
  );

  const toggle = (id: string, field: 'isVisible' | 'isPinned') => {
    setLocalConfig(prev => prev.map(w => w.id === id ? { ...w, [field]: !w[field] } : w));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setLocalConfig(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr.map((w, i) => ({ ...w, order: i }));
    });
  };

  const moveDown = (idx: number) => {
    setLocalConfig(prev => {
      if (idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr.map((w, i) => ({ ...w, order: i }));
    });
  };

  const handleSave = () => {
    const final = localConfig.map((w, i) => ({ ...w, order: i }));
    localStorage.setItem('aura-dashboard-layout', JSON.stringify(final));
    onSave(final);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9980] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Customize Dashboard</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-ring" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto chat-scroll space-y-1.5">
          {localConfig.map((widget, idx) => (
            <div key={widget.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-colors group">
              <GripVertical className="w-4 h-4 text-slate-600 drag-handle flex-shrink-0" />

              <span className="flex-1 text-sm text-slate-200 truncate">{widget.label}</span>

              {widget.isPinned && (
                <span className="text-[9px] font-mono text-amber-400 uppercase">Pinned</span>
              )}

              <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                {/* Reorder */}
                <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 focus-ring" aria-label="Move up">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button onClick={() => moveDown(idx)} disabled={idx === localConfig.length - 1} className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 focus-ring" aria-label="Move down">
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Pin */}
                <button onClick={() => toggle(widget.id, 'isPinned')} className={`p-1 rounded transition-colors focus-ring ${widget.isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`} aria-label={widget.isPinned ? 'Unpin widget' : 'Pin widget'}>
                  <Pin className="w-3 h-3" />
                </button>

                {/* Visibility */}
                <button onClick={() => toggle(widget.id, 'isVisible')} className={`p-1 rounded transition-colors focus-ring ${widget.isVisible ? 'text-indigo-400' : 'text-slate-600'}`} aria-label={widget.isVisible ? 'Hide widget' : 'Show widget'}>
                  {widget.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 p-4 border-t border-white/5">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors focus-ring"
          >
            <Check className="w-4 h-4" /> Save Layout
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 text-sm transition-colors focus-ring"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
});
DashboardPersonalizationPanel.displayName = 'DashboardPersonalizationPanel';
