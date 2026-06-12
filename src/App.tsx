import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Users, Sparkles, LogOut, PanelLeftClose, PanelLeft, 
  Wallet, Landmark, ScrollText, PieChart, ShieldAlert, Cpu, 
  TrendingUp, TrendingDown, Bell, User, Settings, ShieldCheck, 
  Check, Moon, Sun, AlertTriangle, Play, Sliders, Target 
} from 'lucide-react';

import { ThemeProvider, useTheme } from './components/ThemeContext';
import { CustomCursor } from './components/CustomCursor';
import { LandingPage } from './components/LandingPage';
import { LoginView, SignupView, ForgotPasswordView } from './components/views/AuthViews';
import { FinancialProfileSetupView } from './components/views/FinancialProfileSetupView';
import { DashboardView } from './components/views/DashboardView';
import { IncomePanel, ExpensePanel, BudgetPanel } from './components/views/IncomeExpenseBudgetViews';
import { TransactionsPanel, ReportsPanel } from './components/views/TransactionsReportsViews';
import { GoalsPanel, AiAssistantPanel } from './components/views/GoalsAiViews';
import { NotificationsPanel, ProfilePanel, SettingsPanel, AdminDashboardPanel } from './components/views/ProfileSettingsAdminViews';

import { 
  INITIAL_USER_PROFILE, INITIAL_INCOMES, INITIAL_EXPENSES, 
  INITIAL_BUDGETS, INITIAL_SAVINGS_GOALS, INITIAL_BILL_REMINDERS, 
  INITIAL_NOTIFICATIONS 
} from './mockData';
import { UserProfile, IncomeItem, ExpenseItem, BudgetItem, SavingsGoal, BillReminder, SystemNotification } from './types';

