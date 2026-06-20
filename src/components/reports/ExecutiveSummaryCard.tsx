import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, Lightbulb, Compass, Award, ShieldAlert } from 'lucide-react';
import { ExecutiveSummary } from '../../reports/ReportModels';

interface ExecutiveSummaryCardProps {
  readonly summary: ExecutiveSummary;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = React.memo(({ summary }) => {
  const confidenceColor = 
    summary.confidenceLevel === 'High' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
    summary.confidenceLevel === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
    'bg-rose-500/10 border-rose-500/20 text-rose-400';

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-indigo-500/10 p-6 rounded-3xl shadow-xl space-y-6">
      
      {/* Title Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h4 className="text-sm font-extrabold text-white tracking-tight">AI Executive Summary</h4>
        </div>
        <div className={`px-2.5 py-0.5 rounded-full border text-3xs font-mono font-bold uppercase tracking-wider ${confidenceColor}`}>
          Aura Confidence: {summary.confidenceLevel}
        </div>
      </div>

      {/* Main headline and overview */}
      <div className="space-y-2">
        <h5 className="text-base font-black text-white leading-tight">{summary.headline}</h5>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">{summary.overview}</p>
      </div>

      {/* Bullet sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        
        {/* Achievements / Accomplishments */}
        {summary.achievements.length > 0 && (
          <div className="space-y-2">
            <h6 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" /> Strategic Successes
            </h6>
            <ul className="space-y-1.5">
              {summary.achievements.map((ach, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{ach}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks / Vulnerabilities */}
        {summary.risks.length > 0 && (
          <div className="space-y-2">
            <h6 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Vulnerabilities &amp; Risks
            </h6>
            <ul className="space-y-1.5">
              {summary.risks.map((risk, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opportunities */}
        {summary.opportunities.length > 0 && (
          <div className="space-y-2">
            <h6 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-indigo-400" /> Growth Opportunities
            </h6>
            <ul className="space-y-1.5">
              {summary.opportunities.map((opp, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <Compass className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span>{opp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <div className="space-y-2">
            <h6 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Active Recommendations
            </h6>
            <ul className="space-y-1.5">
              {summary.recommendations.map((rec, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-500 font-bold shrink-0">➔</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>

      {/* Critical Warnings */}
      {summary.warnings.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <span className="text-xs font-black text-amber-400">Critical Warnings Triggered</span>
              <ul className="list-disc pl-4 mt-1.5 text-xs text-amber-200/90 space-y-1">
                {summary.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});
