import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface NotFoundProps {
  isLoggedIn?: boolean;
}

export const NotFound: React.FC<NotFoundProps> = ({ isLoggedIn = true }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 bg-rose-500/10 rounded-full animate-ping pointer-events-none" />
        <div className="relative w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
        </div>
      </div>

      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-extrabold tracking-tight text-white dark:text-white light:text-slate-900 font-sans">
          Route Unmapped
        </h1>
        <p className="text-xs font-mono text-indigo-400 uppercase tracking-widest">
          ERROR 404: SECURE LAYER BREACHED
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 max-w-xs mx-auto leading-relaxed mt-2">
          The coordinate matrix you entered does not exist or access has been restricted by system policy.
        </p>
      </div>

      <button
        onClick={() => navigate(isLoggedIn ? '/dashboard' : '/')}
        className="mt-8 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs font-mono flex items-center gap-2 transition-all hover:scale-102 cursor-pointer shadow-lg shadow-indigo-600/20"
      >
        <ArrowLeft className="w-4 h-4" />
        {isLoggedIn ? 'RETURN TO NET DASHBOARD' : 'RETURN TO NET PUBLIC'}
      </button>
    </div>
  );
};

export default NotFound;
