import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, Shield, Cpu, Target, Award, PieChart, Users, ArrowRight,
  Sparkles, Layers, DollarSign, Wallet, ArrowUpRight, Zap, Play, CheckCircle2 
} from 'lucide-react';
import { ThreeGlobe } from './ThreeGlobe';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="min-h-screen relative overflow-hidden transition-colors duration-300 bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900">
      
      {/* Wave Animated Gradient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] opacity-40 dark:opacity-40 light:opacity-10 wave-bg bg-[radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.25)_0%,rgba(192,132,252,0.12)_35%,transparent_70%)]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[120%] opacity-30 dark:opacity-30 light:opacity-5 wave-bg bg-[radial-gradient(circle_at_top_right,rgba(232,121,249,0.18)_0%,rgba(99,102,241,0.08)_40%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px)] light:bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px)]" />
      </div>

      {/* Landing Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5 dark:border-white/5 light:border-black/5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            <span className="font-mono font-bold text-lg text-white">A</span>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white dark:text-white light:text-slate-900">Aura</span>
            <span className="text-xs font-mono px-1.5 py-0.5 ml-2 rounded bg-indigo-500/10 text-indigo-400 dark:text-indigo-400 light:text-indigo-600 border border-indigo-500/20">AI</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400 dark:text-slate-400 light:text-slate-600">
          <a href="#features" className="hover:text-indigo-400 transition-colors">Quantum Features</a>
          <a href="#pulse" className="hover:text-indigo-400 transition-colors">Financial Pulse</a>
          <a href="#ai" className="hover:text-indigo-400 transition-colors">Aura Brain</a>
          <a href="#pricing" className="hover:text-indigo-400 transition-colors">Premium Grid</a>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={onLogin}
            className="px-5 py-2 text-sm font-semibold rounded-xl text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white transition-colors"
          >
            Access Core
          </button>
          <button 
            onClick={onGetStarted}
            className="px-5 py-2.5 text-sm font-bold bg-white text-slate-950 dark:bg-white dark:text-slate-950 light:bg-indigo-600 light:text-white hover:opacity-90 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2"
          >
            Deploy Mind <ArrowRight className="w-4 h-4" />
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
            <Sparkles className="w-3.5 h-3.5" /> Core Algorithmic Augment v4.1 Active
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-none text-white dark:text-white light:text-slate-900 mb-6"
          >
            Take Control of Your <br />
            <span className="text-gradient">Financial Future</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-slate-400 dark:text-slate-400 light:text-slate-600 mb-10 max-w-xl leading-relaxed"
          >
            Experience the synergy of high-fidelity Three.js 3D diagnostics, quantum predictive AI, and seamless, hyper-personalized tracking vectors built to compound your savings.
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
              className="px-8 py-4 rounded-xl border border-white/10 dark:border-white/10 light:border-black/10 bg-white/5 dark:bg-white/5 light:bg-black/5 text-slate-200 dark:text-slate-200 light:text-slate-700 font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
            >
              <Play className="w-4 h-4 fill-current text-indigo-400" /> Watch Demo
            </button>
          </motion.div>
        </div>

        {/* 3D GLOBE MODULE IN MD SPAN-5 */}
        <div className="md:col-span-5 h-[400px] sm:h-[500px] relative flex items-center justify-center">
          <div className="absolute inset-0 radial-glimmer-dark opacity-100 z-0"></div>
          
          {/* Floating Neon Rupee / Wallet Indicators */}
          <div className="absolute top-10 left-10 p-3 rounded-2xl glass-panel-dark animate-bounce border border-white/10 z-10 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs">₹</span>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Quantum Payout</p>
              <p className="text-xs font-bold text-white">+₹24,500</p>
            </div>
          </div>

          <div className="absolute bottom-10 right-10 p-3 rounded-2xl glass-panel-dark animate-pulse border border-white/10 z-10 flex items-center gap-2" style={{ animationDuration: '4s' }}>
            <Wallet className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Vault Reserves</p>
              <p className="text-xs font-bold text-white">₹48,250</p>
            </div>
          </div>

          <div className="absolute top-1/2 right-2 p-2 rounded-xl glass-panel-dark border border-white/10 z-10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-pink-400 animate-pulse" />
          </div>

          <div className="w-full h-full">
            <ThreeGlobe />
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 dark:border-white/5 light:border-black/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">COGNITIVE ECOSYSTEM</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white dark:text-white light:text-slate-900 mt-2 mb-4">
            Forged For Accelerated Yield
          </h2>
          <p className="text-slate-400 dark:text-slate-400 light:text-slate-600">
            A complete network of high-fidelity components analyzing your liquidity, overheads, and financial projections in real-time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl border border-white/5 dark:border-white/5 light:border-black/5 bg-slate-900/40 dark:bg-slate-900/40 light:bg-white/40 backdrop-blur-md hover:border-indigo-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white dark:text-white light:text-slate-900">Real-Time Aggregators</h3>
            <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed">
              Inject incomes, configure recurring overhead debits, and evaluate fluid reserves under beautiful category performance indices.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-white/5 dark:border-white/5 light:border-black/5 bg-slate-900/40 dark:bg-slate-900/40 light:bg-white/40 backdrop-blur-md hover:border-pink-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mb-6 group-hover:bg-pink-600 group-hover:text-white transition-all">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white dark:text-white light:text-slate-900">Aura AI Agent</h3>
            <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed">
              Activate speaking chat nodes, receive structural warning notifications, and query strategies for hyper-optimized cash-flow allocations.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-white/5 dark:border-white/5 light:border-black/5 bg-slate-900/40 dark:bg-slate-900/40 light:bg-white/40 backdrop-blur-md hover:border-purple-500/40 transition-all duration-300 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white dark:text-white light:text-slate-900">Gamified Goal Milestones</h3>
            <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed">
              Pledge current liquidity into specialized assets (laptops, vehicles, properties, emergency pools) with exact timing forecasts.
            </p>
          </div>
        </div>
      </section>

      {/* FINANCIAL INSIGHTS & AI FEATURES SECTION */}
      <section id="ai" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 dark:border-white/5 light:border-black/5 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4" /> RECURSIVE ENGINE FOCUS
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white dark:text-white light:text-slate-900 mt-2 mb-6">
              AI-Augmented Financial Analytics
            </h2>
            <p className="text-slate-400 dark:text-slate-400 light:text-slate-600 mb-8 leading-relaxed">
              No more rigid spreadsheets. Aura interfaces with your raw transaction streams, classifies category allocations dynamically, and simulates compound budgets with exact forecasting matrices.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-1 rounded-full bg-indigo-500/20 text-indigo-400 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white dark:text-white light:text-slate-900 mb-1">Algorithmic Categorization</h4>
                  <p className="text-sm text-slate-400">Classifies messy merchant transactions automatically into pristine, responsive color-coded graphs.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-1 rounded-full bg-pink-500/20 text-pink-400 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white dark:text-white light:text-slate-900 mb-1">Pre-emptive Budget Alerts</h4>
                  <p className="text-sm text-slate-400">Generates warning signals immediately if velocities predict a budget overdraw before the calendar cycle terminates.</p>
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
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider">THINKING_STREAM_ACTIVE</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">SYSTEM OPTIMIZED</span>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 font-mono">
                &gt; Initialize predictive balance projection vectors for FY26...
              </div>
              
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/10 text-xs">
                <p className="font-bold text-white mb-2 font-mono text-[10px] uppercase text-indigo-400">⚡ COMPILING COGNITIVE SUMMARY</p>
                "At the current capital burn velocity, your liquid reserve of <span className="font-bold text-white">₹24,500</span> is on pace to grow to <span className="font-bold text-emerald-400">₹30,370</span> by end of month. Recommend migrating ₹1,200 to your high-interest Plaid bike index."
              </div>

              {/* Progress metric simulation */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>FINANCIAL AUGMENTATION SCORE</span>
                  <span className="text-pink-400 font-bold">94% RESILIENT</span>
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
      <section id="pulse" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 dark:border-white/5 light:border-black/5">
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
                <span className="font-mono text-[10px] text-pink-400">SAVINGS PLACEMENTS</span>
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
                <span className="text-xs font-bold text-white">Compound Forecast Pacing</span>
                <span className="text-xs font-mono text-emerald-400">+14.2% Growth YTD</span>
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
            <span className="text-xs font-mono text-pink-400 uppercase tracking-widest">SAVINGS MULTIPLIER</span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white dark:text-white light:text-slate-900 mt-2 mb-6">
              Gamify Your Allocations Target
            </h2>
            <p className="text-slate-400 dark:text-slate-400 light:text-slate-600 leading-relaxed mb-6">
              Establish targeted buckets like electric bikes, high-performance computing hardware, real estates, or vacation pools. Keep track of milestone completions, auto-forecast completion dates based on custom savings parameters, and align your investments perfectly.
            </p>
            <button 
              onClick={onGetStarted}
              className="text-white bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 transition-all shadow-md group"
            >
              Explore Sandbox <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* RECONCILABLE VALUE / TESTIMONIALS */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 dark:border-white/5 light:border-black/5 bg-[radial-gradient(circle_at_bottom,rgba(192,132,252,0.05)_0%,transparent_60%)] animate-pulse">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest">PROVEN IMPACT</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white dark:text-white light:text-slate-900 mt-2">
            Praised By Modern Builders
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              quote: "The Three.js vector visualizer and predictive math nodes completely changed how I look at my cash runway. Simply stunning UX.",
              name: "Saurav K.",
              role: "Founding Tech Architect",
              avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
            },
            {
              quote: "Aura's predictive bill monitoring and dynamic threshold alerts saved our studio ₹1.2L of inactive SaaS licenses in less than 30 days.",
              name: "Elena Rostova",
              role: "Fractional CFO & Builder",
              avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150"
            },
            {
              quote: "Speaking to the Aura AI interface feels like having a quantitative analyst in your pocket. Truly a high-caliber development product.",
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
      <section id="pricing" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 dark:border-white/5 light:border-black/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">TIER DEFINITIONS</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white dark:text-white light:text-slate-900 mt-2 mb-4">
            Compounding Tier Structure
          </h2>
          <p className="text-slate-400 dark:text-slate-400 light:text-slate-600">
            Deploy with maximum modular flexibility. No long contracts, upgrade as your assets build.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Tier 1 */}
          <div className="p-8 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col justify-between h-full hover:border-white/10 transition-colors">
            <div>
              <p className="font-mono text-xs uppercase text-indigo-400 tracking-widest mb-3">SANDBOX LAYER</p>
              <p className="text-4xl font-black text-white mb-2">₹0<span className="text-sm font-normal text-slate-500"> / forever</span></p>
              <p className="text-xs text-slate-500 mb-8">Standard tracking sandbox with client-side persistence.</p>
              
              <ul className="space-y-4 text-xs text-slate-400 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Standard Ledger Tracking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> Basic category breakdowns</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-400" /> 3 Core budget limits</li>
                <li className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="w-4 h-4" /> AI Quantum suggestions (Blocked)</li>
              </ul>
            </div>
            <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors">Deploy Sandbox</button>
          </div>

          {/* Tier 2 */}
          <div className="p-8 rounded-3xl border border-indigo-500/30 bg-slate-900/60 flex flex-col justify-between h-full relative overflow-hidden shadow-[0_0_40px_rgba(99,102,241,0.15)]">
            <span className="absolute top-4 right-4 bg-indigo-600 text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded-full text-white font-bold">MOST PREFERRED</span>
            <div>
              <p className="font-mono text-xs uppercase text-purple-400 tracking-widest mb-3">COGNITIVE QUANT</p>
              <p className="text-4xl font-black text-white mb-2">₹799<span className="text-sm font-normal text-slate-500"> / month</span></p>
              <p className="text-xs text-slate-400 mb-8">High-performance tracking with full AI core capabilities.</p>
              
              <ul className="space-y-4 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Fluid ledger limits</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Custom categorized indexes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> Interactive speak prompts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400" /> 10+ Savings goal configurations</li>
              </ul>
            </div>
            <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-lg shadow-indigo-500/20">Secure Quant Tier</button>
          </div>

          {/* Tier 3 */}
          <div className="p-8 rounded-3xl border border-white/5 bg-slate-900/30 flex flex-col justify-between h-full hover:border-white/10 transition-colors">
            <div>
              <p className="font-mono text-xs uppercase text-pink-400 tracking-widest mb-3">MULTIPLE SYSTEM</p>
              <p className="text-4xl font-black text-white mb-2">₹2,499<span className="text-sm font-normal text-slate-500"> / month</span></p>
              <p className="text-xs text-slate-500 mb-8">For plural business entities & investment consulting.</p>
              
              <ul className="space-y-4 text-xs text-slate-400 mb-8">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Infinite portfolios nodes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Shared multi-category vaults</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Priority predictive cluster</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-pink-400" /> Dedicated quantitative principal</li>
              </ul>
            </div>
            <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-colors">Connect Cluster</button>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 mb-20 rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 text-center overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full radial-glimmer-dark opacity-40 pointer-events-none"></div>
        <span className="text-xs font-mono text-indigo-400 tracking-widest uppercase">IMMEDIATE LAUNCH</span>
        <h3 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-4">Empower Your Ledger Mindset Today</h3>
        <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8">
          Join thousands of developers, architects, and high-frequency builders tracking ₹350Cr+ in cumulative assets. Deploy in seconds.
        </p>
        <button 
          onClick={onGetStarted}
          className="px-8 py-3.5 bg-white text-slate-950 hover:opacity-90 font-bold rounded-xl transition-all shadow-md inline-flex items-center gap-2"
        >
          Secure Your Account <ArrowUpRight className="w-4 h-4" />
        </button>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/5 dark:border-white/5 light:border-black/5 bg-slate-950/70 py-12 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="font-mono font-bold text-sm text-white">A</span>
              </div>
              <span className="font-bold text-base tracking-tight text-white">Aura AI</span>
            </div>
            <p className="text-slate-600 leading-relaxed max-w-xs font-sans">
              Autonomous financial tracking, predictive compounding grids, and premium 3D ledger assets designed to raise compound rates.
            </p>
          </div>

          <div>
            <h5 className="font-bold uppercase tracking-wider text-slate-300 mb-4 font-sans">Core Nodes</h5>
            <ul className="space-y-2.5">
              <li><a href="#features" className="hover:text-indigo-400 transition-colors">Quantum Ledger</a></li>
              <li><a href="#pulse" className="hover:text-indigo-400 transition-colors">Savings Placement</a></li>
              <li><a href="#ai" className="hover:text-indigo-400 transition-colors">Aura Brain Nodes</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold uppercase tracking-wider text-slate-300 mb-4 font-sans">Legal & System</h5>
            <ul className="space-y-2.5">
              <li><span className="text-slate-600">Protocol Secure [TLS 1.3]</span></li>
              <li><span className="text-slate-600">ISO 27001 Certified Vault</span></li>
              <li><span className="text-slate-600">FCA Audited Ledger</span></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold uppercase tracking-wider text-slate-300 mb-4 font-sans">User Session</h5>
            <p className="text-slate-600 font-sans mb-3 text-xs leading-relaxed">
              Assigned Principal email:
              <br />
              <span className="text-indigo-400/80 font-mono font-semibold">pidaparthibharath@karunya.edu.in</span>
            </p>
            <p className="text-[10px] text-slate-600">© 2026 Aura Finance Corp. All rights simulated representation.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
