import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, DollarSign, ArrowRight, ArrowLeft, ShieldCheck, PieChart, TrendingUp } from 'lucide-react';
import { UserProfile } from '../../types';

interface SetupProps {
  onComplete: (profile: UserProfile) => void;
}

export const FinancialProfileSetupView: React.FC<SetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: 'Alex Sterling',
    email: 'pidaparthibharath@karunya.edu.in',
    monthlySalary: 7500,
    additionalIncome: 1200,
    currentSavings: 24500,
    rent: 1800,
    fixedExpenses: 700,
    monthlyBills: 350,
    emiLoans: 450,
    savingsGoalPercentage: 20
  });

  const handleUpdate = (field: string, val: number | string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    onComplete({
      name: formData.name,
      email: formData.email,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      monthlySalary: Number(formData.monthlySalary),
      additionalIncome: Number(formData.additionalIncome),
      currentSavings: Number(formData.currentSavings),
      rent: Number(formData.rent),
      fixedExpenses: Number(formData.fixedExpenses),
      monthlyBills: Number(formData.monthlyBills),
      emiLoans: Number(formData.emiLoans),
      savingsGoalPercentage: Number(formData.savingsGoalPercentage),
      hasSetupProfile: true,
      salaryHistory: [
        { month: 'Jun 2026', amount: Number(formData.monthlySalary) }
      ]
    });
  };

  // Intermediate math calculations
  const totalInflow = Number(formData.monthlySalary) + Number(formData.additionalIncome);
  const totalOutflow = Number(formData.rent) + Number(formData.fixedExpenses) + Number(formData.monthlyBills) + Number(formData.emiLoans);
  const disposableLiquidity = totalInflow - totalOutflow;
  const suggestedSavings = Math.round(disposableLiquidity * (formData.savingsGoalPercentage / 100));

  return (
    <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl border border-white/10 dark:border-white/10 light:border-black/5 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white text-slate-100 dark:text-slate-100 light:text-slate-900 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      
      {/* Background spotlights */}
      <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Steps indicator bar */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5 dark:border-white/5 light:border-black/5">
        <div>
          <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">AUGMENTATION STEPS IN PROGRESS</span>
          <h2 className="text-xl font-extrabold text-white dark:text-white light:text-slate-900 mt-1">Setup Liquid Matrix</h2>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-8 bg-indigo-500' : 'w-2 bg-white/10'}`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: ACTIVE INFLOW VECTORS */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20 mb-6">
            <span className="text-[10px] font-mono text-indigo-400 block uppercase tracking-wider mb-1">NODE INTEGRATION</span>
            <p className="text-sm text-slate-300 leading-relaxed">Let's map your active cash influx. This builds the foundational reserve bounds of your projection grids.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Base Monthly Salary (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 outline-none text-sm text-white focus:border-indigo-500 font-mono"
                  value={formData.monthlySalary}
                  onChange={(e) => handleUpdate('monthlySalary', Number(e.target.value))}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">Primary baseline paystub from contracts.</p>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Alternative Yields / Freelance (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 outline-none text-sm text-white focus:border-indigo-500 font-mono"
                  value={formData.additionalIncome}
                  onChange={(e) => handleUpdate('additionalIncome', Number(e.target.value))}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">Dividends, consulting, and side hustles.</p>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button 
              onClick={handleNext}
              className="px-6 py-3.5 rounded-xl bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
            >
              Next Step (Debits) <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: FIXED DEBIT OUTFLOWS */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="bg-pink-500/10 p-5 rounded-2xl border border-pink-500/20 mb-6">
            <span className="text-[10px] font-mono text-pink-400 block uppercase tracking-wider mb-1">OBLIGATION VECTORS</span>
            <p className="text-sm text-slate-300 leading-relaxed">Map your persistent overhead liabilities. Correct entries guarantee absolute precision in budget thresholds.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Rent / Mortgages (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 outline-none text-sm text-white focus:border-pink-500 font-mono"
                  value={formData.rent}
                  onChange={(e) => handleUpdate('rent', Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">EMI / Loans Outstanding (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 outline-none text-sm text-white focus:border-pink-500 font-mono"
                  value={formData.emiLoans}
                  onChange={(e) => handleUpdate('emiLoans', Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Fixed Discretionary Base (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 outline-none text-sm text-white focus:border-pink-500 font-mono"
                  value={formData.fixedExpenses}
                  onChange={(e) => handleUpdate('fixedExpenses', Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Persistent Utilities & Bills (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 outline-none text-sm text-white focus:border-pink-500 font-mono"
                  value={formData.monthlyBills}
                  onChange={(e) => handleUpdate('monthlyBills', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-between">
            <button 
              onClick={handleBack}
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={handleNext}
              className="px-6 py-3.5 rounded-xl bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
            >
              Continue to Targets <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: LIQUID RESERVES & GOAL PERCENT VALUES */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="bg-purple-500/10 p-5 rounded-2xl border border-purple-500/20 mb-6">
            <span className="text-[10px] font-mono text-purple-400 block uppercase tracking-wider mb-1">RESERVES COGNITION</span>
            <p className="text-sm text-slate-300 leading-relaxed">Let's program your savings index goal. This shapes how pre-emptive alerts prioritize redundant budgets.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Stored Savings Reserve (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 outline-none text-sm text-white focus:border-purple-500 font-mono"
                  value={formData.currentSavings}
                  onChange={(e) => handleUpdate('currentSavings', Number(e.target.value))}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">Liquid accounts, cash reservoirs, high interest vaults.</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider">Intended Savings Rate ({formData.savingsGoalPercentage}%)</label>
                <span className="text-xs font-bold text-indigo-400">{formData.savingsGoalPercentage}% target</span>
              </div>
              <input 
                type="range"
                min="5"
                max="80"
                step="5"
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                value={formData.savingsGoalPercentage}
                onChange={(e) => handleUpdate('savingsGoalPercentage', Number(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>5% (Minimal)</span>
                <span>25% (Standard)</span>
                <span>50% (Ambitious)</span>
                <span>80% (Extreme)</span>
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-between">
            <button 
              onClick={handleBack}
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={handleNext}
              className="px-6 py-3.5 rounded-xl bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
            >
              Review Projections <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 4: PREVIEW METRICS COMPILATION */}
      {step === 4 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 animate-bounce">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-white">Validation Ready</h3>
            <p className="text-xs text-slate-400">Review estimated structural limits based on inputted matrices.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-slate-500 block">TOTAL INFLOWS</span>
              <span className="text-lg font-black text-white">₹{totalInflow}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-slate-500 block">FIXED COMMITTED</span>
              <span className="text-lg font-black text-rose-400">₹{totalOutflow}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-slate-500 block">DISPOSABLE FLOW</span>
              <span className="text-lg font-black text-emerald-400">₹{disposableLiquidity}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-4">
            <TrendingUp className="w-10 h-10 text-indigo-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-mono text-indigo-400 block uppercase">PLANNER SUGGESTION</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                By maintaining a <span className="font-bold text-white">{formData.savingsGoalPercentage}% savings rate</span>, you will stash <span className="font-bold text-white">₹{suggestedSavings}/mo</span> into savings goals, reaching your Laptop milestone within 2 months!
              </p>
            </div>
          </div>

          <div className="pt-6 flex justify-between">
            <button 
              onClick={handleBack}
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={handleSubmit}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.01] transition-all"
            >
              Confirm and Deploy <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
