import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, X, Send, ChevronDown, Minimize2, Maximize2,
  MessageSquare, RotateCcw, Loader
} from 'lucide-react';
import { AuraAI } from '../../ai/AuraAI';
import { AuraResponse } from '../../ai/models/AuraResponse';

interface FloatingMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  auraResponse?: AuraResponse;
  hasFailed?: boolean;
}

interface FloatingAuraAssistantProps {
  userId: string;
  isOpen?: boolean;
  onOpenFullChat?: () => void;
}

const ThinkingDots = React.memo(() => (
  <div className="flex items-center gap-1.5 py-1" role="status" aria-label="Aura is thinking">
    <span className="thinking-dot w-2 h-2 rounded-full bg-indigo-400 inline-block" />
    <span className="thinking-dot w-2 h-2 rounded-full bg-indigo-400 inline-block" />
    <span className="thinking-dot w-2 h-2 rounded-full bg-indigo-400 inline-block" />
    <span className="text-xs text-slate-500 ml-1 font-mono">Aura is thinking…</span>
  </div>
));
ThinkingDots.displayName = 'ThinkingDots';

const QUICK_QUESTIONS = [
  'How is my budget this month?',
  'What are my top expenses?',
  'Show my savings progress',
];

export const FloatingAuraAssistant = React.memo<FloatingAuraAssistantProps>(({
  userId,
  onOpenFullChat,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<FloatingMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const stopRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
        setIsMinimized(false);
      }
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isExpanded]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText, isThinking]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isExpanded, isMinimized]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return;
    const userMsg: FloatingMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    stopRef.current = false;

    try {
      if (!(AuraAI as any).initialized) AuraAI.initialize('production');
      const response = await AuraAI.query(userId, text.trim());

      const aiId = `ai-${Date.now()}`;
      const fullText = response.answer;
      let displayed = '';

      const aiMsg: FloatingMessage = {
        id: aiId,
        sender: 'ai',
        text: '',
        timestamp: new Date(),
        auraResponse: response,
      };
      setMessages(prev => [...prev, aiMsg]);
      setStreamingId(aiId);
      setIsThinking(false);

      // Simulate streaming
      const chars = fullText.split('');
      let idx = 0;
      const interval = setInterval(() => {
        if (stopRef.current || idx >= chars.length) {
          clearInterval(interval);
          setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: fullText } : m));
          setStreamingId(null);
          setStreamText('');
          return;
        }
        displayed += chars[idx++];
        setStreamText(displayed);
        setMessages(prev => prev.map(m => m.id === aiId ? { ...m, text: displayed } : m));
      }, 12);

    } catch {
      setIsThinking(false);
      const failMsg: FloatingMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        hasFailed: true,
      };
      setMessages(prev => [...prev, failMsg]);
    }
  }, [userId, isThinking]);

  const handleStop = useCallback(() => {
    stopRef.current = true;
    setStreamingId(null);
    setIsThinking(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  const displayedMessages = useMemo(() => messages.slice(-6), [messages]);

  return (
    <>
      {/* Keyboard shortcut hint (hidden, for SR) */}
      <div className="sr-only" aria-live="polite">
        {isExpanded ? 'Aura AI assistant is open. Press Escape to close.' : 'Press Ctrl+K to open Aura AI.'}
      </div>

      <AnimatePresence>
        {isExpanded && !isMinimized && (
          <motion.div
            key="float-panel"
            initial={{ opacity: 0, scale: 0.92, y: 20, x: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20, x: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-[380px] max-h-[560px] flex flex-col rounded-3xl float-panel z-[9990] overflow-hidden"
            role="dialog"
            aria-label="Aura AI Assistant"
            aria-modal="false"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none">Aura AI</p>
                  <p className="text-[9px] font-mono text-indigo-400 mt-0.5 uppercase tracking-widest">
                    {isThinking ? 'thinking…' : streamingId ? 'generating…' : 'ready'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {onOpenFullChat && (
                  <button
                    onClick={onOpenFullChat}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-ring"
                    aria-label="Open full chat"
                    title="Open full chat"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-ring"
                  aria-label="Minimize assistant"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus-ring"
                  aria-label="Close assistant"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto chat-scroll p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Ask me anything</p>
                    <p className="text-[10px] text-slate-500 mt-1">about your finances</p>
                  </div>
                  <div className="space-y-1.5">
                    {QUICK_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/5 text-[10px] text-slate-300 transition-all focus-ring"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {displayedMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[84%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'user-bubble text-white rounded-tr-sm'
                        : 'ai-bubble text-slate-200 rounded-tl-sm'
                    } ${msg.hasFailed ? 'border-rose-500/30' : ''}`}
                  >
                    {msg.text || <span className="opacity-40">…</span>}
                    {msg.id === streamingId && <span className="cursor-blink" />}
                    {msg.hasFailed && (
                      <button
                        onClick={() => sendMessage(messages[messages.length - 2]?.text || '')}
                        className="flex items-center gap-1 mt-1 text-rose-400 text-[9px] hover:text-rose-300"
                      >
                        <RotateCcw className="w-2.5 h-2.5" /> Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Loader className="w-3 h-3 text-white animate-spin" />
                  </div>
                  <div className="ai-bubble px-3 py-2 rounded-2xl rounded-tl-sm">
                    <ThinkingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.06] bg-slate-950/40">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your finances…"
                  rows={1}
                  disabled={isThinking}
                  className="flex-1 resize-none px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-indigo-500/50 text-[11px] text-white placeholder-slate-500 outline-none transition-colors font-sans max-h-20 chat-scroll"
                  style={{ minHeight: '36px' }}
                  aria-label="Message Aura AI"
                />
                {(isThinking || streamingId) ? (
                  <button
                    onClick={handleStop}
                    className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition-colors flex-shrink-0 focus-ring"
                    aria-label="Stop generation"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim()}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors flex-shrink-0 focus-ring"
                    aria-label="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[8px] font-mono text-slate-600 mt-1.5 text-center">
                Enter to send · Shift+Enter for new line · Ctrl+K to toggle
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized pill */}
      <AnimatePresence>
        {isExpanded && isMinimized && (
          <motion.button
            key="minimized-pill"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-24 right-6 flex items-center gap-2 px-4 py-2.5 rounded-full float-panel z-[9990] text-xs font-bold text-white hover:scale-105 transition-transform focus-ring"
            aria-label="Expand Aura AI assistant"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            Aura AI
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        onClick={() => {
          setIsExpanded(prev => !prev);
          setIsMinimized(false);
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 z-[9991] focus-ring"
        aria-label={isExpanded ? 'Close Aura AI' : 'Open Aura AI (Ctrl+K)'}
        title="Aura AI (Ctrl+K)"
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6 text-white" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageSquare className="w-6 h-6 text-white" />
            </motion.span>
          )}
        </AnimatePresence>
        {/* Unread badge */}
        {messages.some(m => m.sender === 'ai' && !isExpanded) && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-slate-950 text-[8px] font-bold text-white flex items-center justify-center">
            {messages.filter(m => m.sender === 'ai').length}
          </span>
        )}
      </motion.button>
    </>
  );
});

FloatingAuraAssistant.displayName = 'FloatingAuraAssistant';
