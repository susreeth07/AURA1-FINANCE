import React, { useState, useMemo } from 'react';
import { TrendingUp, Check, X as XIcon } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, ReferenceLine } from 'recharts';
import { IncomeItem, ExpenseItem } from '../../types';

interface ForecastCardProps {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  savings: number;
}

function buildForecast(incomes: IncomeItem[], expenses: ExpenseItem[]) {
  const now = new Date();
  const monthTotals: { inc: number[]; exp: number[] } = { inc: [], exp: [] };
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nxt = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inc = incomes.filter(x => new Date(x.date) >= d && new Date(x.date) < nxt).reduce((s, x) => s + x.amount, 0);
    const exp = expenses.filter(x => new Date(x.date) >= d && new Date(x.date) < nxt).reduce((s, x) => s + x.amount, 0);
    monthTotals.inc.push(inc);
    monthTotals.exp.push(exp);
  }
  const avgInc = monthTotals.inc.reduce((s, v) => s + v, 0) / 3 || 0;
  const avgExp = monthTotals.exp.reduce((s, v) => s + v, 0) / 3 || 0;

  const months = ['Next Month', '+2 Months', '+3 Months'];
  return months.map((name, i) => ({
    name,
    Projected: Math.round(avgInc * (i + 1) - avgExp * (i + 1)),
    Income: Math.round(avgInc),
    Expense: Math.round(avgExp),
  }));
}

const ForecastTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950/95 border border-white/10 rounded-lg px-2.5 py-2 text-[10px]">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-white font-bold">₹{(payload[0]?.value || 0).toLocaleString()}</p>
    </div>
  );
};

export const ForecastCard = React.memo<ForecastCardProps>(({ incomes, expenses, savings }) => {
  const [affordItem, setAffordItem] = useState('');
  const [affordAmt, setAffordAmt] = useState('');
  const [affordResult, setAffordResult] = useState<'yes' | 'no' | null>(null);

  const forecastData = useMemo(() => buildForecast(incomes, expenses), [incomes, expenses]);

  const monthlyExpAvg = useMemo(() => {
    const now = new Date();
    let total = 0, count = 0;
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nxt = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const mo = expenses.filter(e => new Date(e.date) >= d && new Date(e.date) < nxt).reduce((s, e) => s + e.amount, 0);
      if (mo > 0) { total += mo; count++; }
    }
    return count > 0 ? total / count : 0;
  }, [expenses]);

  const checkAfford = () => {
    const amt = Number(affordAmt);
    if (!amt) return;
    setAffordResult(savings - amt >= monthlyExpAvg * 3 ? 'yes' : 'no');
  };

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-purple-500/10">
          <TrendingUp className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Financial Forecast</h3>
          <p className="text-[10px] text-slate-400 font-mono">3-month projection</p>
        </div>
      </div>

      <div className="h-24 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={forecastData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ForecastTooltip />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="Projected" stroke="#a855f7" strokeWidth={2.5}
              dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-white/5 pt-3">
        <p className="text-[10px] text-slate-400 mb-2 font-mono">CAN I AFFORD IT?</p>
        <div className="flex gap-2">
          <input
            type="text" placeholder="e.g., MacBook Pro"
            value={affordItem} onChange={e => { setAffordItem(e.target.value); setAffordResult(null); }}
            className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 transition-colors"
          />
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-2 focus-within:border-indigo-500/50 transition-colors">
            <span className="text-xs text-slate-400">₹</span>
            <input
              type="number" placeholder="Amt"
              value={affordAmt} onChange={e => { setAffordAmt(e.target.value); setAffordResult(null); }}
              className="w-20 bg-transparent text-xs text-white outline-none font-mono"
              onKeyDown={e => e.key === 'Enter' && checkAfford()}
            />
          </div>
          <button onClick={checkAfford} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors focus-ring">
            Check
          </button>
        </div>

        {affordResult && (
          <div className={`mt-2 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${affordResult === 'yes' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {affordResult === 'yes' ? <Check className="w-3.5 h-3.5" /> : <XIcon className="w-3.5 h-3.5" />}
            {affordResult === 'yes' ? `You can afford ${affordItem || 'this'}` : `This may strain your finances`}
          </div>
        )}
      </div>
    </div>
  );
});
ForecastCard.displayName = 'ForecastCard';