function MainApp() {
  const { theme, toggleTheme } = useTheme();

  // 1. Root Animation States
  const [initLoading, setInitLoading] = useState(true);
  const [loadingPct, setLoadingPct] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing Core Ledgers');

  // 2. Navigation State
  const [currentView, setCurrentView] = useState<'landing' | 'login' | 'signup' | 'forgot' | 'setup' | 'dashboard' | 'income' | 'expense' | 'budget' | 'transactions' | 'reports' | 'goals' | 'ai' | 'notifications' | 'profile' | 'settings' | 'admin'>('landing');

  // 3. Authenticated Identity States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('aura-profile');
    return saved ? JSON.parse(saved) : INITIAL_USER_PROFILE;
  });

  const [incomes, setIncomes] = useState<IncomeItem[]>(() => {
    const saved = localStorage.getItem('aura-incomes');
    return saved ? JSON.parse(saved) : INITIAL_INCOMES;
  });

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    const saved = localStorage.getItem('aura-expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [budgets, setBudgets] = useState<BudgetItem[]>(() => {
    const saved = localStorage.getItem('aura-budgets');
    return saved ? JSON.parse(saved) : INITIAL_BUDGETS;
  });

  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const saved = localStorage.getItem('aura-goals');
    return saved ? JSON.parse(saved) : INITIAL_SAVINGS_GOALS;
  });

  const [reminders, setReminders] = useState<BillReminder[]>(() => {
    const saved = localStorage.getItem('aura-reminders');
    return saved ? JSON.parse(saved) : INITIAL_BILL_REMINDERS;
  });

  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    const saved = localStorage.getItem('aura-notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // 4. Modal Popups
  const [showSalaryPopup, setShowSalaryPopup] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sync to Storage
  useEffect(() => {
    localStorage.setItem('aura-profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('aura-incomes', JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem('aura-expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('aura-budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('aura-goals', JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem('aura-reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('aura-notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Initial Boot Animation Simulator
  useEffect(() => {
    const texts = [
      'Initializing Core Quantum Ledgers...',
      'Compiling AI Prediction Vectors...',
      'Mapping Stashed Reserve Placements...',
      'Activating TLS Security Seals...',
      'Core Aura Brain Deployed.'
    ];

    const timer = setInterval(() => {
      setLoadingPct(prev => {
        const next = prev + 4;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => setInitLoading(false), 500);
          return 100;
        }
        // Change feedback text dynamically
        const textIndex = Math.min(Math.floor((next / 100) * texts.length), texts.length - 1);
        setLoadingText(texts[textIndex]);
        return next;
      });
    }, 80);

    return () => clearInterval(timer);
  }, []);

  // Handle Login success
  const handleAuthSuccess = (email: string) => {
    setIsLoggedIn(true);
    setUserProfile(prev => ({ ...prev, email }));
    
    // Check onboarding setup
    if (!userProfile.hasSetupProfile) {
      setCurrentView('setup');
    } else {
      setCurrentView('dashboard');
      // Show first login of month warning popup
      setTimeout(() => setShowSalaryPopup(true), 1500);
    }
  };

  const handleProfileSetupComplete = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setCurrentView('dashboard');
    setTimeout(() => setShowSalaryPopup(true), 1500);
  };

  // Sign out triggers
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('landing');
  };

  // State Modifers for Inflows
  const handleAddIncome = (item: IncomeItem) => {
    setIncomes((prev) => [item, ...prev]);
    // Append auto alert notification
    const alert: SystemNotification = {
      id: `not-${Date.now()}`,
      type: 'ai',
      title: 'Inflow Recorded',
      message: `A new inward flow of ₹${item.amount} from '${item.source}' has successfully settled.`,
      date: new Date().toISOString(),
      isRead: false
    };
    setNotifications(prev => [alert, ...prev]);
  };

  const handleEditIncome = (revised: IncomeItem) => {
    setIncomes((prev) => prev.map(item => item.id === revised.id ? revised : item));
  };

  const handleDeleteIncome = (id: string) => {
    setIncomes((prev) => prev.filter(item => item.id !== id));
  };

  // State Modifiers for Debits
  const handleAddExpense = (item: ExpenseItem) => {
    setExpenses((prev) => [item, ...prev]);
    
    // Check against budget thresholds
    const matchedBudget = budgets.find(b => b.category.toLowerCase() === item.category.toLowerCase());
    if (matchedBudget) {
      const spentNow = expenses
        .filter(e => e.category.toLowerCase() === item.category.toLowerCase())
        .reduce((sum, e) => sum + e.amount, 0) + item.amount;
      
      const ratioPct = (spentNow / matchedBudget.limit) * 100;
      if (ratioPct >= matchedBudget.alertThreshold) {
        const warning: SystemNotification = {
          id: `not-${Date.now()}`,
          type: 'budget',
          title: 'Budget Threshold Breached',
          message: `Your '${matchedBudget.category}' spent quota has hit ${Math.round(ratioPct)}% (₹${spentNow}/₹${matchedBudget.limit}).`,
          date: new Date().toISOString(),
          isRead: false
        };
        setNotifications(prev => [warning, ...prev]);
      }
    }
  };

  const handleEditExpense = (revised: ExpenseItem) => {
    setExpenses((prev) => prev.map(item => item.id === revised.id ? revised : item));
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter(item => item.id !== id));
  };

  const handleAddBudget = (b: BudgetItem) => {
    setBudgets((prev) => [...prev, b]);
  };

  const handleUpdateBudget = (revised: BudgetItem) => {
    setBudgets((prev) => prev.map(b => b.id === revised.id ? revised : b));
  };

  // State Modifiers for Savings Goals placements
  const handleAddGoalFunds = (id: string, amount: number) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === id) {
        const finalVal = goal.currentAmount + amount;
        
        // Notify user if completed
        if (finalVal >= goal.targetAmount && goal.currentAmount < goal.targetAmount) {
          const successAlert: SystemNotification = {
            id: `not-${Date.now()}`,
            type: 'goal',
            title: 'Goal Achieved!',
            message: `Congratulations! Your savings goal for '${goal.name}' has achieved 100% stashing.`,
            date: new Date().toISOString(),
            isRead: false
          };
          setNotifications(prev => [successAlert, ...prev]);
        }
        return { ...goal, currentAmount: Math.min(finalVal, goal.targetAmount) };
      }
      return goal;
    }));
  };

  const handleAddSavingsGoal = (newGoal: SavingsGoal) => {
    setGoals(prev => [...prev, newGoal]);
  };

  // Notification clear triggers
  const handleClearNotification = (id: string) => {
    setNotifications((prev) => prev.filter(n => n.id !== id));
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Monthly Salary Popup action handler
  const handleKeepPreviousSalary = () => {
    setShowSalaryPopup(false);
  };

  const handleUpdateSalary = (newVal: number) => {
    setUserProfile(prev => ({
      ...prev,
      monthlySalary: newVal,
      salaryHistory: [...prev.salaryHistory, { month: 'Jul 2026', amount: newVal }]
    }));
    setShowSalaryPopup(false);

    // Alert successful update
    const note: SystemNotification = {
      id: `not-${Date.now()}`,
      type: 'ai',
      title: 'Salary Index Adjusted',
      message: `Your base active salary parameters updated to ₹${newVal.toLocaleString()}.`,
      date: new Date().toISOString(),
      isRead: false
    };
    setNotifications(prev => [note, ...prev]);
  };

  if (initLoading) {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center font-sans select-none text-slate-100">
        <div className="text-center px-6 max-w-sm w-full space-y-6">
          
          {/* Circular Pulse Aura */}
          <div className="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping pointer-events-none" />
            <div className="relative w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.5)]">
              <span className="font-mono font-black text-2xl text-white">A</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-extrabold tracking-tight text-white font-sans">Aura Finance</h1>
            <p className="text-xs text-indigo-400 font-mono uppercase tracking-widest">{loadingText}</p>
          </div>

          {/* Core progress layout bar */}
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-100" style={{ width: `${loadingPct}%` }} />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-slate-500">
              <span>SYSTEM BOOT</span>
              <span>{loadingPct}% Complete</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard state routing layouts
  const isDashboardView = isLoggedIn && ['dashboard', 'income', 'expense', 'budget', 'transactions', 'reports', 'goals', 'ai', 'notifications', 'profile', 'settings', 'admin'].includes(currentView);

  return (
    <div className="min-h-screen text-slate-100 dark:text-slate-100 bg-slate-950 dark:bg-slate-950 light:text-slate-950 light:bg-slate-50 relative">
      
      {/* Interactive Laser Glow Cursor */}
      <CustomCursor />

      {/* PUBLIC GUEST AREA */}
      {!isLoggedIn && (
        <AnimatePresence mode="wait">
          {currentView === 'landing' && (
            <LandingPage 
              onGetStarted={() => setCurrentView('signup')} 
              onLogin={() => setCurrentView('login')} 
            />
          )}

          {(currentView === 'login' || currentView === 'signup' || currentView === 'forgot') && (
            <div className="min-h-screen flex items-center justify-center relative bg-slate-950">
              
              {/* Back ambient radial gradients */}
              <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,transparent_60%)] pointer-events-none" />
              
              <button 
                onClick={() => setCurrentView('landing')}
                className="absolute top-6 left-6 text-xs font-mono text-slate-400 hover:text-white"
              >
                &lt; BACK TO NET PUBLIC
              </button>

              <div className="relative z-10 w-full max-w-md mx-6">
                {currentView === 'login' && <LoginView onSuccess={handleAuthSuccess} onNavigate={setCurrentView} />}
                {currentView === 'signup' && <SignupView onSuccess={handleAuthSuccess} onNavigate={setCurrentView} />}
                {currentView === 'forgot' && <ForgotPasswordView onSuccess={handleAuthSuccess} onNavigate={setCurrentView} />}
              </div>
            </div>
          )}
        </AnimatePresence>
      )}

      {/* MULTI-STEP PROFILE SETUP ONBOARDING VIEW */}
      {isLoggedIn && currentView === 'setup' && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
          <FinancialProfileSetupView onComplete={handleProfileSetupComplete} />
        </div>
      )}

      {/* SECURED DASHBOARD NET CONTROLLER */}
      {isDashboardView && (
        <div className="min-h-screen flex">
          
          {/* GLOWING SIDEBAR WRAPPER */}
          {isSidebarOpen && (
            <aside className="w-64 border-r border-white/5 dark:border-white/5 light:border-black/5 bg-slate-950 dark:bg-slate-950 light:bg-white flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 z-20">
              <div>
                {/* Brand Header */}
                <div className="p-6 border-b border-white/5 dark:border-white/5 light:border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                      <span className="font-mono font-bold text-sm text-white">A</span>
                    </div>
                    <span className="font-extrabold text-sm text-white dark:text-white light:text-slate-900 tracking-tight">Aura Secure</span>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Nav Links */}
                <nav className="p-4 space-y-1 text-xs font-mono">
                  
                  {/* Dashboard link */}
                  <button 
                    onClick={() => setCurrentView('dashboard')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><Wallet className="w-4.5 h-4.5" /> LEDGER DASHBOARD</span>
                  </button>

                  <button 
                    onClick={() => setCurrentView('income')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'income' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><TrendingUp className="w-4.5 h-4.5" /> REVENUE FLOWS</span>
                  </button>

                  <button 
                    onClick={() => setCurrentView('expense')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'expense' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><TrendingDown className="w-4.5 h-4.5" /> OUTWARD DEBITS</span>
                  </button>

                  <button 
                    onClick={() => setCurrentView('budget')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'budget' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><Sliders className="w-4.5 h-4.5" /> BUDGET BOUNDS</span>
                  </button>

                  <button 
                    onClick={() => setCurrentView('transactions')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'transactions' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><ScrollText className="w-4.5 h-4.5" /> MASTER LEDGER</span>
                  </button>

                  <button 
                    onClick={() => setCurrentView('reports')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'reports' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><PieChart className="w-4.5 h-4.5" /> CHARTING REPORTS</span>
                  </button>

                  <button 
                    onClick={() => setCurrentView('goals')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'goals' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><Target className="w-4.5 h-4.5" /> COMPOUND GOALS</span>
                  </button>

                  <button 
                    onClick={() => setCurrentView('ai')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'ai' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><Cpu className="w-4.5 h-4.5 animate-pulse" /> AURA AI AGENT</span>
                  </button>

                  {/* Notifications */}
                  <button 
                    onClick={() => setCurrentView('notifications')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'notifications' ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><Bell className="w-4.5 h-4.5" /> ALERTS SIGNAL</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-pink-500 text-3xs font-black text-white">{unreadCount}</span>
                    )}
                  </button>

                  <button 
                    onClick={() => setCurrentView('admin')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${currentView === 'admin' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    <span className="flex items-center gap-2.5"><ShieldCheck className="w-4.5 h-4.5" /> ADMIN VIEW</span>
                  </button>
                </nav>
              </div>

              {/* Sidebar Identity bottom */}
              <div className="p-4 border-t border-white/5">
                <button 
                  onClick={() => setCurrentView('profile')}
                  className="w-full p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 transition-all text-left flex items-center gap-3"
                >
                  <img src={userProfile.avatar} alt={userProfile.name} className="w-9 h-9 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                  <div className="truncate flex-1">
                    <p className="text-xs font-bold text-white truncate leading-none">{userProfile.name}</p>
                    <span className="text-[9px] font-mono text-slate-500 truncate block mt-1">PRINCIPAL CONFIG</span>
                  </div>
                </button>

                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={() => setCurrentView('settings')}
                    className="p-2 flex-grow rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    <Settings className="w-4.5 h-4.5 mx-auto" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="p-2 flex-grow rounded-lg bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <LogOut className="w-4.5 h-4.5 mx-auto" />
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* MAIN SECURED CONTENT CHASSIS */}
          <main className="flex-1 min-w-0 flex flex-col min-h-screen relative overflow-x-hidden">
            
            {/* Top status bar indicator */}
            <header className="px-8 py-5 border-b border-white/5 dark:border-white/5 light:border-black/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {!isSidebarOpen && (
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                  >
                    <PanelLeft className="w-4.5 h-4.5" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono text-indigo-400 uppercase tracking-widest">{currentView}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-2xs font-mono text-slate-500 uppercase tracking-wider">AURA PROTOCOL ACTIVE</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                {/* Quick theme toggles */}
                <button 
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-white/5 text-indigo-400 hover:text-white transition-colors border border-white/10"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-pink-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                </button>
                <div className="hidden md:flex items-center gap-2 font-mono text-3xs text-slate-500">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>NODE_COMPILED_STABLE</span>
                </div>
              </div>
            </header>

            {/* SECURED CHASSIS PANEL VIEWS */}
            <div className="p-8 max-w-7xl w-full mx-auto flex-1">
              {currentView === 'dashboard' && (
                <DashboardView 
                  profile={userProfile} 
                  incomes={incomes} 
                  expenses={expenses} 
                  budgets={budgets} 
                  goals={goals} 
                  reminders={reminders}
                  onNavigate={setCurrentView}
                  onShowSalaryUpdate={() => setShowSalaryPopup(true)}
                />
              )}

              {currentView === 'income' && (
                <IncomePanel 
                  incomes={incomes} expenses={expenses} budgets={budgets}
                  onAddIncome={handleAddIncome} onEditIncome={handleEditIncome} onDeleteIncome={handleDeleteIncome}
                  onAddExpense={handleAddExpense} onEditExpense={handleEditExpense} onDeleteExpense={handleDeleteExpense}
                  onUpdateBudget={handleUpdateBudget} onAddBudget={handleAddBudget}
                />
              )}

              {currentView === 'expense' && (
                <ExpensePanel 
                  incomes={incomes} expenses={expenses} budgets={budgets}
                  onAddIncome={handleAddIncome} onEditIncome={handleEditIncome} onDeleteIncome={handleDeleteIncome}
                  onAddExpense={handleAddExpense} onEditExpense={handleEditExpense} onDeleteExpense={handleDeleteExpense}
                  onUpdateBudget={handleUpdateBudget} onAddBudget={handleAddBudget}
                />
              )}

              {currentView === 'budget' && (
                <BudgetPanel 
                  incomes={incomes} expenses={expenses} budgets={budgets}
                  onAddIncome={handleAddIncome} onEditIncome={handleEditIncome} onDeleteIncome={handleDeleteIncome}
                  onAddExpense={handleAddExpense} onEditExpense={handleEditExpense} onDeleteExpense={handleDeleteExpense}
                  onUpdateBudget={handleUpdateBudget} onAddBudget={handleAddBudget}
                />
              )}

              {currentView === 'transactions' && (
                <TransactionsPanel 
                  incomes={incomes} expenses={expenses} budgets={budgets}
                />
              )}

              {currentView === 'reports' && (
                <ReportsPanel 
                  incomes={incomes} expenses={expenses} budgets={budgets}
                />
              )}

              {currentView === 'goals' && (
                <GoalsPanel 
                  goals={goals} 
                  onAddGoalFunds={handleAddGoalFunds}
                  onAddSavingsGoal={handleAddSavingsGoal}
                />
              )}

              {currentView === 'ai' && (
                <AiAssistantPanel />
              )}

              {currentView === 'notifications' && (
                <NotificationsPanel 
                  notifications={notifications}
                  profile={userProfile}
                  onClearNotification={handleClearNotification}
                  onMarkNotificationRead={handleMarkNotificationRead}
                  onUpdateProfile={setUserProfile}
                />
              )}

              {currentView === 'profile' && (
                <ProfilePanel 
                  notifications={notifications}
                  profile={userProfile}
                  onClearNotification={handleClearNotification}
                  onMarkNotificationRead={handleMarkNotificationRead}
                  onUpdateProfile={setUserProfile}
                />
              )}

              {currentView === 'settings' && (
                <SettingsPanel />
              )}

              {currentView === 'admin' && (
                <AdminDashboardPanel />
              )}
            </div>

            {/* Dashboard Footer */}
            <footer className="mt-auto px-8 py-4 border-t border-white/5 dark:border-white/5 light:border-black/5 bg-slate-950/20 text-3xs font-mono text-slate-600 flex justify-between">
              <span>ACTIVE USER PROTOCOL SECURE // ISO_27001</span>
              <span>All assets represented are simulated.</span>
            </footer>
          </main>

        </div>
      )}

      {/* MONTHLY SALARY UPDATE POPUP COMPONENT (As requested) */}
      <AnimatePresence>
        {showSalaryPopup && (
          <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm p-6 rounded-3xl border border-white/10 bg-slate-900 text-slate-100 shadow-2xl relative"
            >
              <div className="text-center pb-5 mb-5 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-5 h-5 text-indigo-400 animate-bounce" />
                </div>
                <h3 className="text-base font-extrabold text-white">Monthly Salary Update</h3>
                <p className="text-[11px] text-slate-400 mt-1">Has your salary changed this month?</p>
              </div>

              <div className="space-y-3 font-sans text-xs">
                
                {/* Keep current block option */}
                <button 
                  onClick={handleKeepPreviousSalary}
                  className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 text-left transition-all"
                >
                  <p className="font-bold text-white">Keep Previous Salary</p>
                  <span className="text-[10px] text-slate-500 font-mono">Retain baseline vector at ₹{userProfile.monthlySalary.toLocaleString()}</span>
                </button>

                {/* Edit inline block option */}
                <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5">
                  <p className="font-bold text-white mb-2">Update Salary</p>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-indigo-400 font-bold">₹</span>
                    <input 
                      type="number"
                      placeholder="e.g. 7800"
                      className="w-full pl-7 pr-3 py-2 bg-slate-950 rounded-lg text-xs text-white border border-white/10 outline-none focus:border-indigo-500 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateSalary((e.target as any).value ? Number((e.target as any).value) : 7500);
                        }
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-1.5 font-mono">Press ENTER to register the new value</span>
                </div>

              </div>

              <div className="mt-5 flex justify-end">
                <button 
                  onClick={handleKeepPreviousSalary}
                  className="text-2xs font-mono text-slate-500 hover:text-white"
                >
                  RETAIN PREVIOUS INDEX
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
