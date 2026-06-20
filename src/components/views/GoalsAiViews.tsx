import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, Sparkles, Award, CheckCircle2, 
  Laptop, Bike, Car, Home, ShieldAlert, Palmtree, Plus 
} from 'lucide-react';
import { SavingsGoal } from '../../types';

interface ViewProps {
  goals: SavingsGoal[];
  onAddGoalFunds: (id: string, amount: number) => void;
  onAddSavingsGoal: (goal: SavingsGoal) => void;
}

export const GoalsPanel: React.FC<ViewProps> = ({ goals, onAddGoalFunds, onAddSavingsGoal }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [fundAmount, setFundAmount] = useState<{ [key: string]: string }>({});
  
  // States for adding a new custom goal
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState<'laptop' | 'bike' | 'car' | 'house' | 'emergency' | 'vacation'>('laptop');
  const [targetDate, setTargetDate] = useState('2026-12-31');

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'laptop': return <Laptop className="w-5 h-5" />;
      case 'bike': return <Bike className="w-5 h-5" />;
      case 'car': return <Car className="w-5 h-5" />;
      case 'house': return <Home className="w-5 h-5" />;
      case 'emergency': return <ShieldAlert className="w-5 h-5" />;
      default: return <Palmtree className="w-5 h-5" />;
    }
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    const newGoal: SavingsGoal = {
      id: `g-${Date.now()}`,
      name,
      targetAmount: Number(targetAmount),
      currentAmount: 0,
      category,
      targetDate,
      icon: category.toUpperCase()
    };

    onAddSavingsGoal(newGoal);
    setName('');
    setTargetAmount('');
    setShowAdd(false);
  };

  const handleAddFundsSubmit = (id: string) => {
    const amount = Number(fundAmount[id]);
    if (isNaN(amount) || amount <= 0) return;
    onAddGoalFunds(id, amount);
    setFundAmount(prev => ({ ...prev, [id]: '' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" /> SAVINGS GOALS
          </h2>
          <p className="text-xs text-slate-500 font-mono">Precision funding & future-state telemetry</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> {showAdd ? 'Cancel Form' : 'Initialize Target'}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreateGoal} className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 space-y-4 max-w-xl">
              <h3 className="text-xs font-mono text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Telemetry Calibration
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 block">GOAL NAME</label>
                  <input 
                    type="text" 
                    placeholder="e.g. MacBook Pro M4" 
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 block">TARGET CAPTAL (₹)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 150000" 
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 block">CLASSIFICATION</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/5 text-xs text-slate-300 outline-none focus:border-indigo-500 font-mono"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                  >
                    <option value="laptop">Technology (Laptop)</option>
                    <option value="bike">Mobility (Bike)</option>
                    <option value="car">Automotive (Car)</option>
                    <option value="house">Real Estate (House)</option>
                    <option value="emergency">Emergency Ledger</option>
                    <option value="vacation">Leisure (Vacation)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 block">TARGET SETTLEMENT DATE</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Launch Savings Goal
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const isCompleted = goal.currentAmount >= goal.targetAmount;
          
          return (
            <div key={goal.id} className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    {getIcon(goal.category)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {goal.name}
                      {isCompleted && <Award className="w-4 h-4 text-emerald-400 animate-bounce" />}
                    </h3>
                    <span className="text-3xs font-mono text-slate-500 uppercase tracking-widest">{goal.category}</span>
                  </div>
                </div>
                
                {isCompleted ? (
                  <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono text-emerald-400 uppercase font-black">
                    COMPLETED
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-mono text-indigo-400 uppercase font-black">
                    ACTIVE
                  </span>
                )}
              </div>

              {/* Progress visualizer */}
              <div className="space-y-1">
                <div className="flex justify-between text-3xs font-mono">
                  <span className="text-slate-500">ACCUMULATED CAPITAL</span>
                  <span className="text-white font-bold">{pct.toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-3xs font-mono mt-1">
                  <span className="text-indigo-400 font-bold">₹{goal.currentAmount.toLocaleString()}</span>
                  <span className="text-slate-500">OF ₹{goal.targetAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex justify-between text-3xs font-mono text-slate-500">
                <span>MATURITY</span>
                <span className="text-slate-300 font-bold">{goal.targetDate}</span>
              </div>

              {/* Funding action prompter */}
              {!isCompleted && (
                <div className="flex gap-2">
                  <input 
                    type="number"
                    placeholder="₹ Fund"
                    value={fundAmount[goal.id] || ''}
                    onChange={(e) => setFundAmount(prev => ({ ...prev, [goal.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                  />
                  <button 
                    onClick={() => handleAddFundsSubmit(goal.id)}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Stash
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
