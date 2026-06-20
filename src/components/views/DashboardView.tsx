import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sliders, RefreshCw, LayoutGrid, ChevronDown, ChevronUp, Eye, EyeOff,
  Sparkles, TrendingUp, TrendingDown, ShieldCheck, Target, AlertCircle,
  ArrowUpRight, Activity, Landmark, Wallet, Plus
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
  RadialBarChart, RadialBar
} from 'recharts';
import { IncomeItem, ExpenseItem, BudgetItem, SavingsGoal, BillReminder, UserProfile, SystemNotification } from '../../types';

// Lazy-load heavy widget components
const FinancialHealthScoreCard = lazy(() =>
  import('../dashboard/FinancialHealthScoreCard')
);
const AIMonthlySummaryCard = lazy(() =>
  import('../dashboard/AIMonthlySummaryCard')
);
const SpendingInsightsCard = lazy(() =>
  import('../dashboard/SpendingInsightsCard')
);
const BudgetHealthCard = lazy(() =>
  import('../dashboard/BudgetHealthCard').then(m => ({ default: m.BudgetHealthCard }))
);
const CashFlowCard = lazy(() =>
  import('../dashboard/CashFlowCard').then(m => ({ default: m.CashFlowCard }))
);
const ForecastCard = lazy(() =>
  import('../dashboard/ForecastCard').then(m => ({ default: m.ForecastCard }))
);
const GoalProgressCard = lazy(() =>
  import('../dashboard/GoalProgressCard').then(m => ({ default: m.GoalProgressCard }))
);
const SmartAlertsCard = lazy(() =>
  import('../dashboard/SmartAlertsCard').then(m => ({ default: m.SmartAlertsCard }))
);
const DashboardPersonalizationPanel = lazy(() =>
  import('../dashboard/DashboardPersonalizationPanel').then(m => ({ default: m.DashboardPersonalizationPanel }))
);

// Widget configuration types
interface WidgetConfig {
  id: string;
  label: string;
  isVisible: boolean;
  isPinned: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'health',    label: 'Financial Health Score', isVisible: true,  isPinned: true,  order: 0 },
  { id: 'ai-summary',label: 'Monthly AI Summary',     isVisible: true,  isPinned: false, order: 1 },
  { id: 'kpi',       label: 'KPI Cards',              isVisible: true,  isPinned: true,  order: 2 },
  { id: 'charts',    label: 'Income vs Expense Chart', isVisible: true,  isPinned: false, order: 3 },
  { id: 'cashflow',  label: 'Cash Flow',              isVisible: true,  isPinned: false, order: 4 },
  { id: 'spending',  label: 'Spending Insights',      isVisible: true,  isPinned: false, order: 5 },
  { id: 'budget',    label: 'Budget Health',          isVisible: true,  isPinned: false, order: 6 },
  { id: 'forecast',  label: 'Financial Forecast',     isVisible: true,  isPinned: false, order: 7 },
  { id: 'goals',     label: 'Goal Progress',          isVisible: true,  isPinned: false, order: 8 },
  { id: 'alerts',    label: 'Smart Alerts',           isVisible: true,  isPinned: false, order: 9 },
];

const LAYOUT_KEY = 'aura-dashboard-layout';

function loadLayout(): WidgetConfig[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_WIDGETS;
}

// Skeleton card for lazy loading
const WidgetSkeleton = React.memo(() => (
  <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-3">
    <div className="flex items-center justify-between">
      <div className="skeleton-text w-32 h-3" />
      <div className="skeleton w-6 h-6 rounded-lg" />
    </div>
    <div className="skeleton-text w-full h-2" />
    <div className="skeleton-text w-3/4 h-2" />
    <div className="skeleton-text w-1/2 h-2" />
    <div className="skeleton w-full h-16 rounded-xl" />
  </div>
));
WidgetSkeleton.displayName = 'WidgetSkeleton';

