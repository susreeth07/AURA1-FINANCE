import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Command, TrendingUp, TrendingDown, Sliders, ScrollText,
  PieChart, Target, Sparkles, Bell, User, Settings, Plus, FileText,
  Home, ArrowRight, MessageSquare
} from 'lucide-react';

type CommandView =
  | 'dashboard' | 'income' | 'expense' | 'budget'
  | 'transactions' | 'reports' | 'goals' | 'ai'
  | 'notifications' | 'profile' | 'settings' | 'admin' | 'reports-center';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action' | 'ai';
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: CommandView) => void;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onCreateBudget?: () => void;
  onCreateGoal?: () => void;
  onOpenAI?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  navigation: 'Navigation',
  action: 'Quick Actions',
  ai: 'Aura AI',
};

export const CommandPalette = React.memo<CommandPaletteProps>(({
  isOpen,
  onClose,
  onNavigate,
  onAddIncome,
  onAddExpense,
  onCreateBudget,
  onCreateGoal,
  onOpenAI,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<CommandItem[]>(() => [
    // Navigation
    {
      id: 'nav-dashboard', label: 'Open Dashboard', description: 'Go to your financial overview',
      icon: <Home className="w-4 h-4" />, category: 'navigation',
      shortcut: 'G D', action: () => { onNavigate('dashboard'); onClose(); }
    },
    {
      id: 'nav-income', label: 'Revenue Flows', description: 'Manage income sources',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, category: 'navigation',
      shortcut: 'G I', action: () => { onNavigate('income'); onClose(); }
    },
    {
      id: 'nav-expense', label: 'Outward Debits', description: 'Track your expenses',
      icon: <TrendingDown className="w-4 h-4 text-rose-400" />, category: 'navigation',
      shortcut: 'G E', action: () => { onNavigate('expense'); onClose(); }
    },
    {
      id: 'nav-budget', label: 'Budget Bounds', description: 'Set and manage budgets',
      icon: <Sliders className="w-4 h-4 text-amber-400" />, category: 'navigation',
      shortcut: 'G B', action: () => { onNavigate('budget'); onClose(); }
    },
    {
      id: 'nav-transactions', label: 'Master Ledger', description: 'View all transactions',
      icon: <ScrollText className="w-4 h-4 text-blue-400" />, category: 'navigation',
      shortcut: 'G T', action: () => { onNavigate('transactions'); onClose(); }
    },
    {
      id: 'nav-reports', label: 'Charting Reports', description: 'Financial analytics & charts',
      icon: <PieChart className="w-4 h-4 text-purple-400" />, category: 'navigation',
      shortcut: 'G R', action: () => { onNavigate('reports'); onClose(); }
    },
    {
      id: 'nav-reports-center', label: 'Report Center', description: 'Generate AI executive statements',
      icon: <FileText className="w-4 h-4 text-indigo-400" />, category: 'navigation',
      shortcut: 'G C', action: () => { onNavigate('reports-center'); onClose(); }
    },
    {
      id: 'nav-goals', label: 'Compound Goals', description: 'Savings goals & milestones',
      icon: <Target className="w-4 h-4 text-indigo-400" />, category: 'navigation',
      action: () => { onNavigate('goals'); onClose(); }
    },
    {
      id: 'nav-notifications', label: 'Alerts Signal', description: 'Notifications & alerts',
      icon: <Bell className="w-4 h-4 text-pink-400" />, category: 'navigation',
      action: () => { onNavigate('notifications'); onClose(); }
    },
    {
      id: 'nav-profile', label: 'Profile', description: 'Manage your account',
      icon: <User className="w-4 h-4" />, category: 'navigation',
      action: () => { onNavigate('profile'); onClose(); }
    },
    {
      id: 'nav-settings', label: 'Settings', description: 'Application settings',
      icon: <Settings className="w-4 h-4" />, category: 'navigation',
      action: () => { onNavigate('settings'); onClose(); }
    },
    // Quick Actions
    {
      id: 'action-add-income', label: 'Add Income', description: 'Record a new income entry',
      icon: <Plus className="w-4 h-4 text-emerald-400" />, category: 'action',
      action: () => { onAddIncome?.(); onNavigate('income'); onClose(); }
    },
    {
      id: 'action-add-expense', label: 'Add Expense', description: 'Record a new expense',
      icon: <Plus className="w-4 h-4 text-rose-400" />, category: 'action',
      action: () => { onAddExpense?.(); onNavigate('expense'); onClose(); }
    },
    {
      id: 'action-create-budget', label: 'Create Budget', description: 'Set a new budget category',
      icon: <Sliders className="w-4 h-4 text-amber-400" />, category: 'action',
      action: () => { onCreateBudget?.(); onNavigate('budget'); onClose(); }
    },
    {
      id: 'action-create-goal', label: 'Create Savings Goal', description: 'Start a new savings goal',
      icon: <Target className="w-4 h-4 text-indigo-400" />, category: 'action',
      action: () => { onCreateGoal?.(); onNavigate('goals'); onClose(); }
    },
    {
      id: 'action-export', label: 'Export Report', description: 'Download financial report',
      icon: <FileText className="w-4 h-4 text-slate-400" />, category: 'action',
      action: () => { onNavigate('reports'); onClose(); }
    },
    // AI
    {
      id: 'ai-ask', label: 'Ask Aura AI', description: 'Open the AI financial assistant',
      icon: <MessageSquare className="w-4 h-4 text-indigo-400" />, category: 'ai',
      shortcut: 'Ctrl+K', action: () => { onOpenAI?.(); onNavigate('ai'); onClose(); }
    },
    {
      id: 'ai-forecast', label: 'Financial Forecast', description: 'Ask Aura for a cash flow forecast',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />, category: 'ai',
      action: () => { onOpenAI?.(); onNavigate('ai'); onClose(); }
    },
  ], [onNavigate, onClose, onAddIncome, onAddExpense, onCreateBudget, onCreateGoal, onOpenAI]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  }, [query, commands]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, [filtered]);

  // Reset index when filtered changes
  useEffect(() => { setActiveIndex(0); }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[activeIndex]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, activeIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const item = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Global flat index for keyboard nav
  let flatIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 command-backdrop z-[9995]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="cmd-panel"
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl command-panel rounded-2xl z-[9996] overflow-hidden"
            role="dialog"
            aria-label="Command palette"
            aria-modal="true"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
              <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search commands, pages, actions…"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                aria-label="Command search"
                role="combobox"
                aria-expanded="true"
                aria-autocomplete="list"
              />
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-slate-400">ESC</kbd>
              </div>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[400px] overflow-y-auto chat-scroll py-2" role="listbox">
              {filtered.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No commands found for "{query}"
                </div>
              )}

              {Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-4 py-1.5 text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                    {CATEGORY_LABELS[category] || category}
                  </div>
                  {(items as CommandItem[]).map(item => {
                    flatIndex++;
                    const idx = flatIndex;
                    return (
                      <button
                        key={item.id}
                        data-index={idx}
                        onClick={item.action}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors focus-ring ${
                          activeIndex === idx
                            ? 'bg-indigo-600/20 text-white'
                            : 'text-slate-300 hover:bg-white/[0.04]'
                        }`}
                        role="option"
                        aria-selected={activeIndex === idx}
                      >
                        <span className={`flex-shrink-0 ${activeIndex === idx ? 'text-indigo-400' : 'text-slate-500'}`}>
                          {item.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-none">{item.label}</p>
                          {item.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.description}</p>
                          )}
                        </div>
                        {item.shortcut && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {item.shortcut.split(' ').map((k, i) => (
                              <kbd key={i} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-slate-400">
                                {k}
                              </kbd>
                            ))}
                          </div>
                        )}
                        <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 transition-opacity ${activeIndex === idx ? 'opacity-100 text-indigo-400' : 'opacity-0'}`} />
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-mono text-slate-600">
              <div className="flex items-center gap-3">
                <span><kbd className="text-slate-500">↑↓</kbd> navigate</span>
                <span><kbd className="text-slate-500">↵</kbd> select</span>
                <span><kbd className="text-slate-500">ESC</kbd> close</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Command className="w-3 h-3 text-indigo-500" />
                <span className="text-indigo-600">Aura Command</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

CommandPalette.displayName = 'CommandPalette';
