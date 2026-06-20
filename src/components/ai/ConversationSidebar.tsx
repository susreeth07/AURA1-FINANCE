import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Pin, Pencil, Download, Trash2, Clock,
  MessageSquare, Ghost
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationEntry {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  isPinned: boolean;
  messageCount: number;
}

interface ConversationSidebarProps {
  conversations: ConversationEntry[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onPin: (id: string) => void;
  onExport: (id: string) => void;
  onSearch: (q: string) => void;
  isOpen: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

// ─── Conversation Item ────────────────────────────────────────────────────────

interface ConvItemProps {
  entry: ConversationEntry;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onPin: (id: string) => void;
  onExport: (id: string) => void;
}

const ConvItem = React.memo(({
  entry, isActive, onSelect, onDelete, onRename, onPin, onExport
}: ConvItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(entry.title);

  const commitRename = useCallback(() => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== entry.title) onRename(entry.id, trimmed);
    else setDraftName(entry.title);
    setIsEditing(false);
  }, [draftName, entry.id, entry.title, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') { setDraftName(entry.title); setIsEditing(false); }
  }, [commitRename, entry.title]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      className={`group relative rounded-xl px-3 py-2.5 cursor-pointer transition-colors select-none ${
        isActive
          ? 'bg-indigo-600/15 border-l-2 border-indigo-500'
          : 'hover:bg-white/5 border-l-2 border-transparent'
      }`}
      onClick={() => !isEditing && onSelect(entry.id)}
      onDoubleClick={() => setIsEditing(true)}
      role="button"
      aria-selected={isActive}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' && !isEditing) onSelect(entry.id); }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              className="w-full text-xs font-semibold bg-slate-800 border border-indigo-500/50 rounded px-1.5 py-0.5 text-white outline-none focus:border-indigo-400"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-200 truncate">{entry.title}</span>
              {entry.isPinned && (
                <Pin className="w-2.5 h-2.5 text-amber-400 shrink-0" aria-label="Pinned" />
              )}
            </div>
          )}
          <p className="text-[10px] text-slate-500 truncate mt-0.5">{entry.lastMessage}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[10px] text-slate-600">{relativeTime(entry.timestamp)}</span>
          <span className="text-[9px] text-slate-700">{entry.messageCount} msgs</span>
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute inset-y-0 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-slate-900/90 via-slate-900/80 to-transparent pl-4 rounded-r-xl">
        <button
          onClick={(e) => { e.stopPropagation(); onPin(entry.id); }}
          aria-label={entry.isPinned ? 'Unpin' : 'Pin'}
          title={entry.isPinned ? 'Unpin' : 'Pin'}
          className="p-1 rounded text-slate-500 hover:text-amber-400 transition-colors"
        >
          <Pin className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          aria-label="Rename"
          title="Rename"
          className="p-1 rounded text-slate-500 hover:text-indigo-400 transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onExport(entry.id); }}
          aria-label="Export"
          title="Export"
          className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Download className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          aria-label="Delete"
          title="Delete"
          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
});
ConvItem.displayName = 'ConvItem';

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export const ConversationSidebar = React.memo(({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onPin,
  onExport,
  onSearch,
  isOpen,
}: ConversationSidebarProps) => {
  const [localSearch, setLocalSearch] = useState('');

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    onSearch(e.target.value);
  }, [onSearch]);

  const filtered = useMemo(() => {
    const q = localSearch.toLowerCase();
    return conversations.filter(c =>
      c.title.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, localSearch]);

  const pinned = useMemo(() => filtered.filter(c => c.isPinned), [filtered]);
  const recent = useMemo(() => filtered.filter(c => !c.isPinned), [filtered]);

  const itemProps = { onSelect, onDelete, onRename, onPin, onExport };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: -288, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -288, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="w-64 flex flex-col h-full bg-slate-950/80 backdrop-blur-xl border-r border-white/5 shrink-0 overflow-hidden"
          aria-label="Conversation history"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-300">Conversations</span>
            </div>
            <button
              onClick={onNew}
              aria-label="New conversation"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 hover:text-indigo-200 transition-colors focus-ring"
            >
              <Plus className="w-3 h-3" />
              New
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input
                type="search"
                placeholder="Search conversations..."
                value={localSearch}
                onChange={handleSearchChange}
                aria-label="Search conversations"
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/8 text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40 focus:bg-white/8 transition-colors"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <Ghost className="w-8 h-8 text-slate-700" />
                <p className="text-xs text-slate-600">No conversations yet</p>
                <button
                  onClick={onNew}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Start one →
                </button>
              </div>
            ) : (
              <>
                {pinned.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                      <Pin className="w-2.5 h-2.5 text-amber-500" />
                      <span className="text-[10px] font-semibold text-amber-500/70 uppercase tracking-wider">Pinned</span>
                    </div>
                    <AnimatePresence>
                      {pinned.map(c => (
                        <ConvItem key={c.id} entry={c} isActive={c.id === activeId} {...itemProps} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {recent.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 mb-1 mt-2">
                      <Clock className="w-2.5 h-2.5 text-slate-500" />
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Recent</span>
                    </div>
                    <AnimatePresence>
                      {recent.map(c => (
                        <ConvItem key={c.id} entry={c} isActive={c.id === activeId} {...itemProps} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
});

ConversationSidebar.displayName = 'ConversationSidebar';
