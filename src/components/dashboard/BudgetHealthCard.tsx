import React, { useMemo } from 'react';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { BudgetItem, ExpenseItem } from '../../types';

interface BudgetHealthCardProps {
  budgets: BudgetItem[];
  expenses: ExpenseItem[];
}

function RadialRing({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 5;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

export const BudgetHealthCard = React.memo<BudgetHealthCardProps>(({ budgets, expenses }) => {
  const budgetData = useMemo(() => {
    return budgets.map(b => {
      const spent = expenses
        .filter(e => e.category.toLowerCase() === b.category.toLowerCase())
        .reduce((sum, e) => sum + e.amount, 0);
      const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;
      const color = pct < 70 ? '#10b981' : pct < 90 ? '#f59e0b' : '#ef4444';
      const alert = pct >= b.alertThreshold;
      return { ...b, spent, pct, color, alert };
    });
  }, [budgets, expenses]);

  const visible = budgetData.slice(0, 6);

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Budget Health</h3>
            <p className="text-[10px] text-slate-400 font-mono">Category utilization</p>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No budgets set</div>
      ) : (
        <div className="space-y-3">
          {visible.map(b => (
            <div key={b.id} className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <RadialRing pct={b.pct} color={b.color} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-mono font-bold text-white">{b.pct}%</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200 truncate">{b.category}</span>
                  {b.alert && (
                    <span className="flex-shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      ALERT
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-slate-500">
                  ₹{b.spent.toLocaleString()} <span className="text-slate-600">/ ₹{b.limit.toLocaleString()}</span>
                </p>
              </div>
              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(b.pct, 100)}%`, background: b.color }} />
              </div>
            </div>
          ))}
          {budgetData.length > 6 && (
            <p className="text-[10px] text-indigo-400 text-center pt-1 cursor-pointer hover:text-indigo-300">
              +{budgetData.length - 6} more <ArrowUpRight className="w-3 h-3 inline" />
            </p>
          )}
        </div>
      )}
    </div>
  );
});
BudgetHealthCard.displayName = 'BudgetHealthCard';
