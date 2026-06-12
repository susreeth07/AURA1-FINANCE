import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, ShieldAlert, Sparkles, AlertCircle, Calendar, 
  ArrowUpRight, Target, Award, BrainCircuit, Landmark, Wallet, Percent, CircleDot 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { IncomeItem, ExpenseItem, BudgetItem, SavingsGoal, BillReminder, UserProfile } from '../../types';

interface DashboardProps {
  profile: UserProfile;
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  budgets: BudgetItem[];
  goals: SavingsGoal[];
  reminders: BillReminder[];
  onNavigate: (view: any) => void;
  onShowSalaryUpdate: () => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  profile, incomes, expenses, budgets, goals, reminders, onNavigate, onShowSalaryUpdate
}) => {
  // 1. Core Financial Card variables
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const currentBalance = totalIncome - totalExpenses;
  const totalSavings = profile.currentSavings;
  
  // Calculate dynamic Health Score (factors liquid savings ratio vs overheads)
  const monthlyFixedOutflow = profile.rent + profile.fixedExpenses + profile.monthlyBills + profile.emiLoans;
  const coverageRatio = monthlyFixedOutflow > 0 ? (totalSavings / monthlyFixedOutflow) : 10;
  const healthScore = Math.min(Math.round((coverageRatio / 6) * 100), 100); // 6 months coverage is 100%

  // 2. Mock static datasets representing trends for professional visual design
  const incomeVsExpenseData = [
    { name: 'Jan', Income: 7200, Expense: 2100 },
    { name: 'Feb', Income: 7200, Expense: 1800 },
    { name: 'Mar', Income: 7500, Expense: 2400 },
    { name: 'Apr', Income: 7500, Expense: 2900 },
    { name: 'May', Income: 7500, Expense: 2700 },
    { name: 'Jun', Income: totalIncome, Expense: totalExpenses },
  ];

  const savingsTrendData = [
    { name: 'Jan', Savings: 12000 },
    { name: 'Feb', Savings: 14500 },
    { name: 'Mar', Savings: 18000 },
    { name: 'Apr', Savings: 20500 },
    { name: 'May', Savings: 22000 },
    { name: 'Jun', Savings: totalSavings },
  ];

  // Category analysis builder
  const categoriesMap: { [key: string]: number } = {};
  expenses.forEach(e => {
    categoriesMap[e.category] = (categoriesMap[e.category] || 0) + e.amount;
  });
  const pieColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#a855f7', '#6b7280'];
  const pieData = Object.keys(categoriesMap).map((cat, idx) => ({
    name: cat,
    value: categoriesMap[cat],
    color: pieColors[idx % pieColors.length]
  }));

  // Predict end of month prediction
  const monthlyPrediction = Math.round(totalIncome * 0.94 - totalExpenses * 0.98);

  return (
    <div className="space-y-8">
      
      {/* HEADER BAR DETAILS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-xl font-extrabold text-white">Quantum Ledger Node</h2>
          <p className="text-xs text-slate-400">Principal email: <span className="font-mono text-indigo-400">{profile.email}</span></p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onShowSalaryUpdate}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-white/10 text-slate-300 hover:text-white bg-white/5 transition-all text-center flex items-center gap-2"
          >
            <Percent className="w-3.5 h-3.5" /> Adjust Salary Index
          </button>
          <button 
            onClick={() => onNavigate('ai')}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <BrainCircuit className="w-3.5 h-3.5" /> Speak Aura AI
          </button>
        </div>
      </div>

      {/* CORE INTENSITY STAT CARDS */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Inflow */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-2xs font-mono uppercase tracking-wider">Total Inflows</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-white">₹{totalIncome.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-400 font-mono mt-2">▲ +14.2% trajectory</p>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-2xs font-mono uppercase tracking-wider">Active Debits</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-black text-white">₹{totalExpenses.toLocaleString()}</p>
          <p className="text-[10px] text-rose-400 font-mono mt-2">▼ Committed overheads</p>
        </div>

        {/* Current Balance */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-2xs font-mono uppercase tracking-wider">Liquid Balance</span>
            <Wallet className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-black text-indigo-400">₹{currentBalance.toLocaleString()}</p>
          <p className="text-[10px] text-indigo-400 font-mono mt-2">Yield buffer secure</p>
        </div>

        {/* Savings */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-2xs font-mono uppercase tracking-wider">Stashed Savings</span>
            <Landmark className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-purple-400">₹{totalSavings.toLocaleString()}</p>
          <p className="text-[10px] text-purple-400 font-mono mt-2">Yield compounds loaded</p>
        </div>

        {/* Health score */}
        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1.5 bg-indigo-500/20 text-indigo-400 rounded-bl-xl">
            <Percent className="w-3.5 h-3.5" />
          </div>
          <span className="text-2xs font-mono text-indigo-400 uppercase tracking-wider mb-2">Aura Health</span>
          <p className="text-2xl font-black text-indigo-400 font-mono">{healthScore}/100</p>
          <p className="text-[10px] text-indigo-300 font-mono mt-2">{healthScore >= 80 ? 'Extremely Resilient' : 'Moderate Safety'}</p>
        </div>
      </div>

      {/* CHARTS LAYER (Income vs Expense, Spending Trend, Savings Growth) */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Main Income vs Expense Recharts (BarChart) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-white/5 bg-slate-900/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-indigo-400">LIQUIDITY TRAJECTORY</p>
              <h3 className="text-base font-bold text-white">Inflows vs Allocations</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
              <span className="inline-flex items-center gap-1.5"><CircleDot className="w-3 h-3 text-indigo-500" /> Income</span>
              <span className="inline-flex items-center gap-1.5"><CircleDot className="w-3 h-3 text-pink-500" /> Expense</span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                <Bar dataKey="Income" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Category allocation Doughnut visualizer */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-white/5 bg-slate-900/30 flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-pink-400 font-bold">NODE ALLOCATIONS</p>
            <h3 className="text-base font-bold text-white mb-6">Committed Spending</h3>
          </div>
          <div className="h-44 w-full relative flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-xs font-mono text-slate-500">No active category data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xs font-mono text-slate-500 uppercase">BURNT</span>
              <span className="text-md font-black text-rose-400 font-mono">₹{totalExpenses}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-3xs font-mono text-slate-400 mt-4 max-h-24 overflow-y-auto">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}></span>
                <span className="truncate">{d.name} (₹{d.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* TREND PATH Area charts & Predictions */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Savings Area growth charting */}
        <div className="lg:col-span-6 p-6 rounded-2xl border border-white/5 bg-slate-900/30">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-white">Stashed Core Growth Curve</h4>
            <span className="text-xs font-mono text-indigo-400">Area Compound index</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savingsTrendData}>
                <defs>
                  <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a' }} />
                <Area type="monotone" dataKey="Savings" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorSavings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prediction Metrics Widget */}
        <div className="lg:col-span-6 grid sm:grid-cols-2 gap-4">
          {/* Monthly prediction widget */}
          <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-2 bg-gradient-to-l from-indigo-500/10 to-transparent">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-1.5 font-bold">MONTHLY QUANT PREDICTION</p>
              <h4 className="text-sm font-bold text-white mb-2">Simulated Yield Surplus</h4>
              <p className="text-2xs text-slate-400">Estimated pocket overflow margin based on current variable velocities.</p>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-black text-white font-mono">₹{monthlyPrediction.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-400 font-mono mt-1">94.8% Resilient Confidence</p>
            </div>
          </div>

          {/* AI Tailored insights snippet widget */}
          <div className="p-6 rounded-2xl border border-indigo-500/10 bg-indigo-950/20 relative overflow-hidden flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest mb-1.5 font-bold">⚡ AI AGENT INSIGHTS</p>
              <p className="text-xs text-slate-200 font-medium italic">
                "Aura flagged a ₹150 optimization path in your entertainment billing limits. Activating this boosts Laptop goal completion by 8 days."
              </p>
            </div>
            <button 
              onClick={() => onNavigate('ai')}
              className="text-xs font-mono font-bold text-indigo-400 hover:text-white underline text-left mt-4"
            >
              Analyze optimization path &gt;
            </button>
          </div>
        </div>

      </div>

      {/* UNDERNEATH ROW: Upcoming Bills & Goals progress widgets */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Goal progression meters */}
        <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/30">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-white">Compound Savings Goals Progress</h4>
            <button onClick={() => onNavigate('goals')} className="text-xs text-indigo-400 underline font-mono">View All</button>
          </div>
          <div className="space-y-4">
            {goals.slice(0, 3).map(goal => {
              const pct = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
              return (
                <div key={goal.id} className="space-y-1.5 p-3 rounded-xl bg-white/[0.01]">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-white">{goal.name}</span>
                    <span className="font-mono text-indigo-400">{pct}% ({goal.currentAmount}/{goal.targetAmount})</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming direct debit reminder widgets */}
        <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/30">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-white">Upcoming Direct Debit Liabilities</h4>
            <span className="text-[10px] font-mono p-1 bg-red-400/10 text-red-400 rounded">RECURRING OUTSTANDING</span>
          </div>
          <div className="space-y-3">
            {reminders.slice(0, 3).map(bill => (
              <div key={bill.id} className="p-3.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${bill.isPaid ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div>
                    <p className="font-bold text-white">{bill.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">Due date: {bill.dueDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-white font-bold">₹{bill.amount}</span>
                  <span className={`px-2 py-0.5 text-[9px] font-mono rounded ${bill.isPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {bill.isPaid ? 'AUTO_SETTLED' : 'PENDING'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
