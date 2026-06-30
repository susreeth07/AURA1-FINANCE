import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Send, X, ChevronDown, Square, RotateCcw, Copy,
  Edit2, Check, AlertTriangle, PanelLeft, PanelLeftClose, Loader
} from 'lucide-react';
import { AuraAI } from '../../ai/AuraAI';
import { AuraResponse } from '../../ai/models/AuraResponse';
import { AuraMessageBubble } from './AuraMessageBubble';
import { ConversationSidebar, ConversationEntry } from './ConversationSidebar';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  auraResponse?: AuraResponse;
  isStreaming?: boolean;
  hasFailed?: boolean;
  editedText?: string;
}

interface PendingAction {
  type: 'navigate' | 'addIncome' | 'addExpense';
  description: string;
  payload?: any;
}

interface AuraChatInterfaceProps {
  userId: string;
  onAddIncome?: (item: any) => void;
  onAddExpense?: (item: any) => void;
  onNavigate?: (view: string) => void;
}

const STARTERS = [
  'Summarize my finances this month',
  'Which budget categories am I overspending?',
  'When can I reach my savings goal?',
  'Show my top spending categories',
  'What is my net cash flow?',
  'Give me a 3-month financial forecast',
];

function generateConvTitle(msg: string): string {
  return msg.length > 40 ? msg.slice(0, 40) + '…' : msg;
}

const ThinkingBubble = React.memo(() => (
  <div className="flex items-start gap-3" role="status" aria-label="Aura AI is thinking">
    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
      <Loader className="w-4 h-4 text-white animate-spin" />
    </div>
    <div className="ai-bubble px-4 py-3 rounded-2xl rounded-tl-sm max-w-xs">
      <div className="flex items-center gap-2">
        <span className="thinking-dot w-2 h-2 rounded-full bg-indigo-400" />
        <span className="thinking-dot w-2 h-2 rounded-full bg-indigo-400" />
        <span className="thinking-dot w-2 h-2 rounded-full bg-indigo-400" />
        <span className="text-xs text-slate-500 font-mono ml-1">Aura is thinking…</span>
      </div>
    </div>
  </div>
));
ThinkingBubble.displayName = 'ThinkingBubble';

