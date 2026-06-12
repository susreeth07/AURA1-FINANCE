import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Shield, ArrowRight, User, Eye, EyeOff, Sparkles, Send } from 'lucide-react';

interface AuthProps {
  onSuccess: (email: string) => void;
  onNavigate: (view: 'login' | 'signup' | 'forgot' | 'landing') => void;
}

export const LoginView: React.FC<AuthProps> = ({ onSuccess, onNavigate }) => {
  const [email, setEmail] = useState('pidaparthibharath@karunya.edu.in');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess(email);
    }, 800);
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 dark:border-white/10 light:border-black/5 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white text-slate-100 dark:text-slate-100 light:text-slate-900 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-full h-1 shine-border"></div>
      
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
          <Shield className="w-6 h-6 text-white animate-pulse" />
        </div>
        <h2 className="text-2xl font-extrabold text-white dark:text-white light:text-slate-900">Access Financial Mind</h2>
        <p className="text-xs text-slate-400 mt-2">Aura Premium Algorithmic Identity Vault</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Quant Identifier (Email)</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-indigo-400" />
            <input 
              type="email" 
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono"
              placeholder="name@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider">Access passphrase</label>
            <button 
              type="button"
              onClick={() => onNavigate('forgot')}
              className="text-[11px] text-indigo-400 hover:underline"
            >
              Lost credentials?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-indigo-400" />
            <input 
              type={showPassword ? 'text' : 'password'} 
              required
              className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono"
              placeholder="Enter secure vault password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 font-sans transition-all flex items-center justify-center gap-2 active:scale-98"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>Unlock Secure Layer <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-500">
        New principal participant?{' '}
        <button onClick={() => onNavigate('signup')} className="text-indigo-400 font-bold hover:underline">
          Deploy Account Node
        </button>
      </div>
    </div>
  );
};

export const SignupView: React.FC<AuthProps> = ({ onSuccess, onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess(email || 'pidaparthibharath@karunya.edu.in');
    }, 800);
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-slate-900/80 text-slate-100 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-indigo-500"></div>

      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-pink-400 animate-pulse" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Join Aura Network</h2>
        <p className="text-xs text-slate-400 mt-1">Deploy automated wealth vectors and prediction grids</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Participant Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-pink-400" />
            <input 
              type="text" 
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all"
              placeholder="Alex Sterling"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Secure Email Node</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-pink-400" />
            <input 
              type="email" 
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all font-mono"
              placeholder="pidaparthibharath@karunya.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Passphrase Blueprint</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-pink-400" />
            <input 
              type="password" 
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all"
              placeholder="Create strong master key"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 py-1">
          <input 
            type="checkbox" 
            id="agree"
            checked={agree} 
            onChange={(e) => setAgree(e.target.checked)}
            className="w-4 h-4 accent-pink-500" 
          />
          <label htmlFor="agree" className="text-[10px] text-slate-400 select-none">
            I subscribe to quantum telemetry, algorithmic rules, & privacy standards.
          </label>
        </div>

        <button 
          type="submit"
          className="w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2 active:scale-98"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>Deploy Secure Account <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-white/5 text-center text-xs text-slate-500">
        Already registered in network?{' '}
        <button onClick={() => onNavigate('login')} className="text-pink-400 font-bold hover:underline">
          Unlock Credentials
        </button>
      </div>
    </div>
  );
};

export const ForgotPasswordView: React.FC<AuthProps> = ({ onSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-slate-900/80 text-slate-100 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-white">Reset Neural Seal</h2>
        <p className="text-xs text-slate-400 mt-2">Request automatic recovery vectors to bypass current password locks</p>
      </div>

      {sent ? (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
          <p className="text-sm text-indigo-300 font-medium mb-3">Vector Sent Successfully</p>
          <p className="text-xs text-slate-400 mb-6">A secure passkey retrieval package has been dispatched to {email || 'your email node'}.</p>
          <button 
            type="button"
            onClick={() => onNavigate('login')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-mono text-xs hover:bg-indigo-700 transition-colors"
          >
            Return to Node Lock
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Registered Email Node</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-indigo-400" />
              <input 
                type="email" 
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono"
                placeholder="pidaparthibharath@karunya.edu.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            Transmit Recovery Node <Send className="w-4 h-4" />
          </button>

          <div className="text-center">
            <button 
              type="button"
              onClick={() => onNavigate('login')}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Back to safe login lock
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
