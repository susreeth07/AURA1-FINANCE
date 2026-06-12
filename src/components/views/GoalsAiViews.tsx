import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, Sparkles, Award, Play, MessageSquare, Send, CheckCircle2, 
  HelpCircle, Mic, MicOff, Volume2, ArrowRight, Laptop, Bike, Car, Home, ShieldAlert, Palmtree, Plus 
} from 'lucide-react';
import { SavingsGoal, ChatMessage } from '../../types';
import { SUGGESTED_AI_QUESTIONS, AI_PRESETS } from '../../mockData';

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
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-xl font-extrabold text-white">Compound Savings Goals</h2>
          <p className="text-xs text-slate-400">Lock liquidity into specific asset goals with dynamic timing projections</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold flex items-center gap-2 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> {showAdd ? 'Close' : 'Target New Asset'}
        </button>
      </div>

      {showAdd && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreateGoal} 
          className="p-6 rounded-2xl border border-white/10 bg-slate-950/60 grid sm:grid-cols-2 md:grid-cols-4 gap-4 items-end"
        >
          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Asset Name</label>
            <input 
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Apple Vision Pro"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-indigo-500 outline-none text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Target Value (₹)</label>
            <input 
              type="number" required value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="3500"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-indigo-500 outline-none text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Asset Type</label>
            <select 
              value={category} onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm focus:border-indigo-500 outline-none text-slate-200"
            >
              <option value="laptop" className="bg-slate-900">Laptop/Hardware</option>
              <option value="bike" className="bg-slate-900">E-Bike/Vehicle</option>
              <option value="car" className="bg-slate-900">Tesla/Supercar</option>
              <option value="house" className="bg-slate-900">Property/Estate</option>
              <option value="emergency" className="bg-slate-900">Emergency Security</option>
              <option value="vacation" className="bg-slate-900">Sanctuary Travel</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1.5">Target Date</label>
            <div className="flex gap-2">
              <input 
                type="date" required value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/5 text-xs focus:border-indigo-500 outline-none text-white font-mono"
              />
              <button type="submit" className="px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs h-[46px]">
                Create
              </button>
            </div>
          </div>
        </motion.form>
      )}

      {/* GOALS GRID TRACKING */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((item) => {
          const pct = Math.min(Math.round((item.currentAmount / item.targetAmount) * 100), 100);
          
          // circular SVG math
          const radius = 32;
          const stroke = 6;
          const normalizedRadius = radius - stroke * 2;
          const circumference = normalizedRadius * 2 * Math.PI;
          const strokeDashoffset = circumference - (pct / 100) * circumference;

          // dynamic completions indicators
          const isFinished = pct >= 100;

          return (
            <div key={item.id} className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col justify-between hover:border-indigo-500/20 hover:bg-slate-900/60 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    {getIcon(item.category)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">{item.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mt-0.5">{item.category}</p>
                  </div>
                </div>

                {/* Interactive SVG Circular Progress */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle 
                      stroke="rgba(255,255,255,0.05)" fill="transparent" strokeWidth={stroke} 
                      r={normalizedRadius} cx={radius} cy={radius} 
                    />
                    <circle 
                      stroke="#6366f1" fill="transparent" strokeWidth={stroke} 
                      strokeDasharray={circumference + ' ' + circumference} 
                      style={{ strokeDashoffset }} r={normalizedRadius} cx={radius} cy={radius}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xs font-black text-white font-mono">{pct}%</span>
                </div>
              </div>

              {/* Middle balances */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-baseline font-mono text-xs">
                  <div>
                    <span className="text-base font-black text-white">₹{item.currentAmount.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500"> stashed</span>
                  </div>
                  <span className="text-slate-500">Target: ₹{item.targetAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Forecast date: {item.targetDate}</span>
                  <span className={isFinished ? 'text-emerald-400 font-bold' : 'text-indigo-400'}>
                    {isFinished ? 'STASH COMPLETE' : 'IN PROGRESS'}
                  </span>
                </div>
              </div>

              {/* Fund injection input interface */}
              {!isFinished && (
                <div className="flex gap-2 border-t border-white/5 pt-4">
                  <input 
                    type="number"
                    placeholder="Inject Amount (₹)"
                    value={fundAmount[item.id] || ''}
                    onChange={(e) => setFundAmount(prev => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
                  />
                  <button 
                    onClick={() => handleAddFundsSubmit(item.id)}
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

export const AiAssistantPanel: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'ai-init',
      sender: 'ai',
      text: AI_PRESETS.default.text,
      timestamp: '11:30 AM',
      insights: AI_PRESETS.default.insights
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [voicePlayback, setVoicePlayback] = useState(false);

  const triggerResponse = (query: string) => {
    setIsTyping(true);
    
    // Select correct answer blueprint
    let presetKey = 'default';
    const lower = query.toLowerCase();
    if (lower.includes('forecast') || lower.includes('balance')) presetKey = 'balance';
    else if (lower.includes('bike') || lower.includes('goal')) presetKey = 'bike';
    else if (lower.includes('category') || lower.includes('distribution')) presetKey = 'category';

    const responseTemplate = AI_PRESETS[presetKey] || AI_PRESETS.default;

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: responseTemplate.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          insights: responseTemplate.insights
        }
      ]);
    }, 1500);
  };

  const handleSend = (textToSend?: string) => {
    const finalQuery = textToSend || input;
    if (!finalQuery.trim()) return;

    setMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: finalQuery,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    if (!textToSend) setInput('');
    triggerResponse(finalQuery);
  };

  const toggleMic = () => {
    if (!micActive) {
      setMicActive(true);
      setTimeout(() => {
        setMicActive(false);
        setInput("Show me my spending forecast.");
      }, 2500);
    } else {
      setMicActive(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-14rem)]">
      
      {/* LEFT CHAT PANEL (8 column grid) */}
      <div className="lg:col-span-8 flex flex-col justify-between bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden h-full">
        {/* Chat top header with speaking node */}
        <div className="p-4 bg-slate-900/60 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Aura Algorithmic brain</h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">COGNITIVE_NODE_LOADED</p>
            </div>
          </div>

          {/* Voice indicator simulation button */}
          <button 
            onClick={() => setVoicePlayback(!voicePlayback)}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-xs font-mono font-bold ${voicePlayback ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'bg-white/5 text-slate-400 border-white/10'}`}
          >
            <Volume2 className="w-4 h-4" /> {voicePlayback ? 'SIMULATOR_SPEAKING_ON' : 'SIMULATOR_SPEAKING_OFF'}
          </button>
        </div>

        {/* MESSAGES LAYER */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-start gap-4`}>
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  AI
                </div>
              )}
              
              <div className="max-w-xl space-y-2">
                <div className={`p-4 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-950/60 text-slate-200 border border-white/5 rounded-tl-none'}`}>
                  {msg.text}
                </div>
                
                {/* Insights bullets if exists */}
                {msg.insights && msg.insights.length > 0 && (
                  <div className="space-y-1.5 pl-2">
                    {msg.insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-[11px] font-mono text-indigo-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                )}
                <span className="block text-[9px] text-slate-500 font-mono mt-1 text-right">{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 animate-pulse">
                AI
              </div>
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                <span>Aura computation matrix compiling...</span>
              </div>
            </div>
          )}
        </div>

        {/* INPUT PROMPTER */}
        <div className="p-4 border-t border-white/5 bg-slate-950/40">
          <div className="relative">
            <input 
              type="text"
              placeholder={micActive ? "Aura listening to voice cues..." : "Ask Aura: Analyze my category, forecast, bike goal..."}
              className="w-full pl-5 pr-24 py-4 rounded-xl bg-slate-950 border border-white/5 text-xs text-white outline-none focus:border-indigo-500 font-mono"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              disabled={isTyping || micActive}
            />
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                onClick={toggleMic}
                className={`p-2 rounded-xl transition-colors ${micActive ? 'bg-red-600 text-white animate-pulse' : 'hover:bg-white/5 text-slate-400'}`}
              >
                {micActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => handleSend()}
                disabled={isTyping || micActive || !input.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT QUERY FAST CHROME (4 column grid) */}
      <div className="lg:col-span-4 bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-6 h-full overflow-y-auto">
        <div className="border-b border-white/5 pb-4">
          <h4 className="text-sm font-bold text-white">Suggested Telemetry</h4>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Instant trigger vectors to feed prediction queries</p>
        </div>

        <div className="space-y-3">
          {SUGGESTED_AI_QUESTIONS.map((q, idx) => (
            <button 
              key={idx}
              onClick={() => handleSend(q)}
              className="w-full p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] text-left text-xs text-slate-300 leading-snug transition-all flex items-start gap-2.5 text-balance font-mono"
            >
              <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
