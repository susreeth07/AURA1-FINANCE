import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, Shield, Cpu, Target, Award, PieChart, Users, ArrowRight,
  Sparkles, Layers, DollarSign, Wallet, ArrowUpRight, Zap, Play, CheckCircle2,
  Moon, Sun, Sliders
} from 'lucide-react';
import { ThreeGlobe } from './ThreeGlobe';
import { useTheme } from './ThemeContext';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-300 bg-slate-950 text-slate-100">
      
      {/* Wave Animated Gradient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] opacity-40 wave-bg bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.25)_0%,rgba(192,132,252,0.12)_35%,transparent_70%)]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[120%] opacity-30 wave-bg bg-[radial-gradient(circle_at_top_right,rgba(232,121,249,0.18)_0%,rgba(99,102,241,0.08)_40%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* Landing Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <span className="font-mono font-bold text-lg text-white">A</span>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white">Aura</span>
            <span className="text-xs font-mono px-1.5 py-0.5 ml-2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">AI</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
          <a href="#pulse" className="hover:text-indigo-400 transition-colors">Savings Goals</a>
          <a href="#ai" className="hover:text-indigo-400 transition-colors">AI Insights</a>
          <a href="#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={`Theme: ${theme}`}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4 text-amber-400" /> : <Sliders className="w-4 h-4 text-emerald-400" />}
          </button>

          <button 
            onClick={onLogin}
            className="px-5 py-2 text-sm font-semibold rounded-xl text-slate-300 hover:text-white transition-colors"
          >
            Log In
          </button>
          <button 
            onClick={onGetStarted}
            className="px-5 py-2.5 text-sm font-bold bg-white text-slate-950 hover:opacity-90 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2"
          >
            Sign Up <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24 md:pt-16 md:pb-32 grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7 flex flex-col justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-400 mb-6 w-fit"
          >
            <Sparkles className="w-3.5 h-3.5" /> AI-Powered Financial Intelligence
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-none text-white mb-6"
          >
            Take Control of Your <br />
            <span className="text-gradient">Financial Future</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-slate-400 mb-10 max-w-xl leading-relaxed"
          >
            Track expenses, set budgets, and grow savings with AI-powered insights. Beautiful 3D visualizations, smart categorization, and personalized forecasts — all in one place.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
          >
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-base shadow-[0_4px_30px_rgba(99,102,241,0.4)] hover:shadow-[0_4px_40px_rgba(99,102,241,0.6)] hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center gap-3"
            >
              Get Started Free <ArrowUpRight className="w-5 h-5" />
            </button>
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 text-slate-200 font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
            >
              <Play className="w-4 h-4 fill-current text-indigo-400" /> Watch Demo
            </button>
          </motion.div>
        </div>

        {/* 3D GLOBE MODULE IN MD SPAN-5 */}
        <div className="md:col-span-5 h-[400px] sm:h-[500px] relative flex items-center justify-center">
          <div className="absolute inset-0 radial-glimmer-dark opacity-100 z-0"></div>
          
          {/* Floating Indicators */}
          <div className="absolute top-10 left-10 p-3 rounded-2xl glass-panel-dark animate-bounce border border-white/10 z-10 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs">₹</span>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Monthly Savings</p>
              <p className="text-xs font-bold text-white">+₹24,500</p>
            </div>
          </div>

          <div className="absolute bottom-10 right-10 p-3 rounded-2xl glass-panel-dark animate-pulse border border-white/10 z-10 flex items-center gap-2" style={{ animationDuration: '4s' }}>
            <Wallet className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Total Balance</p>
              <p className="text-xs font-bold text-white">₹48,250</p>
            </div>
          </div>

          <div className="absolute top-1/2 right-2 p-2 rounded-xl glass-panel-dark border border-white/10 z-10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-pink-400 animate-pulse" />
          </div>

          <div className="w-full h-full pointer-events-none">
            <ThreeGlobe />
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">POWERFUL FEATURES</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
            Everything You Need to Build Wealth
          </h2>
          <p className="text-slate-400">
            A complete suite of tools to track spending, optimize budgets, and grow your savings with intelligent, real-time insights.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-md hover:border-indigo-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Smart Expense Tracking</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Log income, track recurring bills, and monitor spending across beautiful, color-coded category charts.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-md hover:border-pink-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6 group-hover:bg-pink-600 group-hover:text-white transition-all">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Aura AI Assistant</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Chat with your personal AI financial advisor. Get spending warnings, savings tips, and optimized budget recommendations.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-md hover:border-purple-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Savings Goals</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Set targets for laptops, vehicles, vacations, or emergencies. Track progress with gamified milestones and forecasted completion dates.
            </p>
          </div>
        </div>
      </section>

      {/* FINANCIAL INSIGHTS & AI FEATURES SECTION */}
      <section id="ai" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4" /> AI-POWERED INSIGHTS
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-2 mb-6">
              AI-Augmented Financial Analytics
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              No more rigid spreadsheets. Aura analyzes your transactions, classifies spending automatically, and forecasts your budget with intelligent projections.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">Auto-Categorization</h4>
                  <p className="text-sm text-slate-400">Classifies transactions automatically into clean, responsive category charts.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-1 rounded-full bg-pink-500/20 text-pink-400 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">Pre-emptive Budget Alerts</h4>
                  <p className="text-sm text-slate-400">Get warned immediately if spending trends predict a budget overrun before the month ends.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 p-6 glass-panel-dark relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                  <Cpu className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Aura AI Copilot</p>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider">ANALYZING YOUR FINANCES</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">ACTIVE</span>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 font-mono">
                &gt; Analyzing your spending patterns for this month...
              </div>
              
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/10 text-xs">
                <p className="font-bold text-white mb-2 font-mono text-[10px] uppercase text-indigo-400">⚡ AI SUMMARY</p>
                "At your current savings rate, your balance of <span className="font-bold text-white">₹24,500</span> is projected to reach <span className="font-bold text-emerald-400">₹30,370</span> by end of month. Consider allocating ₹1,200 more to your emergency fund."
              </div>

              {/* Progress metric simulation */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>FINANCIAL HEALTH SCORE</span>
                  <span className="text-pink-400 font-bold">94% Excellent</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full" style={{ width: '94%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SAVINGS GOALS & ANALYTICS PREVIEW SECTION */}
      <section id="pulse" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          
          <div className="order-2 md:order-1 grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-indigo-400">LAPTOP GOAL</span>
                <span className="text-xs font-bold text-emerald-400">80%</span>
              </div>
              <div>
                <p className="text-2xl font-black text-white">₹3,200</p>
                <p className="text-xs text-slate-400 mt-1">Goal: ₹4,000</p>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: '80%' }}></div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col justify-between h-40">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-pink-400">EMERGENCY FUND</span>
                <span className="text-xs font-bold text-pink-400">98%</span>
              </div>
              <div>
                <p className="text-2xl font-black text-white">₹24,500</p>
                <p className="text-xs text-slate-400 mt-1">Goal: ₹25,000</p>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500" style={{ width: '98%' }}></div>
              </div>
            </div>

            <div className="col-span-2 p-5 rounded-2xl bg-slate-900/50 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white">Savings Growth Trend</span>
                <span className="text-xs font-mono text-emerald-400">+14.2% YTD</span>
              </div>
              <div className="flex items-end gap-2 h-16 pt-2">
                {[30, 45, 38, 55, 68, 80, 94].map((h, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-indigo-600 to-pink-500 rounded-t-sm" style={{ height: `${h}%` }}></div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-2">
                <span>DEC</span>
                <span>FEB</span>
                <span>APR</span>
                <span>JUN</span>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <span className="text-xs font-mono text-pink-400 uppercase tracking-widest">GOAL TRACKING</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white mt-2 mb-6">
              Set Goals. Track Progress. Save Smarter.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-6">
              Create savings goals for anything — electronics, vehicles, vacations, or emergency funds. Track milestone progress, see forecasted completion dates, and stay motivated with visual progress bars.
            </p>
            <button 
              onClick={onGetStarted}
              className="text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 transition-all shadow-md group"
            >
              Explore Goals <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 bg-[radial-gradient(circle_at_bottom,rgba(192,132,252,0.05)_0%,transparent_60%)]">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">TESTIMONIALS</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            Trusted by Modern Builders
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              quote: "The 3D visualizer and predictive analytics completely changed how I look at my cash runway. Simply stunning UX.",
              name: "Saurav K.",
              role: "Tech Architect",
              avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
            },
            {
              quote: "Aura's budget monitoring and smart alerts saved our studio ₹1.2L of unused SaaS licenses in less than 30 days.",
              name: "Elena Rostova",
              role: "Fractional CFO",
              avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"
            },
            {
              quote: "Talking to the Aura AI feels like having a personal financial advisor in your pocket. Truly next-level product.",
              name: "Marcus Sterling",
              role: "Venture Principal",
              avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
            }
          ].map((item, idx) => (
            <div key={idx} className="p-8 rounded-3xl border border-white/5 glass-panel-dark flex flex-col justify-between">
              <p className="text-sm text-slate-300 italic leading-relaxed mb-6">"{item.quote}"</p>
              <div className="flex items-center gap-4">
                <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                <div>
                  <p className="text-sm font-bold text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING GRID */}
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">PRICING</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">
            Simple, Transparent Plans
          </h2>
          <p className="text-slate-400">
            Start free and upgrade when you're ready. No hidden fees, no long contracts.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Tier 1 */}
          <div className="p-8 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col justify-between h-full hover:border-white/10 transition-colors">
            <div>
              <p className="font-mono text-xs uppercase text-indigo-400 tracking-widest mb-3">FREE</p>
              <p className="text-4xl font-black text-white mb-2">₹0<span className="text-sm font-normal text-slate-500"> / forever</span></p>
              <p className="text-xs text-slate-500 mb-8">Basic expense tracking to get started.</p>
              
              <ul className="space-y-4 text-xs text-slate-400 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Expense & income tracking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Category breakdowns</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> 3 Budget categories</li>
                <li className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-4 h-4" /> AI suggestions (locked)</li>
              </ul>
            </div>
            <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors">Get Started</button>
          </div>

          {/* Tier 2 */}
          <div className="p-8 rounded-3xl border border-indigo-500/30 bg-slate-900/60 flex flex-col justify-between h-full relative overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.15)]">
            <span className="absolute top-4 right-4 bg-indigo-600 text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded-full text-white font-bold">POPULAR</span>
            <div>
              <p className="font-mono text-xs uppercase text-purple-400 tracking-widest mb-3">PRO</p>
              <p className="text-4xl font-black text-white mb-2">₹799<span className="text-sm font-normal text-slate-500"> / month</span></p>
              <p className="text-xs text-slate-400 mb-8">Full tracking with AI-powered insights.</p>
              
              <ul className="space-y-4 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Unlimited budgets</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Custom categories</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> AI chat & suggestions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> 10+ savings goals</li>
              </ul>
            </div>
            <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-500/20">Upgrade to Pro</button>
          </div>

          {/* Tier 3 */}
          <div className="p-8 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col justify-between h-full hover:border-white/10 transition-colors">
            <div>
              <p className="font-mono text-xs uppercase text-pink-400 tracking-widest mb-3">BUSINESS</p>
              <p className="text-4xl font-black text-white mb-2">₹2,499<span className="text-sm font-normal text-slate-500"> / month</span></p>
              <p className="text-xs text-slate-500 mb-8">For teams and business finance management.</p>
              
              <ul className="space-y-4 text-xs text-slate-400 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Unlimited portfolios</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Shared team budgets</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Priority AI support</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Dedicated account manager</li>
              </ul>
            </div>
            <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors">Contact Sales</button>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 mb-20 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 text-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full radial-glimmer-dark opacity-40 pointer-events-none"></div>
        <span className="text-xs font-mono text-indigo-400 tracking-widest uppercase">START TODAY</span>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">Take Charge of Your Finances</h3>
        <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8">
          Join thousands of users managing their finances smarter. Get started in seconds — it's free.
        </p>
        <button 
          onClick={onGetStarted}
          className="px-8 py-3.5 bg-white text-slate-950 hover:opacity-90 font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2"
        >
          Create Free Account <ArrowUpRight className="w-4 h-4" />
        </button>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 bg-slate-950/70 py-12 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="font-mono font-bold text-sm text-white">A</span>
              </div>
              <span className="font-bold text-base tracking-tight text-white">Aura AI</span>
            </div>
            <p className="text-slate-600 leading-relaxed max-w-xs font-sans">
              Smart expense tracking, AI-powered budgeting, and beautiful financial visualizations to help you save more.
            </p>
          </div>

          <div>
            <h5 className="font-bold uppercase tracking-wider text-slate-300 mb-4 font-sans">Product</h5>
            <ul className="space-y-2.5">
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">Features</a></li>
              <li><a href="#pulse" className="hover:text-indigo-400 transition-colors">Savings Goals</a></li>
              <li><a href="#ai" className="hover:text-indigo-400 transition-colors">AI Insights</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold uppercase tracking-wider text-slate-300 mb-4 font-sans">Security</h5>
            <ul className="space-y-2.5">
              <li><span className="text-slate-600">TLS 1.3 Encrypted</span></li>
              <li><span className="text-slate-600">SOC 2 Compliant</span></li>
              <li><span className="text-slate-600">GDPR Ready</span></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold uppercase tracking-wider text-slate-300 mb-4 font-sans">Company</h5>
            <p className="text-slate-600 font-sans mb-3 text-xs leading-relaxed">
              Built with ❤️ by the Aura team.
            </p>
            <p className="text-[10px] text-slate-600">© 2026 Aura Finance. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
