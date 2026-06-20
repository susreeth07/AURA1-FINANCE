import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Check, Sliders, HelpCircle, X } from 'lucide-react';

interface AIRecommendationCardProps {
  recommendation: string;
  category?: string;
  confidence?: 'High' | 'Medium' | 'Low';
  onApply?: () => void;
  onCreateBudget?: () => void;
  onIgnore?: () => void;
  onExplain?: () => void;
  onDismiss?: () => void;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  High: 'border-l-emerald-500 text-emerald-400',
  Medium: 'border-l-amber-500 text-amber-400',
  Low: 'border-l-rose-500 text-rose-400',
};
const CONFIDENCE_BADGE: Record<string, string> = {
  High: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Low: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export const AIRecommendationCard = React.memo<AIRecommendationCardProps>(({
  recommendation, category, confidence = 'Medium',
  onApply, onCreateBudget, onIgnore, onExplain, onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => onDismiss?.(), 300);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
          className={`bg-slate-900/50 border border-white/5 border-l-4 ${CONFIDENCE_COLORS[confidence]} rounded-2xl p-4`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10">
                <Lightbulb className="w-4 h-4 text-indigo-400" />
              </div>
              {category && (
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{category}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${CONFIDENCE_BADGE[confidence]}`}>
                {confidence}
              </span>
              <button onClick={handleDismiss} className="p-1 rounded-lg text-slate-500 hover:text-white transition-colors focus-ring" aria-label="Dismiss recommendation">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed mb-4">{recommendation}</p>

          <div className="flex flex-wrap gap-2">
            {onApply && (
              <button onClick={onApply} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors focus-ring">
                <Check className="w-3 h-3" /> Apply
              </button>
            )}
            {onCreateBudget && (
              <button onClick={onCreateBudget} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 transition-colors focus-ring">
                <Sliders className="w-3 h-3" /> Create Budget
              </button>
            )}
            {onExplain && (
              <button onClick={onExplain} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-semibold hover:bg-white/10 transition-colors focus-ring">
                <HelpCircle className="w-3 h-3" /> Explain
              </button>
            )}
            {onIgnore && (
              <button onClick={onIgnore} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold hover:bg-rose-500/20 transition-colors focus-ring">
                <X className="w-3 h-3" /> Ignore
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
AIRecommendationCard.displayName = 'AIRecommendationCard';
