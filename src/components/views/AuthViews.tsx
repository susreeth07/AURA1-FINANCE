import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Shield, ArrowRight, User, Eye, EyeOff, Sparkles, Send, Moon, Sun, Sliders } from 'lucide-react';
import { authService } from '../../services/authService';
import { useTheme } from '../ThemeContext';

interface AuthProps {
  onSuccess: (email: string) => void;
  onNavigate: (view: 'login' | 'signup' | 'forgot' | 'landing') => void;
}

export const LoginView: React.FC<AuthProps> = ({ onSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await authService.signIn(email, password);
      onSuccess(email);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/80 text-slate-100 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-full h-1 shine-border"></div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={`Theme: ${theme}`}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 z-10"
      >
        {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : theme === 'light' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Sliders className="w-3.5 h-3.5 text-emerald-400" />}
      </button>
      
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(99,102,241,0.5)]">
          <Shield className="w-6 h-6 text-white animate-pulse" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Log In to Aura</h2>
        <p className="text-xs text-slate-400 mt-2">Sign in to your secure account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-indigo-400" />
            <input 
              type="email" 
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono focus-ring"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider">Password</label>
            <button 
              type="button"
              onClick={() => onNavigate('forgot')}
              className="text-[11px] text-indigo-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-indigo-400" />
            <input 
              type={showPassword ? 'text' : 'password'} 
              required
              className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono focus-ring"
              placeholder="Enter your password"
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

        {errorMsg && (
          <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 font-mono">
            {errorMsg}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 font-sans transition-all flex items-center justify-center gap-2 active:scale-98 focus-ring ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>Log In <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-500">
        Don't have an account?{' '}
        <button onClick={() => onNavigate('signup')} className="text-indigo-400 font-bold hover:underline">
          Sign Up
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
  const { theme, toggleTheme } = useTheme();

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await authService.signUp(email, password, name);
      onSuccess(email);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/80 text-slate-100 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-indigo-500"></div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={`Theme: ${theme}`}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 z-10"
      >
        {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : theme === 'light' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Sliders className="w-3.5 h-3.5 text-emerald-400" />}
      </button>

      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-3">
          <Sparkles className="w-6 h-6 text-pink-400 animate-pulse" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Create Your Account</h2>
        <p className="text-xs text-slate-400 mt-1">Start tracking your finances with AI-powered insights</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-pink-400" />
            <input 
              type="text" 
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all focus-ring"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-pink-400" />
            <input 
              type="email" 
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all font-mono focus-ring"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-pink-400" />
            <input 
              type="password" 
              required
              className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all focus-ring"
              placeholder="Create a strong password"
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
            I agree to the Terms of Service and Privacy Policy.
          </label>
        </div>

        {errorMsg && (
          <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 font-mono">
            {errorMsg}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-pink-600/20 transition-all flex items-center justify-center gap-2 active:scale-98 focus-ring ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>Sign Up <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-white/5 text-center text-xs text-slate-500">
        Already have an account?{' '}
        <button onClick={() => onNavigate('login')} className="text-pink-400 font-bold hover:underline">
          Log In
        </button>
      </div>
    </div>
  );
};

export const ForgotPasswordView: React.FC<AuthProps> = ({ onSuccess, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await authService.resetPasswordRequest(email);
      setSent(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/80 text-slate-100 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={`Theme: ${theme}`}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 z-10"
      >
        {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : theme === 'light' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Sliders className="w-3.5 h-3.5 text-emerald-400" />}
      </button>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-white">Reset Password</h2>
        <p className="text-xs text-slate-400 mt-2">Enter your email and we'll send you a password reset link</p>
      </div>

      {sent ? (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
          <p className="text-sm text-indigo-300 font-medium mb-3">Email Sent Successfully</p>
          <p className="text-xs text-slate-400 mb-6">A password reset link has been sent to {email || 'your email'}.</p>
          <button 
            type="button"
            onClick={() => onNavigate('login')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-mono text-xs hover:bg-indigo-700 transition-colors focus-ring"
          >
            Back to Log In
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-indigo-400" />
              <input 
                type="email" 
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-white/5 bg-white/5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all font-mono focus-ring"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 font-mono">
              {errorMsg}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 focus-ring ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>Send Reset Link <Send className="w-4 h-4" /></>
            )}
          </button>

          <div className="text-center">
            <button 
              type="button"
              onClick={() => onNavigate('login')}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Back to Log In
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
