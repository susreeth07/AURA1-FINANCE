import React, { useMemo } from 'react';
import { Target, CheckCircle2, Clock } from 'lucide-react';
import { SavingsGoal } from '../../types';

interface GoalProgressCardProps {
  goals: SavingsGoal[];
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function monthsUntil(dateStr: string): number {
  return Math.max(0.5, daysUntil(dateStr) / 30);
}

export const GoalProgressCard = React.memo<GoalProgressCardProps>(({ goals }) => {
  const goalData = useMemo(() => goals.slice(0, 4).map(g => {
    const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
    const days = daysUntil(g.targetDate);
    const months = monthsUntil(g.targetDate);
    const remaining = Math.max(0, g.targetAmount - g.currentAmount);
    const monthly = months > 0 ? Math.ceil(remaining / months) : 0;
    const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
    const complete = pct >= 100;
    return { ...g, pct, days, monthly, color, complete };
  }), [goals]);

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-indigo-500/10">
          <Target className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Goal Progress</h3>
          <p className="text-[10px] text-slate-400 font-mono">{goals.length} active goal{goals.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {goalData.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No savings goals</div>
      ) : (
        <div className="space-y-4">
          {goalData.map(g => (
            <div key={g.id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  {g.complete ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.color }} />
                  )}
                  <span className="text-xs font-medium text-slate-200 truncate max-w-[120px]">{g.name}</span>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-[10px] font-mono text-slate-400">
                    ₹{g.currentAmount.toLocaleString()}<span className="text-slate-600"> / ₹{g.targetAmount.toLocaleString()}</span>
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${g.pct}%`, background: g.complete ? 'linear-gradient(90deg, #10b981, #059669)' : g.color }}
                />
              </div>
              {!g.complete && (
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                    <Clock className="w-2.5 h-2.5" />
                    {g.days} days left
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">₹{g.monthly.toLocaleString()}/mo needed</span>
                </div>
              )}
              {g.complete && (
                <p className="text-[9px] font-mono text-emerald-400 mt-1">✓ Goal achieved!</p>
              )}
            </div>
          ))}
          {goals.length > 4 && (
            <p className="text-[10px] text-slate-500 text-center">+{goals.length - 4} more goals</p>
          )}
        </div>
      )}
    </div>
  );
});
GoalProgressCard.displayName = 'GoalProgressCard';
