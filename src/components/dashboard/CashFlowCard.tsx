import React, { useMemo } from 'react';
import { ArrowLeftRight, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { IncomeItem, ExpenseItem } from '../../types';

interface CashFlowCardProps {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
}

function buildMonthlyData(incomes: IncomeItem[], expenses: ExpenseItem[]) {
  const months: Record<string, { name: string; Income: number; Expense: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const name = d.toLocaleString('default', { month: 'short' });
    months[key] = { name, Income: 0, Expense: 0 };
  }
  incomes.forEach(item => {
    const d = new Date(item.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (months[key]) months[key].Income += item.amount;
  });
  expenses.forEach(item => {
    const d = new Date(item.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (months[key]) months[key].Expense += item.amount;
  });
  return Object.values(months);
}

const CashFlowTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950/95 border border-white/10 rounded-lg px-2.5 py-2 text-[10px]">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-white">₹{(p.value || 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export const CashFlowCard = React.memo<CashFlowCardProps>(({ incomes, expenses }) => {
  const data = useMemo(() => buildMonthlyData(incomes, expenses), [incomes, expenses]);

  const currentMonth = data[data.length - 1];
  const netFlow = (currentMonth?.Income || 0) - (currentMonth?.Expense || 0);

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <ArrowLeftRight className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Cash Flow</h3>
            <p className="text-[10px] text-slate-400 font-mono">Last 6 months</p>
          </div>
        </div>
        <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-full ${netFlow >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {netFlow >= 0 ? '+' : ''}₹{netFlow.toLocaleString()}
        </span>
      </div>

      <div className="h-20 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CashFlowTooltip />} />
            <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fill="url(#incGrad)" dot={false} />
            <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-mono text-emerald-400 uppercase">In</span>
          </div>
          <p className="text-sm font-bold text-white">₹{(currentMonth?.Income || 0).toLocaleString()}</p>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="w-3 h-3 text-rose-400" />
            <span className="text-[9px] font-mono text-rose-400 uppercase">Out</span>
          </div>
          <p className="text-sm font-bold text-white">₹{(currentMonth?.Expense || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
});
CashFlowCard.displayName = 'CashFlowCard';