// Custom tooltip for charts
const CustomTooltip = React.memo<{ active?: boolean; payload?: any[]; label?: string }>(
  ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-950/95 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-2xl">
        <p className="text-slate-400 mb-1 font-mono">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-300">{p.name}:</span>
            <span className="text-white font-bold">₹{(p.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
);
CustomTooltip.displayName = 'CustomTooltip';

// KPI Summary card
const KPICard = React.memo<{
  label: string; value: string; subtext?: string;
  icon: React.ReactNode; color: string; trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}>(({ label, value, subtext, icon, color, trend, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    onClick={onClick}
    className={`bg-slate-900/50 border border-white/5 rounded-2xl p-5 cursor-pointer hover:border-white/10 transition-all ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl`} style={{ background: `${color}15` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      {trend && (
        <span className={`text-[10px] font-mono flex items-center gap-0.5 ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          {trend === 'up' ? '+' : trend === 'down' ? '-' : '~'}
        </span>
      )}
    </div>
    <p className="text-2xl font-black text-white tracking-tight">{value}</p>
    <p className="text-xs font-medium text-slate-400 mt-0.5">{label}</p>
    {subtext && <p className="text-[10px] text-slate-500 font-mono mt-1">{subtext}</p>}
  </motion.div>
));
KPICard.displayName = 'KPICard';

interface DashboardProps {
  profile: UserProfile;
  userId: string;
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  budgets: BudgetItem[];
  goals: SavingsGoal[];
  reminders: BillReminder[];
  notifications: SystemNotification[];
  onNavigate: (view: any) => void;
  onShowSalaryUpdate: () => void;
  onMarkNotificationRead: (id: string) => void;
  onClearNotification: (id: string) => void;
}

export const DashboardView = React.memo<DashboardProps>((props) => {
  const {
    profile, userId, incomes, expenses, budgets, goals,
    notifications, onNavigate, onMarkNotificationRead, onClearNotification
  } = props;

  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadLayout);
  const [collapsedWidgets, setCollapsedWidgets] = useState<Set<string>>(new Set());
  const [showPersonalization, setShowPersonalization] = useState(false);
  const [chartsLoaded, setChartsLoaded] = useState(false);

  // Defer chart rendering for faster initial load
  useEffect(() => {
    const t = setTimeout(() => setChartsLoaded(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Memoized financial computations
  const totalIncome = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netBalance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);
  const savingsRate = useMemo(() =>
    totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0,
    [totalIncome, totalExpenses]
  );

  const healthScore = useMemo(() => {
    const monthlyFixed = profile.rent + profile.fixedExpenses + profile.monthlyBills + profile.emiLoans;
    const coverageRatio = monthlyFixed > 0 ? profile.currentSavings / monthlyFixed : 10;
    return Math.min(Math.round((coverageRatio / 6) * 100), 100);
  }, [profile]);

  // Build real chart data from transactions
  const incomeVsExpenseData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[key] = { income: 0, expense: 0 };
    }

    incomes.forEach(item => {
      const d = new Date(item.date);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (months[key] !== undefined) months[key].income += item.amount;
    });

    expenses.forEach(item => {
      const d = new Date(item.date);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (months[key] !== undefined) months[key].expense += item.amount;
    });

    return Object.entries(months).map(([name, v]) => ({
      name,
      Income: v.income,
      Expense: v.expense,
    }));
  }, [incomes, expenses]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#a855f7'];
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }));
  }, [expenses]);

  const handleSaveLayout = useCallback((config: WidgetConfig[]) => {
    setWidgets(config);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(config));
    setShowPersonalization(false);
  }, []);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedWidgets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleMarkAllRead = useCallback(() => {
    notifications.forEach(n => { if (!n.isRead) onMarkNotificationRead(n.id); });
  }, [notifications, onMarkNotificationRead]);

  const sortedWidgets = useMemo(() =>
    [...widgets].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.order - b.order;
    }),
    [widgets]
  );

  // Widget wrapper with collapse/hide support
  const WidgetWrapper = useCallback(({
    id, children, className = ''
  }: { id: string; children: React.ReactNode; className?: string }) => {
    const config = sortedWidgets.find(w => w.id === id);
    if (!config?.isVisible) return null;
    const isCollapsed = collapsedWidgets.has(id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={className}
      >
        <div className="relative group">
          {/* Widget header controls */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => toggleCollapse(id)}
              className="p-1 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
              aria-label={isCollapsed ? 'Expand widget' : 'Collapse widget'}
            >
              {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
          {isCollapsed && (
            <div
              className="bg-slate-900/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between cursor-pointer"
              onClick={() => toggleCollapse(id)}
            >
              <span className="text-xs text-slate-400">{config.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </div>
          )}
        </div>
      </motion.div>
    );
  }, [sortedWidgets, collapsedWidgets, toggleCollapse]);

  return (
    <div className="space-y-6">

      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white">Quantum Ledger Node</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Principal: <span className="font-mono text-indigo-400">{profile.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('ai')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 text-xs font-bold transition-all focus-ring"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Ask Aura AI
          </button>
          <button
            onClick={() => setShowPersonalization(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 text-xs font-bold transition-all focus-ring"
            aria-label="Personalize dashboard layout"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Customize
          </button>
        </div>
      </div>

      {/* KPI Summary Row */}
      <WidgetWrapper id="kpi">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Income" value={`₹${totalIncome.toLocaleString()}`}
            subtext="This period" icon={<TrendingUp className="w-5 h-5" />}
            color="#10b981" trend="up" onClick={() => onNavigate('income')}
          />
          <KPICard
            label="Total Expenses" value={`₹${totalExpenses.toLocaleString()}`}
            subtext="This period" icon={<TrendingDown className="w-5 h-5" />}
            color="#ef4444" trend="down" onClick={() => onNavigate('expense')}
          />
          <KPICard
            label="Net Balance" value={`₹${netBalance.toLocaleString()}`}
            subtext={netBalance >= 0 ? 'Surplus' : 'Deficit'}
            icon={<Wallet className="w-5 h-5" />}
            color={netBalance >= 0 ? '#6366f1' : '#ef4444'}
            trend={netBalance >= 0 ? 'up' : 'down'}
          />
          <KPICard
            label="Savings Rate" value={`${savingsRate}%`}
            subtext={`₹${profile.currentSavings.toLocaleString()} total`}
            icon={<ShieldCheck className="w-5 h-5" />}
            color="#f59e0b" trend="neutral"
          />
        </div>
      </WidgetWrapper>

      {/* Financial Health + AI Summary (side by side) */}
      <div className="grid lg:grid-cols-2 gap-4">
        <WidgetWrapper id="health">
          <Suspense fallback={<WidgetSkeleton />}>
            <FinancialHealthScoreCard
              score={healthScore}
              monthlyIncome={totalIncome}
              monthlyExpenses={totalExpenses}
              savings={profile.currentSavings}
            />
          </Suspense>
        </WidgetWrapper>

        <WidgetWrapper id="ai-summary">
          <Suspense fallback={<WidgetSkeleton />}>
            <AIMonthlySummaryCard userId={userId} />
          </Suspense>
        </WidgetWrapper>
      </div>

      {/* Income vs Expense Chart */}
      <WidgetWrapper id="charts">
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Income vs Expense</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Last 6 months · Real data</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 focus-ring"
            >
              Full Report <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {chartsLoaded ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeVsExpenseData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={50}
                    tickFormatter={v => `₹${v >= 1000 ? `${Math.round(v/1000)}k` : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }} />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expense" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <WidgetSkeleton />}
        </div>
      </WidgetWrapper>

      {/* Cash Flow + Spending Insights */}
      <div className="grid lg:grid-cols-2 gap-4">
        <WidgetWrapper id="cashflow">
          <Suspense fallback={<WidgetSkeleton />}>
            <CashFlowCard incomes={incomes} expenses={expenses} />
          </Suspense>
        </WidgetWrapper>

        <WidgetWrapper id="spending">
          <Suspense fallback={<WidgetSkeleton />}>
            <SpendingInsightsCard expenses={expenses} />
          </Suspense>
        </WidgetWrapper>
      </div>

      {/* Budget Health + Category Breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        <WidgetWrapper id="budget">
          <Suspense fallback={<WidgetSkeleton />}>
            <BudgetHealthCard budgets={budgets} expenses={expenses} />
          </Suspense>
        </WidgetWrapper>

        {/* Category Breakdown Pie */}
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Category Breakdown</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Expense distribution</p>
            </div>
          </div>
          {chartsLoaded && categoryData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-40 h-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={36} outerRadius={60}
                      dataKey="value" paddingAngle={3}>
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {categoryData.map((cat, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                      <span className="text-slate-300 truncate max-w-[80px]">{cat.name}</span>
                    </div>
                    <span className="font-mono text-slate-400">₹{cat.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">No expense data</div>
          )}
        </div>
      </div>

      {/* Forecast + Goals */}
      <div className="grid lg:grid-cols-2 gap-4">
        <WidgetWrapper id="forecast">
          <Suspense fallback={<WidgetSkeleton />}>
            <ForecastCard incomes={incomes} expenses={expenses} savings={profile.currentSavings} />
          </Suspense>
        </WidgetWrapper>

        <WidgetWrapper id="goals">
          <Suspense fallback={<WidgetSkeleton />}>
            <GoalProgressCard goals={goals} />
          </Suspense>
        </WidgetWrapper>
      </div>

      {/* Smart Alerts */}
      <WidgetWrapper id="alerts">
        <Suspense fallback={<WidgetSkeleton />}>
          <SmartAlertsCard
            notifications={notifications}
            onMarkRead={onMarkNotificationRead}
            onMarkAllRead={handleMarkAllRead}
            onDismiss={onClearNotification}
          />
        </Suspense>
      </WidgetWrapper>

      {/* Personalization Panel */}
      <AnimatePresence>
        {showPersonalization && (
          <Suspense fallback={null}>
            <DashboardPersonalizationPanel
              widgetConfig={widgets}
              onSave={handleSaveLayout}
              onClose={() => setShowPersonalization(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
});

DashboardView.displayName = 'DashboardView';
