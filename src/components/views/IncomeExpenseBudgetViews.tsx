import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Trash2, Edit2, Check, TrendingUp, TrendingDown, Clock, ShieldAlert,
  Sliders, Calendar, Tag, CreditCard, DollarSign, Wallet
} from 'lucide-react';
import { IncomeItem, ExpenseItem, BudgetItem } from '../../types';

interface ViewProps {
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  budgets: BudgetItem[];
  onAddIncome: (item: IncomeItem) => void;
  onEditIncome: (item: IncomeItem) => void;
  onDeleteIncome: (id: string) => void;
  onAddExpense: (item: ExpenseItem) => void;
  onEditExpense: (item: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateBudget: (item: BudgetItem) => void;
  onAddBudget: (item: BudgetItem) => void;
}

export const IncomePanel: React.FC<ViewProps> = ({ 
  incomes, onAddIncome, onEditIncome, onDeleteIncome 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salary');
  const [date, setDate] = useState('2026-06-09');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const categories = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !amount) return;

    const newItem: IncomeItem = {
      id: editingId || `inc-${Date.now()}`,
      source,
      amount: Number(amount),
      category,
      date,
      description,
      isRecurring
    };

    if (editingId) {
      onEditIncome(newItem);
      setEditingId(null);
    } else {
      onAddIncome(newItem);
    }

    // Reset Form
    setSource('');
    setAmount('');
    setDescription('');
    setShowAdd(false);
  };

  const startEdit = (item: IncomeItem) => {
    setEditingId(item.id);
    setSource(item.source);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setDate(item.date);
    setDescription(item.description || '');
    setIsRecurring(item.isRecurring || false);
    setShowAdd(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-xl font-extrabold text-white">Inflow Management</h2>
          <p className="text-xs text-slate-400">Add, refine and audit recurring and contract revenue channels</p>
        </div>
        <button 
          onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> {showAdd ? 'Collapse Portal' : 'Add Inward Flow'}
        </button>
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate} 
          className="p-6 rounded-2xl border border-white/10 bg-slate-950/60 space-y-4"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            {editingId ? 'Modify Revenue Record' : 'Record New Revenue Inward'}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Source / Client Name</label>
              <input 
                type="text" required value={source} onChange={(e) => setSource(e.target.value)}
                placeholder="Aura Tech Corp"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-indigo-500 outline-none text-white font-sans"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Liquid Amount (₹)</label>
              <input 
                type="number" required value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="7500"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-indigo-500 outline-none text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Category Class</label>
              <select 
                value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-indigo-500 outline-none text-slate-200"
              >
                {categories.map(cat => <option key={cat} className="bg-slate-900" value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Allocation Cycle Date</label>
              <input 
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-indigo-500 outline-none text-white font-mono"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Add Secondary Clarifications (Optional)</label>
              <input 
                type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Regular monthly paystub payout"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-indigo-500 outline-none text-white"
              />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <input 
                type="checkbox" id="recurringInc" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 accent-indigo-500"
              />
              <label htmlFor="recurringInc" className="text-xs text-slate-400 select-none">
                Auto-apply as repeating monthly balance modifier
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => { setShowAdd(false); setEditingId(null); }}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              {editingId ? 'Apply Revision' : 'Secure Inflow Entry'}
            </button>
          </div>
        </motion.form>
      )}

      {/* HISTORIC INCOME LOGS */}
      <div className="bg-slate-900/20 rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 bg-slate-900/60 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-indigo-400">ACTIVE INWARD LEDGER RECORDS</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
            {incomes.length} Ledger Positions
          </span>
        </div>
        
