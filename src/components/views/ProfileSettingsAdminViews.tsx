import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bell, Shield, Check, Trash2, Mail, User, Lock, Sparkles, Sliders, 
  Cpu, Users, RefreshCw, Key, Volume2, Moon, Sun, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { SystemNotification, UserProfile } from '../../types';
import { useTheme } from '../ThemeContext';
import { profileService } from '../../services/profileService';

interface ViewProps {
  notifications: SystemNotification[];
  profile: UserProfile;
  userId?: string;
  onClearNotification: (id: string) => void;
  onMarkNotificationRead: (id: string) => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

export const NotificationsPanel: React.FC<ViewProps> = ({ 
  notifications, onClearNotification, onMarkNotificationRead 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-xl font-extrabold text-white">System Signal Alerts</h2>
          <p className="text-xs text-slate-400">Review critical notifications compiled from stashed goal milestones & budget limits</p>
        </div>
      </div>

      <div className="bg-slate-900/20 rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 bg-slate-900/40 border-b border-white/5 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-indigo-400">SIGNAL LOG</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
            {notifications.length} Active items
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-mono">
              NO SIGNALS DETECTED IN LOG
            </div>
          ) : (
            notifications.map(item => (
              <div 
                key={item.id} 
                className={`p-5 flex items-start justify-between hover:bg-white/[0.01] transition-all ${!item.isRead ? 'bg-indigo-500/[0.02]' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mt-0.5 ${!item.isRead ? 'bg-indigo-600/20 text-indigo-400' : 'bg-white/5 text-slate-500'}`}>
                    <Bell className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {item.title}
                      {!item.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">{item.message}</p>
                    <span className="text-[9px] text-slate-600 font-mono mt-1.5 block">{new Date(item.date).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!item.isRead && (
                    <button 
                      onClick={() => onMarkNotificationRead(item.id)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-400 transition-colors"
                      title="Mark Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => onClearNotification(item.id)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Dismiss"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const ProfilePanel: React.FC<ViewProps> = ({ profile, userId, onUpdateProfile }) => {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const updates: Partial<UserProfile> = { name, email, avatar };
      if (userId) {
        const persisted = await profileService.updateProfile(userId, updates);
        onUpdateProfile({ ...profile, ...persisted });
      } else {
        onUpdateProfile({ ...profile, name, email, avatar });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      
      {/* Profil details card (8 cols grid) */}
      <div className="lg:col-span-8 p-6 rounded-2xl border border-white/5 bg-slate-900/40 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white">Principal Identity Parameters</h3>
          <p className="text-xs text-slate-500">Configure public credentials matching your cryptographic ledger node</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">User Identity Name</label>
              <input 
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm outline-none text-white focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Identity Email</label>
              <input 
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm outline-none text-white focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Avatar Vector URL</label>
              <input 
                type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-sm outline-none text-white focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-3">
            {saveError && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {saveError}
              </div>
            )}
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : saved ? (
                  <><Check className="w-3.5 h-3.5" /> Identity Updated</>
                ) : 'Save Parameters'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Side historical data info card (4 cols grid) */}
      <div className="lg:col-span-4 p-6 rounded-2xl border border-white/5 bg-slate-950/40 flex flex-col justify-between">
        <div className="text-center pb-6 border-b border-white/5">
          <img src={avatar} alt={name} className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-indigo-500/20" referrerPolicy="no-referrer" />
          <h4 className="text-sm font-bold text-white mt-3">{name}</h4>
          <p className="text-[10px] font-mono text-indigo-400 mt-1">{email}</p>
        </div>

        <div className="py-6 space-y-4">
          <p className="text-[10px] font-mono text-slate-500 uppercase">ACTIVE HISTORIC LOG SALARIES</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {profile.salaryHistory.map((sh, i) => (
              <div key={i} className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">{sh.month}:</span>
                <span className="font-bold text-white">₹{sh.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export const SettingsPanel: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [securityOn, setSecurityOn] = useState(true);
  const [soundsOn, setSoundsOn] = useState(false);

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      
      {/* General Settings */}
      <div className="lg:col-span-8 p-6 rounded-2xl border border-white/5 bg-slate-900/40 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white">Theme & Global Settings</h3>
          <p className="text-xs text-slate-400">Configure global preferences, system parameters and security rules</p>
        </div>

        <div className="space-y-4 divide-y divide-white/5">
          
          {/* Theme switcher connecting directly to persistent context */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h5 className="text-xs font-bold text-white">Interactive Theme Mode</h5>
              <p className="text-[10px] text-slate-400">Switch current presentation between Light & Dark modes respectively</p>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 text-indigo-400 flex items-center gap-2 text-xs font-mono"
            >
              {theme === 'dark' ? (
                <>
                  <Moon className="w-4 h-4" /> SECURE_DARK_MODE
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500" /> STYLIZED_LIGHT_MODE
                </>
              )}
            </button>
          </div>

          {/* Security setting */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h5 className="text-xs font-bold text-white">Strict Lock Mode</h5>
              <p className="text-[10px] text-slate-400">Enable local passphrase triggers and inactivity logout bounds</p>
            </div>
            <button 
              onClick={() => setSecurityOn(!securityOn)}
              className={`px-3 py-1.5 rounded-lg text-2xs font-mono font-bold ${securityOn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-white/5 text-slate-400'}`}
            >
              {securityOn ? 'CYPHER_ACTIVE' : 'CYPHER_OFF'}
            </button>
          </div>

          {/* Audio interface simulator setting */}
          <div className="flex items-center justify-between py-4">
            <div>
              <h5 className="text-xs font-bold text-white">Sound Feedback Effects</h5>
              <p className="text-[10px] text-slate-400">Enable tactile cyber audio outputs during navigation clicks</p>
            </div>
            <button 
              onClick={() => setSoundsOn(!soundsOn)}
              className={`px-3 py-1.5 rounded-lg text-2xs font-mono font-bold ${soundsOn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-400'}`}
            >
              {soundsOn ? 'AUDIO_PINGS_ACTIVE' : 'AUDIO_PINGS_MUTED'}
            </button>
          </div>

        </div>
      </div>

      <div className="lg:col-span-4 p-6 rounded-2xl border border-white/5 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 p-3 bg-indigo-500/10 rounded-bl-3xl">
          <Key className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">SYSTEM STATUS</p>
          <h4 className="text-sm font-bold text-white mt-2">Active Protocol Secure</h4>
          <p className="text-xs text-slate-500 leading-relaxed mt-3">All financial transactions, savings targets and AI models are computed locally in safety.</p>
        </div>
        <div className="pt-6 border-t border-white/5 mt-6 flex justify-between items-center text-[10px] font-mono text-slate-600">
          <span>SECURE SECRETS STORAGE</span>
          <span className="text-emerald-500 font-bold">SHA-256 ACTIVE</span>
        </div>
      </div>

    </div>
  );
};

export const AdminDashboardPanel: React.FC = () => {
  const [activityLogs, setActivityLogs] = useState<string[]>([
    "ADMIN: Node system deployed successfully at 11:29 AM",
    "TRANSACTION: Recorded Salary inflow ₹7,500 from Aura Tech",
    "TRANSACTION: Posted rent debit ₹1,800 to Prime Residence",
    "AI: Compiled predictability balance projection variables",
    "GOAL: Saved fund injection ₹200 towards E-Bike"
  ]);

  const [simulationActive, setSimulationActive] = useState(true);

  return (
    <div className="space-y-6">
      
      {/* Metrics Row – DEMO DATA */}
      <div className="grid sm:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
          <span className="text-3xs font-mono text-slate-500 block">TOTAL PLATFORM USERS</span>
          <p className="text-2xl font-black text-white mt-1">11,480</p>
          <span className="text-[10px] text-amber-400 font-mono">▲ DEMO METRIC</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
          <span className="text-3xs font-mono text-slate-500 block">TOTAL VOLUME TRANSACTS</span>
          <p className="text-2xl font-black text-white mt-1">₹4.85M</p>
          <span className="text-[10px] text-amber-400 font-mono">DEMO METRIC</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5">
          <span className="text-3xs font-mono text-slate-500 block">AI NODES COMPUTE LOGS</span>
          <p className="text-2xl font-black text-white mt-1">482,500</p>
          <span className="text-[10px] text-amber-400 font-mono">DEMO METRIC</span>
        </div>

        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
          <span className="text-3xs font-mono text-indigo-400 block">COMPUTE CLUSTER HEALTH</span>
          <p className="text-2xl font-black text-indigo-400 mt-1">100%</p>
          <span className="text-[10px] text-indigo-300 font-mono">All operational channels online</span>
        </div>
      </div>

      {/* Admin simulated log output area */}
      <div className="p-6 rounded-2xl border border-white/5 bg-slate-950/80">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
            <Cpu className="w-4 h-4 text-red-400" /> REALTIME TELEMETRY SYSTEM EVENT FEED
          </span>
          <button 
            onClick={() => setActivityLogs(prev => [...prev, `SYS_PING: Query executed successfully at ${new Date().toLocaleTimeString()}`])}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white flex items-center gap-1.5 text-[9px] font-mono border border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" /> TRIGGER_MANUAL_PING
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-950 p-4 rounded-xl font-mono text-[10px] text-slate-400 leading-relaxed border border-white/5">
          {activityLogs.map((log, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-slate-600">[&gt;]</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
