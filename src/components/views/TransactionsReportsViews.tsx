import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, ArrowUpDown, ChevronRight, Eye, X, 
  BarChart, Wallet, CreditCard, DollarSign, ArrowUpRight, TrendingUp, Sparkles, Download 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart as ReBarChart, Bar, LineChart as ReLineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend 
} from 'recharts';
import { IncomeItem, ExpenseItem, BudgetItem } from '../../types';
import { AuraAI } from '../../ai/AuraAI';

interface ViewProps {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  budgets: BudgetItem[];
  userId?: string;
}

export const TransactionsPanel: React.FC<ViewProps> = ({ incomes, expenses }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  // Unify datasets to standard interface
  const unifiedTx = [
    ...incomes.map(inc => ({
      id: inc.id,
      title: inc.source,
      amount: inc.amount,
      type: 'inflow' as const,
      category: inc.category,
      date: inc.date,
      description: inc.description || 'No direct descriptors added.',
      isRecurring: inc.isRecurring
    })),
    ...expenses.map(exp => ({
      id: exp.id,
      title: exp.merchant,
      amount: exp.amount,
      type: 'outflow' as const,
      category: exp.category,
      date: exp.date,
      description: exp.description || 'No direct descriptors added.',
      isRecurring: exp.isRecurring
    }))
  ];

  // Perform search, category & type filter
  const filteredTx = unifiedTx.filter(tx => {
    const matchesSearch = tx.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tx.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || tx.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesType && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'amount-desc') return b.amount - a.amount;
    if (sortBy === 'amount-asc') return a.amount - b.amount;
    return 0;
  });

  const categories = Array.from(new Set(unifiedTx.map(t => t.category)));

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Header */}
      <div className="grid sm:grid-cols-12 gap-4 bg-slate-900/40 p-5 rounded-2xl border border-white/5">
        <div className="sm:col-span-4 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input 
            type="text"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/5 outline-none text-xs text-white focus:border-indigo-500"
            placeholder="Search merchants or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <select 
            value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/5 outline-none text-xs text-slate-300"
          >
            <option value="all" className="bg-slate-900">All Flow Types</option>
            <option value="inflow" className="bg-slate-900">Inward Cash</option>
            <option value="outflow" className="bg-slate-900">Outward Debits</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select 
            value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/5 outline-none text-xs text-slate-300"
          >
            <option value="all" className="bg-slate-900">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat} className="bg-slate-900">{cat}</option>)}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select 
            value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/5 outline-none text-xs text-slate-300"
          >
            <option value="date-desc" className="bg-slate-900">Date: Newest First</option>
            <option value="date-asc" className="bg-slate-900">Date: Oldest First</option>
            <option value="amount-desc" className="bg-slate-900">Volume: High to Low</option>
            <option value="amount-asc" className="bg-slate-900">Volume: Low to High</option>
          </select>
        </div>
      </div>

      {/* Main Ledger List */}
      <div className="bg-slate-900/20 rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 bg-slate-900/40 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-indigo-400">LEDGER POSITIONS COMPLIED</span>
          <span className="text-[10px] font-mono text-slate-400">{filteredTx.length} Matching nodes found</span>
        </div>

        <div className="divide-y divide-white/5">
          {filteredTx.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-mono">
              NO COMPLIANT METRIC NODES DETECTED
            </div>
          ) : (
            filteredTx.map(tx => (
              <div key={tx.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.01] transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'inflow' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-pink-500/10 text-pink-400'}`}>
                    {tx.type === 'inflow' ? <ArrowUpRight className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate">{tx.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                      <span className="text-[10px] uppercase px-1.5 py-0.2 bg-slate-800 rounded text-slate-400">{tx.category}</span>
                      <span>{tx.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-6 border-t border-white/5 sm:border-0 pt-3 sm:pt-0">
                  <span className={`text-sm font-black font-mono ${tx.type === 'inflow' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'inflow' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                  </span>
                  <button 
                    onClick={() => setSelectedTx(tx)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DETAILED TRANSACTION DRAWER / MODAL */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-3xl border border-white/10 bg-slate-900 text-slate-100 shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedTx(null)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/5 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center pb-6 border-b border-white/5 mb-6">
                <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">TRANSACTION RECEIPT</span>
                <h3 className="text-xl font-extrabold text-white mt-1">{selectedTx.title}</h3>
                <p className={`text-2xl font-black font-mono mt-3 ${selectedTx.type === 'inflow' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedTx.type === 'inflow' ? '+' : '-'}₹{selectedTx.amount.toLocaleString()}
                </p>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">POSTING STATUS:</span>
                  <span className="text-emerald-500 font-bold">COMPLETED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">FLOW TYPE:</span>
                  <span className="text-slate-300 font-bold uppercase">{selectedTx.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CATEGORY CLASS:</span>
                  <span className="text-slate-300 font-bold">{selectedTx.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SETTLEMENT TIMEOFF:</span>
                  <span className="text-slate-300">{selectedTx.date}</span>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <span className="text-slate-500 block mb-1">MEMO NOTES:</span>
                  <p className="text-slate-300 leading-relaxed font-sans text-xs">{selectedTx.description}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedTx(null)}
                className="w-full mt-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs"
              >
                Close Receipt
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export const ReportsPanel: React.FC<ViewProps> = ({ incomes, expenses, budgets, userId }) => {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await AuraAI.query(userId, "Based on my income, expenses, and budgets, provide a concise 2-3 sentence analytical summary of my financial report with specific diagnostic insights and actionable recommendations.");
        setAiSummary(res.answer);
      } catch (err: any) {
        console.error("Failed to fetch reports AI summary:", err);
        setError(err.message || "Failed to generate report diagnostics.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [userId, incomes.length, expenses.length, budgets.length]);

  // Aggregate math
  const totalInflow = incomes.reduce((sum, item) => sum + item.amount, 0);
  const totalOutflow = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalBudgeted = budgets.reduce((sum, item) => sum + item.limit, 0);

  // Categories distribution dataset
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

  // Budget vs Spent mapping
  const budgetVersusSpentDataset = budgets.map(b => {
    const matchedSpent = expenses
      .filter(e => e.category.toLowerCase() === b.category.toLowerCase())
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: b.category,
      Limit: b.limit,
      Spent: matchedSpent
    };
  });

  return (
    <div className="space-y-8">
      
      {/* Top metrics grids */}
      <div className="grid sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
          <span className="text-3xs font-mono text-slate-500 uppercase">INFLOW RATIO BALANCE</span>
          <p className="text-lg font-black text-white mt-1">₹{totalInflow.toLocaleString()}</p>
          <div className="h-1.5 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
          <span className="text-3xs font-mono text-slate-500 uppercase">BURNT EXPENDS DEBITS</span>
          <p className="text-lg font-black text-rose-400 mt-1">₹{totalOutflow.toLocaleString()}</p>
          <div className="h-1.5 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(Math.round((totalOutflow / totalInflow) * 100), 100)}%` }}></div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
          <span className="text-3xs font-mono text-indigo-400 uppercase">OVERALL SPEND INDEX</span>
          <p className="text-lg font-black text-indigo-400 mt-1">
            {totalInflow > 0 ? ((totalOutflow / totalInflow) * 100).toFixed(1) : 0}% Efficiency
          </p>
          <div className="h-1.5 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(Math.round((totalOutflow / totalInflow) * 100), 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Graphic charts: Category Pie Chart + Budget BarChart */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Pie visual */}
        <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/30">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xs font-mono text-indigo-400 uppercase">COMPREHENSIVE ALLOCATIVE BREAKDOWN</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded">PIE REPRESENTATION</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {pieData.length === 0 ? (
              <p className="text-xs font-mono text-slate-500">No active category metrics</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 text-2xs font-mono text-slate-500 mt-4">
            {pieData.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }}></span>
                <span>{e.name}: (₹{e.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart limit tracking comparison */}
        <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/30">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xs font-mono text-pink-400 uppercase">BUDGET CAPS COMPARED</h4>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-pink-500/10 text-pink-400 rounded">LIMITS VS UTILIZED</span>
          </div>
          <div className="h-64 w-full">
            {budgetVersusSpentDataset.length === 0 ? (
              <p className="text-xs font-mono text-slate-500">No limits programed</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={budgetVersusSpentDataset}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                  <YAxis stroke="#6b7280" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a' }} />
                  <Legend fontSize={10} />
                  <Bar dataKey="Limit" fill="#818cf8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Spent" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                </ReBarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* AI SUGGESTION COGNITIVE GRID SUMMARY */}
      <div className="p-6 rounded-2xl border border-indigo-500/10 bg-indigo-950/20">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Aura Analytical Diagnostic report</span>
        </div>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3.5 bg-indigo-500/10 rounded w-5/6"></div>
            <div className="h-3.5 bg-indigo-500/10 rounded w-full"></div>
            <div className="h-3.5 bg-indigo-500/10 rounded w-2/3"></div>
          </div>
        ) : error ? (
          <p className="text-xs text-rose-300 font-mono leading-relaxed">
            ⚠ {error}
          </p>
        ) : (
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            {aiSummary || "No diagnostic summary compiled yet. Add transactions to generate dynamic reports."}
          </p>
        )}
      </div>

    </div>
  );
};