        <div className="divide-y divide-white/5">
          {incomes.map((item) => (
            <div key={item.id} className="p-5 flex items-center justify-between hover:bg-white/[0.01] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{item.source}</h4>
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-mono mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">{item.category}</span>
                    <span>{item.date}</span>
                    {item.isRecurring && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 select-none border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded">RECURRING</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-base font-black text-emerald-400 font-mono">+₹{item.amount.toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(item)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-400 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDeleteIncome(item.id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ExpensePanel: React.FC<ViewProps> = ({ 
  expenses, onAddExpense, onEditExpense, onDeleteExpense 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Housing');
  const [date, setDate] = useState('2026-06-09');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');

  const categories = ['Housing', 'Groceries', 'Dining Out', 'Car/Transport', 'Entertainment', 'Utilities', 'Health', 'Other'];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchant || !amount) return;

    const newItem: ExpenseItem = {
      id: editingId || `exp-${Date.now()}`,
      merchant,
      amount: Number(amount),
      category,
      date,
      description,
      isRecurring,
      frequency: isRecurring ? frequency : undefined
    };

    if (editingId) {
      onEditExpense(newItem);
      setEditingId(null);
    } else {
      onAddExpense(newItem);
    }

    // Reset Form
    setMerchant('');
    setAmount('');
    setDescription('');
    setShowAdd(false);
  };

  const startEdit = (item: ExpenseItem) => {
    setEditingId(item.id);
    setMerchant(item.merchant);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setDate(item.date);
    setDescription(item.description || '');
    setIsRecurring(item.isRecurring || false);
    if (item.frequency) setFrequency(item.frequency);
    setShowAdd(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-xl font-extrabold text-white">Outward Transactions</h2>
          <p className="text-xs text-slate-400">Append, edit, or configure active outgoings across categoric nodes</p>
        </div>
        <button 
          onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}
          className="px-4 py-2.5 rounded-xl bg-pink-600 text-white hover:bg-pink-700 text-xs font-bold flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> {showAdd ? 'Collapse Portal' : 'Add Debit Outflow'}
        </button>
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate} 
          className="p-6 rounded-2xl border border-white/10 bg-slate-950/60 space-y-4"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            {editingId ? 'Modify Outflow Record' : 'Record New Outflow debit'}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Merchant / Destination Node</label>
              <input 
                type="text" required value={merchant} onChange={(e) => setMerchant(e.target.value)}
                placeholder="Whole Foods Market"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-pink-500 outline-none text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Debit Amount (₹)</label>
              <input 
                type="number" required value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="250"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-pink-500 outline-none text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Expense Category</label>
              <select 
                value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-pink-500 outline-none text-slate-200"
              >
                {categories.map(cat => <option key={cat} className="bg-slate-900" value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Posting Date</label>
              <input 
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-pink-500 outline-none text-white font-mono"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Memo Notes</label>
              <input 
                type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Weekly organic provisioning"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-pink-500 outline-none text-white"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 pt-3">
                <input 
                  type="checkbox" id="recurringExp" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 accent-pink-500"
                />
                <label htmlFor="recurringExp" className="text-xs text-slate-400 select-none">
                  Set as recurring passive overhead
                </label>
              </div>
              {isRecurring && (
                <div className="flex items-center gap-2 pl-7 animate-fadeIn">
                  <span className="text-[10px] font-mono text-slate-500">CYCLE FREQUENCY:</span>
                  <select 
                    value={frequency} onChange={(e) => setFrequency(e.target.value as any)}
                    className="px-2.5 py-1 text-xs rounded bg-white/5 border border-white/5 text-white outline-none"
                  >
                    <option value="weekly" className="bg-slate-900">Weekly</option>
                    <option value="monthly" className="bg-slate-900">Monthly</option>
                    <option value="yearly" className="bg-slate-900">Yearly</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => { setShowAdd(false); setEditingId(null); }}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 rounded-xl bg-pink-600 text-white font-bold text-xs"
            >
              {editingId ? 'Modify Debit' : 'Post Debit Outflow'}
            </button>
          </div>
        </motion.form>
      )}

      {/* HISTORIC EXPENSE RECORDS */}
      <div className="bg-slate-900/20 rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 bg-slate-900/60 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-pink-400">POSTED DIRECT DEBITS</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 font-mono">
            {expenses.length} Records Active
          </span>
        </div>
        
        <div className="divide-y divide-white/5">
          {expenses.map((item) => (
            <div key={item.id} className="p-5 flex items-center justify-between hover:bg-white/[0.01] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{item.merchant}</h4>
                  <div className="flex items-center gap-2.5 text-xs text-slate-500 font-mono mt-1">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">{item.category}</span>
                    <span>{item.date}</span>
                    {item.isRecurring && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 select-none border border-pink-500/20 bg-pink-500/10 text-pink-400 rounded">
                        RECURRING ({item.frequency})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-base font-black text-rose-400 font-mono">-₹{item.amount.toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(item)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-pink-400 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDeleteExpense(item.id)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const BudgetPanel: React.FC<ViewProps> = ({ 
  budgets, expenses, onUpdateBudget, onAddBudget 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');

  const availableCategories = [
    'Housing', 'Groceries', 'Dining Out', 'Car/Transport', 'Entertainment', 'Utilities', 'Health', 'Other'
  ].filter(cat => !budgets.some(b => b.category.toLowerCase() === cat.toLowerCase()));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !limit) return;

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#a855f7', '#6b7280'];
    const assignedColor = colors[budgets.length % colors.length];

    const newBudget: BudgetItem = {
      id: `b-${Date.now()}`,
      category,
      limit: Number(limit),
      spent: 0,
      color: assignedColor,
      alertThreshold: Number(alertThreshold)
    };

    onAddBudget(newBudget);
    setCategory('');
    setLimit('');
    setShowAdd(false);
  };

  const handleAdjustment = (id: string, newLimit: string) => {
    const budget = budgets.find(b => b.id === id);
    if (budget) {
      onUpdateBudget({ ...budget, limit: Number(newLimit) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-xl font-extrabold text-white">Dynamic Budget Matrix</h2>
          <p className="text-xs text-slate-400">Allocate threshold bounds across categories to prevent liquidity burn</p>
        </div>
        {availableCategories.length > 0 && (
          <button 
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> {showAdd ? 'Close' : 'Establish New Cap'}
          </button>
        )}
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate} 
          className="p-6 rounded-2xl border border-white/10 bg-slate-950/60 grid sm:grid-cols-3 gap-4 items-end"
        >
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Unallocated Node Category</label>
            <select 
              value={category} onChange={(e) => setCategory(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-purple-500 outline-none text-slate-200"
            >
              <option value="" className="bg-slate-900">Select...</option>
              {availableCategories.map(cat => <option key={cat} className="bg-slate-900" value={cat}>{cat}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Boundary Cap Limit (₹)</label>
            <input 
              type="number" required value={limit} onChange={(e) => setLimit(e.target.value)}
              placeholder="500"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-purple-500 outline-none text-white font-mono"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Alert Threshold (%)</label>
              <input 
                type="number" required value={alertThreshold} onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder="80" min="50" max="100"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-purple-500 outline-none text-white font-mono"
              />
            </div>
            <button 
              type="submit"
              className="px-5 py-3 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center justify-center h-[46px]"
            >
              Activate
            </button>
          </div>
        </motion.form>
      )}

      {/* ACTIVE BUDGET CARDS STREAM */}
      <div className="grid sm:grid-cols-2 gap-6">
        {budgets.map((item) => {
          // Dynamic calculation of sums matching this specific category!
          const actualSpent = expenses
            .filter(e => e.category.toLowerCase() === item.category.toLowerCase())
            .reduce((sum, e) => sum + e.amount, 0);

          const percent = Math.min(Math.round((actualSpent / item.limit) * 100), 100);
          const isWarning = percent >= item.alertThreshold;

          return (
            <div key={item.id} className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: item.color }}></div>

              <div className="flex justify-between items-center mb-4 pl-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{item.category}</span>
                  {isWarning && (
                    <span className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1 animate-pulse">
                      <ShieldAlert className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {percent}% UTILIZED
                </span>
              </div>

              <div className="space-y-3 pl-3">
                <div className="flex justify-between items-baseline font-mono">
                  <div>
                    <span className="text-lg font-black text-white">₹{actualSpent.toLocaleString()}</span>
                    <span className="text-xs text-slate-500"> spent</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Cap limit: </span>
                    <input 
                      type="number"
                      className="w-16 bg-white/5 border border-white/5 rounded px-1 text-xs text-right text-white font-mono"
                      value={item.limit}
                      onChange={(e) => handleAdjustment(item.id, e.target.value)}
                    />
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percent}%`,
                      backgroundColor: isWarning ? '#ef4444' : item.color
                    }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Threshold alert configured: {item.alertThreshold}%</span>
                  <span className={`${isWarning ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                    {isWarning ? 'OVERDRAFT RISK' : 'SECURE RESERVE'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
