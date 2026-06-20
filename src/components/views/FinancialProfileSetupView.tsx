import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, DollarSign, ArrowRight, ArrowLeft, ShieldCheck, PieChart, TrendingUp, AlertTriangle } from 'lucide-react';
import { UserProfile } from '../../types';
import { profileService } from '../../services/profileService';

interface SetupProps {
  userProfile: UserProfile;
  userId: string;
  onComplete: (profile: UserProfile) => void;
}

export const FinancialProfileSetupView: React.FC<SetupProps> = ({ userProfile, userId, onComplete }) => {
  const [step, setStep] = useState<number>(userProfile.onboardingStep || 1);
  const [formData, setFormData] = useState({
    name: userProfile.name || '',
    email: userProfile.email || '',
    monthlySalary: userProfile.monthlySalary || 7500,
    additionalIncome: userProfile.additionalIncome || 1200,
    currentSavings: userProfile.currentSavings || 24500,
    rent: userProfile.rent || 1800,
    fixedExpenses: userProfile.fixedExpenses || 700,
    monthlyBills: userProfile.monthlyBills || 350,
    emiLoans: userProfile.emiLoans || 450,
    savingsGoalPercentage: userProfile.savingsGoalPercentage || 20
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state if initial props load asynchronously
  useEffect(() => {
    if (userProfile.onboardingStep && !touched.onboardingStepSynced) {
      setStep(userProfile.onboardingStep);
      setFormData(prev => ({
        ...prev,
        name: userProfile.name || prev.name,
        email: userProfile.email || prev.email,
        monthlySalary: userProfile.monthlySalary || prev.monthlySalary,
        additionalIncome: userProfile.additionalIncome || prev.additionalIncome,
        currentSavings: userProfile.currentSavings || prev.currentSavings,
        rent: userProfile.rent || prev.rent,
        fixedExpenses: userProfile.fixedExpenses || prev.fixedExpenses,
        monthlyBills: userProfile.monthlyBills || prev.monthlyBills,
        emiLoans: userProfile.emiLoans || prev.emiLoans,
        savingsGoalPercentage: userProfile.savingsGoalPercentage || prev.savingsGoalPercentage
      }));
      setTouched(prev => ({ ...prev, onboardingStepSynced: true }));
    }
  }, [userProfile]);

  // Compute validation errors in real-time
  const errors = useMemo(() => {
    return profileService.validateProfile(step, formData);
  }, [step, formData]);

  const isStepValid = Object.keys(errors).length === 0;

  const handleUpdate = (field: string, val: number | string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Helper to determine only fields that have changed relative to the initial userProfile
  const getChangedFieldsForStep = (currentStep: number) => {
    const changed: Partial<UserProfile> = {};
    
    if (currentStep === 1) {
      if (Number(formData.monthlySalary) !== userProfile.monthlySalary) {
        changed.monthlySalary = Number(formData.monthlySalary);
      }
      if (Number(formData.additionalIncome) !== userProfile.additionalIncome) {
        changed.additionalIncome = Number(formData.additionalIncome);
      }
    } else if (currentStep === 2) {
      if (Number(formData.rent) !== userProfile.rent) {
        changed.rent = Number(formData.rent);
      }
      if (Number(formData.fixedExpenses) !== userProfile.fixedExpenses) {
        changed.fixedExpenses = Number(formData.fixedExpenses);
      }
      if (Number(formData.monthlyBills) !== userProfile.monthlyBills) {
        changed.monthlyBills = Number(formData.monthlyBills);
      }
      if (Number(formData.emiLoans) !== userProfile.emiLoans) {
        changed.emiLoans = Number(formData.emiLoans);
      }
    } else if (currentStep === 3) {
      if (Number(formData.currentSavings) !== userProfile.currentSavings) {
        changed.currentSavings = Number(formData.currentSavings);
      }
      if (Number(formData.savingsGoalPercentage) !== userProfile.savingsGoalPercentage) {
        changed.savingsGoalPercentage = Number(formData.savingsGoalPercentage);
      }
    }
    
    return changed;
  };

  const handleNext = async () => {
    if (!isStepValid) return;

    const previousStep = step;
    const nextStep = step + 1;

    // 1. Optimistic UI Transition
    setStep(nextStep);
    setSaveStatus({ type: 'success', message: 'Saving progress...' });

    // 2. Extract changed fields for background sync
    const changedFields = getChangedFieldsForStep(previousStep);

    // If no fields changed on this step, update only the step index
    try {
      setLoading(true);
      await profileService.saveOnboardingStep(userId, nextStep, changedFields);
      setSaveStatus({ type: 'success', message: 'Progress auto-saved.' });
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err: any) {
      console.error('[Onboarding] Auto-save error, rolling back:', err);
      // Rollback UI to the previous step
      setStep(previousStep);
      setSaveStatus({ 
        type: 'error', 
        message: `Connection issue: Failed to save progress. ${err.message || 'Please check your connection.'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (loading) return; // Prevent duplicate submissions

    setLoading(true);
    setSaveStatus({ type: 'success', message: 'Deploying profile configuration...' });

    try {
      const finalProfile: UserProfile = {
        name: formData.name,
        email: formData.email || userProfile.email,
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
          { month: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), amount: Number(formData.monthlySalary) }
        ]
      };

      // Atomic single-upsert save
      const updated = await profileService.completeOnboarding(userId, finalProfile);
      setSaveStatus({ type: 'success', message: 'Onboarding completed successfully!' });
      
      setTimeout(() => {
        onComplete(updated);
      }, 1200);
    } catch (err: any) {
      console.error('[Onboarding] Completion failure:', err);
      setSaveStatus({ 
        type: 'error', 
        message: `Deployment failed: ${err.message || 'Check connection and try again.'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  // Intermediate math calculations (memoized to prevent unnecessary re-renders)
  const totals = useMemo(() => {
    const totalInflow = Number(formData.monthlySalary) + Number(formData.additionalIncome);
    const totalOutflow = Number(formData.rent) + Number(formData.fixedExpenses) + Number(formData.monthlyBills) + Number(formData.emiLoans);
    const disposableLiquidity = totalInflow - totalOutflow;
    const suggestedSavings = Math.round(Math.max(0, disposableLiquidity) * (formData.savingsGoalPercentage / 100));
    return { totalInflow, totalOutflow, disposableLiquidity, suggestedSavings };
  }, [formData]);

  return (
    <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl border border-white/10 dark:border-white/10 light:border-black/5 bg-slate-900/60 dark:bg-slate-900/60 light:bg-white text-slate-100 dark:text-slate-100 light:text-slate-900 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      
      {/* Background spotlights */}
      <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Steps indicator bar */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5 dark:border-white/5 light:border-black/5">
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

      {/* Transient Status Banners */}
      <AnimatePresence>
        {saveStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border mb-6 text-xs font-mono flex items-center justify-between transition-all ${
              saveStatus.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            <span className="flex items-center gap-2">
              {saveStatus.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              {saveStatus.message}
            </span>
            {loading && <span className="inline-block w-4.5 h-4.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* STEP 1: ACTIVE INFLOW VECTORS */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20 mb-6">
            <span className="text-[10px] font-mono text-indigo-400 block uppercase tracking-wider mb-1">NODE INTEGRATION</span>
            <p className="text-sm text-slate-300 leading-relaxed">Let's map your active cash influx. This builds the foundational reserve bounds of your projection grids.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Base Monthly Salary (₹) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white/5 outline-none text-sm text-white focus:border-indigo-500 font-mono ${
                    errors.monthlySalary && touched.monthlySalary ? 'border-rose-500/50' : 'border-white/5'
                  }`}
                  value={formData.monthlySalary}
                  onChange={(e) => handleUpdate('monthlySalary', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              {errors.monthlySalary && touched.monthlySalary && (
                <p className="text-rose-400 text-[10px] mt-1.5 font-mono">{errors.monthlySalary}</p>
              )}
              <p className="text-[10px] text-slate-500 mt-1.5">Primary baseline paystub from contracts.</p>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Alternative Yields / Freelance (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white/5 outline-none text-sm text-white focus:border-indigo-500 font-mono ${
                    errors.additionalIncome && touched.additionalIncome ? 'border-rose-500/50' : 'border-white/5'
                  }`}
                  value={formData.additionalIncome}
                  onChange={(e) => handleUpdate('additionalIncome', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              {errors.additionalIncome && touched.additionalIncome && (
                <p className="text-rose-400 text-[10px] mt-1.5 font-mono">{errors.additionalIncome}</p>
              )}
              <p className="text-[10px] text-slate-500 mt-1.5">Dividends, consulting, and side hustles.</p>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button 
              onClick={handleNext}
              disabled={!isStepValid || loading}
              className={`px-6 py-3.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition-all ${
                isStepValid && !loading ? 'bg-indigo-500 hover:bg-indigo-600 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
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

          {errors.expensesTotal && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-xs text-rose-400 font-mono">
              {errors.expensesTotal}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Rent / Mortgages (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white/5 outline-none text-sm text-white focus:border-pink-500 font-mono ${
                    errors.rent && touched.rent ? 'border-rose-500/50' : 'border-white/5'
                  }`}
                  value={formData.rent}
                  onChange={(e) => handleUpdate('rent', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              {errors.rent && touched.rent && (
                <p className="text-rose-400 text-[10px] mt-1.5 font-mono">{errors.rent}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">EMI / Loans Outstanding (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white/5 outline-none text-sm text-white focus:border-pink-500 font-mono ${
                    errors.emiLoans && touched.emiLoans ? 'border-rose-500/50' : 'border-white/5'
                  }`}
                  value={formData.emiLoans}
                  onChange={(e) => handleUpdate('emiLoans', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              {errors.emiLoans && touched.emiLoans && (
                <p className="text-rose-400 text-[10px] mt-1.5 font-mono">{errors.emiLoans}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Fixed Discretionary Base (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white/5 outline-none text-sm text-white focus:border-pink-500 font-mono ${
                    errors.fixedExpenses && touched.fixedExpenses ? 'border-rose-500/50' : 'border-white/5'
                  }`}
                  value={formData.fixedExpenses}
                  onChange={(e) => handleUpdate('fixedExpenses', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              {errors.fixedExpenses && touched.fixedExpenses && (
                <p className="text-rose-400 text-[10px] mt-1.5 font-mono">{errors.fixedExpenses}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Persistent Utilities & Bills (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                <input 
                  type="number"
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white/5 outline-none text-sm text-white focus:border-pink-500 font-mono ${
                    errors.monthlyBills && touched.monthlyBills ? 'border-rose-500/50' : 'border-white/5'
                  }`}
                  value={formData.monthlyBills}
                  onChange={(e) => handleUpdate('monthlyBills', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              {errors.monthlyBills && touched.monthlyBills && (
                <p className="text-rose-400 text-[10px] mt-1.5 font-mono">{errors.monthlyBills}</p>
              )}
            </div>
          </div>

          <div className="pt-6 flex justify-between">
            <button 
              onClick={handleBack}
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={handleNext}
              disabled={!isStepValid || loading}
              className={`px-6 py-3.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition-all ${
                isStepValid && !loading ? 'bg-indigo-500 hover:bg-indigo-600 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
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
                  className={`w-full pl-11 pr-4 py-3.5 rounded-xl border bg-white/5 outline-none text-sm text-white focus:border-purple-500 font-mono ${
                    errors.currentSavings && touched.currentSavings ? 'border-rose-500/50' : 'border-white/5'
                  }`}
                  value={formData.currentSavings}
                  onChange={(e) => handleUpdate('currentSavings', e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              {errors.currentSavings && touched.currentSavings && (
                <p className="text-rose-400 text-[10px] mt-1.5 font-mono">{errors.currentSavings}</p>
              )}
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
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 font-sans"
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
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={handleNext}
              disabled={!isStepValid || loading}
              className={`px-6 py-3.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 transition-all ${
                isStepValid && !loading ? 'bg-indigo-500 hover:bg-indigo-600 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
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
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-extrabold text-white">Validation Ready</h3>
            <p className="text-xs text-slate-400">Review estimated structural limits based on inputted matrices.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-slate-500 block">TOTAL INFLOWS</span>
              <span className="text-lg font-black text-white">₹{totals.totalInflow.toLocaleString()}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-slate-500 block">FIXED COMMITTED</span>
              <span className="text-lg font-black text-rose-400">₹{totals.totalOutflow.toLocaleString()}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-slate-500 block">DISPOSABLE FLOW</span>
              <span className="text-lg font-black text-emerald-400">₹{totals.disposableLiquidity.toLocaleString()}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-4">
            <TrendingUp className="w-10 h-10 text-indigo-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-mono text-indigo-400 block uppercase">PLANNER SUGGESTION</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                By maintaining a <span className="font-bold text-white">{formData.savingsGoalPercentage}% savings rate</span>, you will stash <span className="font-bold text-white">₹{totals.suggestedSavings.toLocaleString()}/mo</span> into savings goals.
              </p>
            </div>
          </div>

          <div className="pt-6 flex justify-between">
            <button 
              onClick={handleBack}
              disabled={loading}
              className="px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className={`px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50`}
            >
              Confirm and Deploy <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

    </div>
  );
};
