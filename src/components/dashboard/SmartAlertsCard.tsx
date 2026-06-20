import React, { useState, useMemo } from 'react';
import { Bell, CheckCircle2, Target, AlertTriangle, Info, X, Check } from 'lucide-react';
import { SystemNotification } from '../../types';

interface SmartAlertsCardProps {
  notifications: SystemNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

type FilterType = 'all' | 'budget' | 'goal' | 'bill' | 'ai';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  budget: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
  goal: <Target className="w-3.5 h-3.5 text-indigo-400" />,
  bill: <Bell className="w-3.5 h-3.5 text-blue-400" />,
  ai: <Info className="w-3.5 h-3.5 text-purple-400" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
};

const TYPE_COLORS: Record<string, string> = {
  budget: 'border-l-orange-500/40',
  goal: 'border-l-indigo-500/40',
  bill: 'border-l-blue-500/40',
  ai: 'border-l-purple-500/40',
  warning: 'border-l-amber-500/40',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const SmartAlertsCard = React.memo<SmartAlertsCardProps>(({
  notifications, onMarkRead, onMarkAllRead, onDismiss,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');

  const unread = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notifications, filter]);

  const summary = useMemo(() => {
    const budgetCount = notifications.filter(n => n.type === 'budget' && !n.isRead).length;
    const goalCount = notifications.filter(n => n.type === 'goal' && !n.isRead).length;
    const parts: string[] = [];
    if (budgetCount) parts.push(`${budgetCount} budget alert${budgetCount > 1 ? 's' : ''}`);
    if (goalCount) parts.push(`${goalCount} goal update${goalCount > 1 ? 's' : ''}`);
    return parts.length ? `You have ${parts.join(' and ')}.` : null;
  }, [notifications]);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'budget', label: 'Budget' },
    { key: 'goal', label: 'Goal' },
    { key: 'bill', label: 'Bill' },
    { key: 'ai', label: 'AI' },
  ];

  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative p-2 rounded-xl bg-pink-500/10">
            <Bell className="w-4 h-4 text-pink-400" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center border border-slate-900">
                {unread}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Smart Alerts</h3>
            <p className="text-[10px] text-slate-400 font-mono">{unread} unread</p>
          </div>
        </div>
        {unread > 0 && (
          <button onClick={onMarkAllRead} className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors focus-ring">
            Mark all read
          </button>
        )}
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[10px] text-indigo-300 font-mono">
          {summary}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-colors focus-ring ${
              filter === f.key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500/40" />
          <p className="text-sm">All clear! No alerts.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto chat-scroll">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-3 rounded-xl border-l-4 border border-white/5 ${TYPE_COLORS[n.type] || 'border-l-slate-500/40'} ${!n.isRead ? 'bg-white/[0.02]' : 'opacity-60'}`}
            >
              <div className="flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type] || TYPE_ICONS.ai}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-white truncate">{n.title}</p>
                  <span className="text-[9px] font-mono text-slate-500 flex-shrink-0">{relativeTime(n.date)}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {!n.isRead && (
                  <button onClick={() => onMarkRead(n.id)} className="p-1 rounded text-slate-500 hover:text-emerald-400 transition-colors focus-ring" aria-label="Mark read">
                    <Check className="w-3 h-3" />
                  </button>
                )}
                <button onClick={() => onDismiss(n.id)} className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors focus-ring" aria-label="Dismiss">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
SmartAlertsCard.displayName = 'SmartAlertsCard';