export const AuraChatInterface = React.memo<AuraChatInterfaceProps>(({
  userId, onAddIncome, onAddExpense, onNavigate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('default');

  const stopRef = useRef(false);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize AuraAI
  useEffect(() => {
    try { AuraAI.initialize('production'); } catch { /* already initialized */ }
    // Init default conversation
    const initConv: ConversationEntry = {
      id: 'default', title: 'New Chat', lastMessage: 'Start a conversation…',
      timestamp: new Date(), isPinned: false, messageCount: 0,
    };
    setConversations([initConv]);
    
    // Close sidebar by default on mobile viewports
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Track scroll for scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollTop < el.scrollHeight - el.clientHeight - 100);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Detect natural language actions
  const detectAction = useCallback((text: string): PendingAction | null => {
    if (/\b(create|set|add)\s+a?\s*budget/i.test(text)) {
      return { type: 'navigate', description: 'Navigate to Budget Bounds to create a new budget', payload: 'budget' };
    }
    if (/\b(create|add|new)\s+(savings\s+)?goal/i.test(text)) {
      return { type: 'navigate', description: 'Navigate to Compound Goals to create a new goal', payload: 'goals' };
    }
    if (/\b(add|record|log)\s+(income|salary|revenue)/i.test(text)) {
      return { type: 'addIncome', description: 'Navigate to Revenue Flows to add income', payload: null };
    }
    if (/\b(add|record|log)\s+(expense|spending|payment|purchase)/i.test(text)) {
      return { type: 'addExpense', description: 'Navigate to Outward Debits to add expense', payload: null };
    }
    return null;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking || streamingId) return;

    const trimmed = text.trim();

    // Check for action intent
    const action = detectAction(trimmed);
    if (action) {
      // Add user message then show confirmation
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`, sender: 'user', text: trimmed, timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setPendingAction(action);
      return;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`, sender: 'user', text: trimmed, timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setFollowUps([]);
    setIsThinking(true);
    stopRef.current = false;

    // Update conversation
    setConversations(prev => prev.map(c =>
      c.id === activeConvId
        ? { ...c, title: generateConvTitle(trimmed), lastMessage: trimmed, timestamp: new Date(), messageCount: c.messageCount + 1 }
        : c
    ));

    try {
      const response = await AuraAI.query(userId, trimmed, { conversationId: activeConvId });
      if (stopRef.current) { setIsThinking(false); return; }

      const aiId = `ai-${Date.now()}`;
      const fullText = response.answer;

      const aiMsg: ChatMessage = {
        id: aiId, sender: 'ai', text: '', timestamp: new Date(),
        auraResponse: response, isStreaming: true,
      };
      setMessages(prev => [...prev, aiMsg]);
      setStreamingId(aiId);
      setIsThinking(false);

      // Streaming simulation
      let idx = 0;
      streamIntervalRef.current = setInterval(() => {
        if (stopRef.current) {
          clearInterval(streamIntervalRef.current!);
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: fullText, isStreaming: false } : m));
          setStreamingId(null);
          return;
        }
        idx = Math.min(idx + 4, fullText.length); // 4 chars at a time for speed
        const chunk = fullText.slice(0, idx);
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: chunk } : m));
        if (idx >= fullText.length) {
          clearInterval(streamIntervalRef.current!);
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, isStreaming: false } : m));
          setStreamingId(null);
          if (response.followUpQuestions?.length) {
            setFollowUps([...response.followUpQuestions].slice(0, 3));
          }
        }
      }, 20);
    } catch (err) {
      setIsThinking(false);
      setStreamingId(null);
      const failMsg: ChatMessage = {
        id: `ai-${Date.now()}`, sender: 'ai', hasFailed: true,
        text: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, failMsg]);
    }
  }, [userId, isThinking, streamingId, detectAction, activeConvId]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    setStreamingId(null);
    setIsThinking(false);
    setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m));
  }, []);

  const handleRegenerate = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.sender === 'user');
    if (lastUser) {
      setMessages(prev => prev.filter(m => m.id !== messages[messages.length - 1]?.id));
      sendMessage(lastUser.text);
    }
  }, [messages, sendMessage]);

  const handleEditSubmit = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => {
      const idx = prev.findIndex(x => x.id === id);
      return prev.indexOf(m) <= idx;
    }).map(m => m.id === id ? { ...m, text: editText, editedText: editText } : m));
    setEditingId(null);
    sendMessage(editText);
  }, [editText, sendMessage]);

  const handleConfirmAction = useCallback(() => {
    if (!pendingAction) return;
    if (pendingAction.type === 'navigate') onNavigate?.(pendingAction.payload);
    else if (pendingAction.type === 'addIncome') { onAddIncome?.({}); onNavigate?.('income'); }
    else if (pendingAction.type === 'addExpense') { onAddExpense?.({}); onNavigate?.('expense'); }
    setPendingAction(null);
  }, [pendingAction, onNavigate, onAddIncome, onAddExpense]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  // Textarea auto-grow
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, []);

  const handleNewConversation = useCallback(() => {
    const newConv: ConversationEntry = {
      id: `conv-${Date.now()}`, title: 'New Chat', lastMessage: 'Start a conversation…',
      timestamp: new Date(), isPinned: false, messageCount: 0,
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setMessages([]);
    setFollowUps([]);
    setPendingAction(null);
  }, []);

  const handleConvSearch = useCallback((_q: string) => {
    // Could filter conversations here - passed to sidebar
  }, []);

  return (
    <div className="flex h-[calc(100vh-13rem)] rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40 relative">
      {/* Conversation Sidebar Backdrop on Mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-slate-950/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Conversation Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute md:relative inset-y-0 left-0 md:inset-auto z-30 md:z-auto bg-slate-950 md:bg-transparent flex-shrink-0 overflow-hidden border-r border-white/5 h-full"
          >
            <ConversationSidebar
              conversations={conversations}
              activeId={activeConvId}
              isOpen={sidebarOpen}
              onSelect={setActiveConvId}
              onNew={handleNewConversation}
              onDelete={id => setConversations(prev => prev.filter(c => c.id !== id))}
              onRename={(id, name) => setConversations(prev => prev.map(c => c.id === id ? { ...c, title: name } : c))}
              onPin={id => setConversations(prev => prev.map(c => c.id === id ? { ...c, isPinned: !c.isPinned } : c))}
              onExport={_id => {}}
              onSearch={handleConvSearch}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-slate-950/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(s => !s)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-ring"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Aura AI Financial Intelligence</p>
              <p className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest">
                {isThinking ? 'THINKING…' : streamingId ? 'GENERATING…' : 'COGNITIVE_NODE_ACTIVE'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AURA_ONLINE
            </span>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto chat-scroll p-5 space-y-5"
          role="log"
          aria-label="Conversation"
          aria-live="polite"
        >
          {/* Welcome screen */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full py-12 space-y-8 text-center"
            >
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/40">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-extrabold text-white">Aura AI Financial Intelligence</h3>
                <p className="text-sm text-slate-400 max-w-md">
                  Ask me anything about your finances. I'll analyze your data and provide actionable insights.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {STARTERS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-indigo-500/30 hover:bg-indigo-500/5 text-left text-xs text-slate-300 transition-all focus-ring"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="max-w-2xl min-w-0">
                {editingId === msg.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-indigo-900/50 border border-indigo-500/30 text-sm text-white outline-none resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditSubmit(msg.id)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 focus-ring">
                        <Check className="w-3.5 h-3.5 inline mr-1" />Send
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs hover:bg-white/10 focus-ring">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <AuraMessageBubble
                    message={msg.text}
                    sender={msg.sender}
                    timestamp={msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    isStreaming={msg.isStreaming}
                    auraResponse={msg.auraResponse}
                    onFollowUp={sendMessage}
                    onCopy={() => handleCopy(msg.text)}
                    onRegenerate={msg.sender === 'ai' && !msg.isStreaming ? handleRegenerate : undefined}
                  />
                )}

                {/* User message actions */}
                {msg.sender === 'user' && !editingId && (
                  <div className="flex justify-end mt-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(msg.id); setEditText(msg.text); }}
                      className="p-1 rounded-lg text-slate-600 hover:text-slate-400 transition-colors focus-ring"
                      aria-label="Edit message"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Retry failed */}
                {msg.hasFailed && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        const lastUser = [...messages].reverse().find(m => m.sender === 'user');
                        if (lastUser) sendMessage(lastUser.text);
                      }}
                      className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 focus-ring"
                    >
                      <RotateCcw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isThinking && <ThinkingBubble />}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="absolute bottom-24 right-8 p-2 rounded-xl bg-indigo-600 text-white shadow-lg focus-ring z-10"
              aria-label="Scroll to bottom"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Pending Action Confirmation */}
        <AnimatePresence>
          {pendingAction && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="mx-4 mb-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="text-slate-300"><span className="text-indigo-400 font-bold">Aura wants to:</span> {pendingAction.description}</span>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={handleConfirmAction} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 focus-ring">Confirm</button>
                <button onClick={() => setPendingAction(null)} className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs hover:bg-white/10 focus-ring">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Follow-up suggestions */}
        {followUps.length > 0 && !isThinking && !streamingId && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => { sendMessage(q); setFollowUps([]); }}
                className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs hover:bg-indigo-500/20 transition-colors focus-ring"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        <div className="p-4 border-t border-white/5 bg-slate-950/60 flex-shrink-0">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Aura about your finances…"
              disabled={isThinking}
              rows={1}
              className="flex-1 resize-none px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/50 text-sm text-white placeholder-slate-500 outline-none transition-colors font-sans chat-scroll"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              aria-label="Message Aura AI"
            />
            <div className="flex flex-col gap-2">
              {streamingId ? (
                <button
                  onClick={handleStop}
                  className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors focus-ring"
                  aria-label="Stop generation"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isThinking}
                  className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors focus-ring"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[9px] font-mono text-slate-600 mt-2 text-center">
            Aura AI analyzes your financial data without storing conversations. All insights are deterministic.
          </p>
        </div>
      </div>
    </div>
  );
});
AuraChatInterface.displayName = 'AuraChatInterface';
