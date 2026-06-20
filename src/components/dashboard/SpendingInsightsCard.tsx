import React, { memo, useMemo } from 'react';
import { BarChart2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ExpenseItem } from '../../types';

interface SpendingInsightsCardProps {
  expenses: ExpenseItem[];
  previousMonthExpenses?: ExpenseItem[];
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

interface CategoryTotal {
  category: string;
  total: number;
  prevTotal: number;
  color: string;
}

function groupByCategory(items: ExpenseItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + item.amount;
    return acc;
  }, {});
}

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-2.5 py-1.5 text-xs font-medium" style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.2)' }}>
      <span className="text-slate-200">{payload[0].name}: </span>
      <span style={{ color: payload[0].payload.color }}>₹{payload[0].value.toLocaleString('en-IN')}</span>
    </div>
  );
};

const SpendingInsightsCard: React.FC<SpendingInsightsCardProps> = ({ expenses, previousMonthExpenses }) => {
  const topCategories = useMemo((): CategoryTotal[] => {
    const current = groupByCategory(expenses);
    const prev = previousMonthExpenses ? groupByCategory(previousMonthExpenses) : {};
    const sorted = Object.entries(current)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
    return sorted.map(([category, total], i) => ({
      category,
      total,
      prevTotal: prev[category] ?? 0,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [expenses, previousMonthExpenses]);

  const pieData = useMemo(() =>
    topCategories.map(c => ({ name: c.category, value: c.total, color: c.color })),
    [topCategories]
  );

  const maxTotal = useMemo(() => Math.max(...topCategories.map(c => c.total), 1), [topCategories]);

  if (expenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="rounded-2xl glass-panel-dark p-5 flex flex-col gap-4"
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">Spending Insights</span>
        </div>
        <div className="flex-1 flex items-center justify-center py-8 text-slate-500 text-sm">No spending data yet</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="rounded-2xl glass-panel-dark p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-semibold text-slate-200 tracking-wide">Spending Insights</span>
      </div>

      <div className="flex gap-4">
        {/* Category bars (left) */}
        <div className="flex-1 flex flex-col gap-3">
          {topCategories.map((cat, i) => {
            const pct = (cat.total / maxTotal) * 100;
            const isHigher = cat.prevTotal > 0 && cat.total > cat.prevTotal;
            const isLower  = cat.prevTotal > 0 && cat.total < cat.prevTotal;
            const isAnomaly = cat.prevTotal > 0 && cat.total > cat.prevTotal * 1.2;
            const trendPct = cat.prevTotal > 0
              ? Math.round(((cat.total - cat.prevTotal) / cat.prevTotal) * 100)
              : null;

            return (
              <div key={cat.category} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs font-medium text-slate-300 truncate">{cat.category}</span>
                    {isAnomaly && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-1.5 py-0 flex-shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5" />⚠
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {trendPct !== null && (
                      <span className={`text-[10px] font-semibold ${isHigher ? 'text-rose-400' : isLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isHigher ? '▲' : isLower ? '▼' : '–'}{Math.abs(trendPct)}%
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-200 font-mono">
                      ₹{cat.total.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                {/* Bar */}
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini pie chart (right) */}
        {pieData.length > 0 && (
          <div className="flex-shrink-0 w-[120px] h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={28} outerRadius={48}
                  dataKey="value"
                  startAngle={90} endAngle={-270}
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} opacity={0.9} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default memo(SpendingInsightsCard);
