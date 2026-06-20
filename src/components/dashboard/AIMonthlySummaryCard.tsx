import React, { useState, useCallback, useEffect, memo } from 'react';
import { Sparkles, RotateCcw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuraAI } from '../../ai/AuraAI';

interface AIMonthlySummaryCardProps {
  userId: string;
  month?: string;
}

type LoadState = 'idle' | 'loading' | 'success' | 'error';

interface SummaryData {
  answer: string;
  confidence: { level: 'High' | 'Medium' | 'Low'; score: number };
  insights: readonly string[];
}

function confidenceColor(level: 'High' | 'Medium' | 'Low'): string {
  switch (level) {
    case 'High':   return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25';
    case 'Medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/25';
    case 'Low':    return 'text-rose-400 bg-rose-400/10 border-rose-400/25';
  }
}

const SkeletonLines: React.FC = () => (
  <div className="flex flex-col gap-2.5 py-2">
    <div className="skeleton-text h-3 w-full" />
    <div className="skeleton-text h-3 w-11/12" />
    <div className="skeleton-text h-3 w-4/5" />
  </div>
);

const AIMonthlySummaryCard: React.FC<AIMonthlySummaryCardProps> = ({ userId, month }) => {
  const [state, setState] = useState<LoadState>('idle');
  const [data, setData] = useState<SummaryData | null>(null);

  const runQuery = useCallback(async () => {
    setState('loading');
    setData(null);
    try {
      const monthLabel = month ?? new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      const prompt = `Summarize my financial health for ${monthLabel} in 2-3 sentences. Be concise and actionable.`;
      const res = await AuraAI.query(userId, prompt);
      setData({
        answer: res.answer,
        confidence: res.confidence,
        insights: res.insights.slice(0, 3),
      });
      setState('success');
    } catch {
      setState('error');
    }
  }, [userId, month]);

  useEffect(() => { runQuery(); }, [runQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl glass-panel-dark p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </motion.div>
          <span className="text-sm font-semibold text-slate-200 tracking-wide">Monthly AI Summary</span>
        </div>
        <button
          onClick={runQuery}
          disabled={state === 'loading'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10 transition-colors disabled:opacity-50 focus-ring"
          aria-label="Refresh summary"
        >
          <motion.div
            animate={state === 'loading' ? { rotate: 360 } : { rotate: 0 }}
            transition={state === 'loading' ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </motion.div>
        </button>
      </div>

      {/* Body */}
      <AnimatePresence mode="wait">
        {state === 'loading' || state === 'idle' ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SkeletonLines />
            <div className="flex flex-col gap-2 mt-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-start gap-2">
                  <div className="skeleton w-3 h-3 rounded-full mt-0.5 flex-shrink-0" />
                  <div className="skeleton-text h-3 flex-1" />
                </div>
              ))}
            </div>
          </motion.div>
        ) : state === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-4 text-center"
          >
            <AlertTriangle className="w-8 h-8 text-amber-400/70" />
            <p className="text-sm text-slate-400 leading-relaxed">
              Unable to generate summary.<br />Click to retry.
            </p>
            <button
              onClick={runQuery}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/25 transition-colors focus-ring"
            >
              Retry
            </button>
          </motion.div>
        ) : data ? (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            {/* Confidence badge */}
            <span className={`self-start text-xs font-semibold px-2.5 py-0.5 rounded-full border ${confidenceColor(data.confidence.level)}`}>
              {data.confidence.level} Confidence · {Math.round(data.confidence.score * 100)}%
            </span>

            {/* AI answer */}
            <p className="text-sm text-slate-300 leading-relaxed">{data.answer}</p>

            {/* Insights */}
            {data.insights.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {data.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-indigo-400 mt-0.5 flex-shrink-0">•</span>
                    <span className="leading-relaxed">{insight}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};

export default memo(AIMonthlySummaryCard);
