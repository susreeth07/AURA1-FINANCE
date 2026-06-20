import React from 'react';
import { FileText, Calendar, Lock, ShieldAlert, Sparkles, Trash2, Eye, Pin, Star } from 'lucide-react';
import { ReportDocument } from '../../reports/ReportModels';

interface ReportCardProps {
  readonly report: ReportDocument;
  readonly onView: (reportId: string) => void;
  readonly onDelete: (reportId: string) => void;
  readonly onToggleFavorite: (reportId: string) => void;
  readonly onTogglePin: (reportId: string) => void;
  readonly onArchive?: (reportId: string) => void;
}

export const ReportCard: React.FC<ReportCardProps> = React.memo(({
  report,
  onView,
  onDelete,
  onToggleFavorite,
  onTogglePin,
  onArchive
}) => {
  const isGenerating = report.metadata.status === 'queued' || report.metadata.status === 'running';
  const isFailed = report.metadata.status === 'failed';

  // Get status coloring
  const lifecycleColor = 
    report.metadata.lifecycle === 'archived' ? 'bg-slate-800 text-slate-400' :
    report.metadata.lifecycle === 'deleted' ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30' :
    report.metadata.lifecycle === 'generating' ? 'bg-indigo-900/40 text-indigo-400 animate-pulse' :
    'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20';

  return (
    <div className="relative group p-5 bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/20 rounded-3xl transition-all shadow-lg flex flex-col justify-between h-52">
      
      {/* Top row actions & info */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{report.type}</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => onTogglePin(report.id)}
              className={`p-1 rounded-md transition-colors ${report.isPinned ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onToggleFavorite(report.id)}
              className={`p-1 rounded-md transition-colors ${report.isFavorite ? 'text-pink-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Star className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="mt-4">
          <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{report.title}</h4>
          <div className="flex items-center gap-1.5 mt-1.5 text-3xs font-mono text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>{new Date(report.metadata.generatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Bottom status and buttons */}
      <div className="border-t border-white/5 pt-4 flex items-center justify-between">
        
        {/* State Badges */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-3xs font-mono font-bold uppercase tracking-wider ${lifecycleColor}`}>
            {report.metadata.lifecycle}
          </span>
          {report.metadata.aiEnabled && (
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" title="AI Summarized" />
          )}
        </div>

        {/* Action button triggers */}
        <div className="flex items-center gap-2">
          {isGenerating ? (
            <div className="text-3xs font-mono text-indigo-400 animate-pulse flex items-center gap-1">
              <span>{report.metadata.progress}%</span>
              <div className="w-2.5 h-2.5 rounded-full border border-indigo-400 border-t-transparent animate-spin" />
            </div>
          ) : isFailed ? (
            <div className="flex items-center gap-1 text-3xs font-mono text-rose-500">
              <ShieldAlert className="w-3.5 h-3.5" /> Failed
            </div>
          ) : (
            <>
              {onArchive && report.metadata.lifecycle !== 'archived' && (
                <button 
                  onClick={() => onArchive(report.id)}
                  className="px-2 py-1 text-3xs font-mono text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-md"
                >
                  ARCHIVE
                </button>
              )}
              <button 
                onClick={() => onView(report.id)}
                className="p-1.5 rounded-lg bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                title="View Report"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(report.id)}
                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                title="Delete Report"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

      </div>
      
    </div>
  );
});
