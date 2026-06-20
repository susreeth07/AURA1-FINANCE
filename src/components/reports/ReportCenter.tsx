import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileText, Plus, Search, Calendar, RefreshCw, BarChart2,
  Trash2, ShieldCheck, Clock, Settings, Sparkles, Pin, Star,
  FolderMinus, FileDown
} from 'lucide-react';
import { ReportDocument, ReportPeriod } from '../../reports/ReportModels';
import { reportService, ScheduledConfig } from '../../reports/ReportService';
import { ReportCard } from './ReportCards';
import { ReportViewer } from './ReportViewer';

interface ReportCenterProps {
  readonly userId: string;
}

export const ReportCenter: React.FC<ReportCenterProps> = React.memo(({ userId }) => {
  const [reports, setReports] = useState<ReportDocument[]>([]);
  const [schedules, setSchedules] = useState<ScheduledConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pinned' | 'favorites' | 'schedules'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'quarter' | 'year'>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Quick Generate parameters
  const [genOpen, setGenOpen] = useState(false);
  const [genType, setGenType] = useState<ReportDocument['type']>('monthly');
  const [genTemplate, setGenTemplate] = useState('executive');
  const [genAI, setGenAI] = useState(true);

  // Scheduled configuration parameters
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedType, setSchedType] = useState<ReportDocument['type']>('monthly');
  const [schedFrequency, setSchedFrequency] = useState<ScheduledConfig['frequency']>('monthly');
  const [schedAI, setSchedAI] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const hist = await reportService.getHistory(userId);
      setReports(hist);
      const configs = reportService.loadSchedules();
      setSchedules(configs);
    } catch (e) {
      console.error('[ReportCenter] Failed to fetch report structures:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleGenerate = async () => {
    setGenOpen(false);
    try {
      await reportService.generateReport(userId, genType, genTemplate, { aiEnabled: genAI });
      // Trigger instant reload of list
      await fetchRecords();
      // Poll a few times as it compiles in the background
      let count = 0;
      const interval = setInterval(async () => {
        const history = await reportService.getHistory(userId);
        setReports(history);
        count++;
        // If no items are queued or running, stop polling
        const anyRunning = history.some(r => r.metadata.status === 'queued' || r.metadata.status === 'running');
        if (!anyRunning || count > 15) {
          clearInterval(interval);
        }
      }, 1000);
    } catch (e) {
      console.error('[ReportCenter] Generation triggers failed:', e);
    }
  };

  const handleCreateSchedule = async () => {
    setSchedOpen(false);
    try {
      await reportService.createSchedule(userId, schedType, 'executive', schedFrequency, schedAI);
      await fetchRecords();
    } catch (e) {
      console.error('[ReportCenter] Scheduling trigger failed:', e);
    }
  };

  const handleCancelSchedule = async (id: string) => {
    try {
      await reportService.cancelSchedule(id);
      await fetchRecords();
    } catch (e) {
      console.error('[ReportCenter] Canceling schedule failed:', e);
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await reportService.deleteReport(id, false); // soft-delete
      await fetchRecords();
    } catch (e) {
      console.error('[ReportCenter] Deletion failed:', e);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    await reportService.toggleFavorite(id);
    await fetchRecords();
  };

  const handleTogglePin = async (id: string) => {
    await reportService.togglePin(id);
    await fetchRecords();
  };

  // Compile Executive Stats
  const stats = useMemo(() => {
    const totalGenerated = reports.length;
    const activeSchedules = schedules.filter(s => s.active).length;
    const aiUsage = reports.filter(r => r.metadata.aiEnabled).length;
    const pinCount = reports.filter(r => r.isPinned).length;
    const totalViews = reports.reduce((acc, cur) => acc + (cur.viewCount || 0), 0);

    return {
      totalGenerated,
      activeSchedules,
      aiUsage,
      pinCount,
      totalViews
    };
  }, [reports, schedules]);

  // Filtering Logic
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // 1. Search Query
      const titleMatch = report.title.toLowerCase().includes(searchQuery.toLowerCase());
      const typeMatch = report.type.toLowerCase().includes(searchQuery.toLowerCase());
      if (!titleMatch && !typeMatch) return false;

      // 2. Tabs
      if (activeTab === 'pinned' && !report.isPinned) return false;
      if (activeTab === 'favorites' && !report.isFavorite) return false;

      // 3. Time Filter
      if (timeFilter !== 'all') {
        const now = new Date();
        const genDate = new Date(report.metadata.generatedAt);
        const diffMs = now.getTime() - genDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (timeFilter === 'today' && diffDays > 1.0) return false;
        if (timeFilter === 'week' && diffDays > 7.0) return false;
        if (timeFilter === 'month' && diffDays > 30.0) return false;
        if (timeFilter === 'quarter' && diffDays > 90.0) return false;
        if (timeFilter === 'year' && diffDays > 365.0) return false;
      }

      return true;
    });
  }, [reports, searchQuery, activeTab, timeFilter]);

  // View specific report
  if (selectedReportId) {
    return (
      <ReportViewer 
        reportId={selectedReportId} 
        onClose={() => { setSelectedReportId(null); fetchRecords(); }}
        onReportDeleted={() => { setSelectedReportId(null); fetchRecords(); }}
      />
    );
  }

  return (
    <div className="space-y-8 font-sans">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" /> Enterprise Report Center
          </h2>
          <p className="text-xs text-slate-400 mt-1">Generate and sign financial statements verified by Aura AI.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setSchedOpen(true)}
            className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 border border-slate-700"
          >
            <Settings className="w-4 h-4" /> REPORT SCHEDULING
          </button>
          
          <button 
            onClick={() => setGenOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4.5 h-4.5" /> CREATE NEW REPORT
          </button>
        </div>
      </div>

      {/* Executive stats dashboard cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className="bg-slate-900/40 p-4 border border-white/5 rounded-2xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Reports Compiled</span>
          <span className="text-lg font-bold text-white mt-1 block">{stats.totalGenerated}</span>
        </div>

        <div className="bg-slate-900/40 p-4 border border-white/5 rounded-2xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Schedules</span>
          <span className="text-lg font-bold text-white mt-1 block">{stats.activeSchedules}</span>
        </div>

        <div className="bg-slate-900/40 p-4 border border-white/5 rounded-2xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Audit Reads</span>
          <span className="text-lg font-bold text-white mt-1 block">{stats.totalViews}</span>
        </div>

        <div className="bg-slate-900/40 p-4 border border-white/5 rounded-2xl">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">AI Verification Usage</span>
          <span className="text-lg font-bold text-indigo-400 mt-1 block flex items-center gap-1">
            <Sparkles className="w-4.5 h-4.5" /> {stats.aiUsage}
          </span>
        </div>

        <div className="bg-slate-900/40 p-4 border border-white/5 rounded-2xl col-span-2 md:col-span-1">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Pinned Audits</span>
          <span className="text-lg font-bold text-amber-500 mt-1 block">{stats.pinCount}</span>
        </div>

      </div>

      {/* Main dashboard navigation layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left filters sidebar */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Navigation Tabs */}
          <div className="bg-slate-900/40 rounded-3xl p-4 border border-white/5 space-y-1">
            <span className="text-[9px] font-mono font-bold text-slate-500 tracking-wider block mb-2 px-3 uppercase">NAVIGATION FILTERS</span>
            
            <button 
              onClick={() => setActiveTab('all')}
              className={`w-full text-left px-3 py-2 text-xs font-mono rounded-xl transition-all ${
                activeTab === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              ALL STATEMENTS
            </button>
            <button 
              onClick={() => setActiveTab('pinned')}
              className={`w-full text-left px-3 py-2 text-xs font-mono rounded-xl transition-all flex items-center justify-between ${
                activeTab === 'pinned' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              PINNED AUDITS <Pin className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setActiveTab('favorites')}
              className={`w-full text-left px-3 py-2 text-xs font-mono rounded-xl transition-all flex items-center justify-between ${
                activeTab === 'favorites' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              FAVORITE REPORTS <Star className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setActiveTab('schedules')}
              className={`w-full text-left px-3 py-2 text-xs font-mono rounded-xl transition-all flex items-center justify-between ${
                activeTab === 'schedules' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              SCHEDULES CONFIG <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time range filters */}
          {activeTab !== 'schedules' && (
            <div className="bg-slate-900/40 rounded-3xl p-4 border border-white/5 space-y-1">
              <span className="text-[9px] font-mono font-bold text-slate-500 tracking-wider block mb-2 px-3 uppercase">TIME SPAN FILTERS</span>
              
              {(['all', 'today', 'week', 'month', 'quarter', 'year'] as const).map(filter => (
                <button 
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`w-full text-left px-3 py-1.5 text-2xs font-mono rounded-lg transition-all ${
                    timeFilter === filter ? 'bg-indigo-600/10 border-l-2 border-indigo-500 text-indigo-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {filter.toUpperCase()}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Right content listing */}
        <div className="lg:col-span-3 space-y-6">
          
          {activeTab === 'schedules' ? (
            /* Schedules list view */
            <div className="bg-slate-900/20 border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">Scheduled Report Generators</span>
                <span className="text-3xs font-mono text-slate-500">AUTOMATION INTEGRATED</span>
              </div>

              {schedules.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 font-mono">
                  No automated schedules currently active.
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((sched) => (
                    <div key={sched.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white uppercase font-mono">{sched.type} SCHEDULE</div>
                        <div className="text-3xs font-mono text-slate-500">
                          INTERVAL: {sched.frequency.toUpperCase()} // AI: {sched.aiEnabled ? 'ACTIVE' : 'OFF'}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleCancelSchedule(sched.id)}
                        className="px-3 py-1 text-3xs font-bold font-mono text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500 rounded-lg transition-colors border border-rose-950/40"
                      >
                        CANCEL SCHEDULE
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Reports list view */
            <div className="space-y-6">
              
              {/* Search and Filters Toolbar */}
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-900 border border-white/5 rounded-2xl px-4 py-2 flex items-center gap-3">
                  <Search className="w-4.5 h-4.5 text-slate-500" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by report title or period parameters..."
                    className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-slate-500 font-mono"
                  />
                </div>
                
                <button 
                  onClick={fetchRecords}
                  className="p-3 bg-slate-900 hover:bg-slate-850 rounded-2xl border border-white/5 text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Reports Grid */}
              {loading ? (
                <div className="text-center py-12 text-xs font-mono text-indigo-400 animate-pulse">
                  RESTORING SECURE STATEMENTS...
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-3xl">
                  No compiled reports matches the filter parameters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredReports.map((report) => (
                    <ReportCard 
                      key={report.id}
                      report={report}
                      onView={setSelectedReportId}
                      onDelete={handleDeleteReport}
                      onToggleFavorite={handleToggleFavorite}
                      onTogglePin={handleTogglePin}
                    />
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* QUICK GENERATE DRAWERS */}

      {/* Create New Report Drawer */}
      {genOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="text-center pb-4 mb-4 border-b border-white/5">
              <h4 className="text-base font-extrabold text-white">Create Financial Report</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">Configure Period Snapshot</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Report Scope Type</label>
                <select 
                  value={genType} 
                  onChange={(e) => setGenType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="monthly">Monthly Snapshot</option>
                  <option value="weekly">Weekly Snapshot</option>
                  <option value="quarterly">Quarterly Review</option>
                  <option value="annual">Annual Statement</option>
                  <option value="budget">Budget Compliance</option>
                  <option value="goal">Goal Progress</option>
                  <option value="cashflow">Cash Flow Audit</option>
                  <option value="forecast">Projections &amp; Affordability</option>
                  <option value="health">Financial Health Audit</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Layout Template Theme</label>
                <select 
                  value={genTemplate} 
                  onChange={(e) => setGenTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="executive">Aura Executive (Default)</option>
                  <option value="professional">Professional Corporate</option>
                  <option value="minimal">Minimal Slate</option>
                  <option value="dark">Dark Aura Glow</option>
                  <option value="presentation">Presentation Board</option>
                  <option value="printable">Printable Serif</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-300 block uppercase">Aura AI Verification</span>
                  <span className="text-[9px] text-slate-500 font-mono block">Enables executive summarization engine</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={genAI} 
                  onChange={(e) => setGenAI(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setGenOpen(false)}
                className="flex-1 py-2 text-xs font-bold font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                CANCEL
              </button>
              <button 
                onClick={handleGenerate}
                className="flex-1 py-2 text-xs font-bold font-mono text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20"
              >
                COMPILE REPORT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Schedule Report Drawer */}
      {schedOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="text-center pb-4 mb-4 border-b border-white/5">
              <h4 className="text-base font-extrabold text-white">Create Automated Schedule</h4>
              <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">Configure Automation triggers</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Report Scope Type</label>
                <select 
                  value={schedType} 
                  onChange={(e) => setSchedType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="monthly">Monthly Snapshot</option>
                  <option value="weekly">Weekly Snapshot</option>
                  <option value="quarterly">Quarterly Review</option>
                  <option value="annual">Annual Statement</option>
                  <option value="budget">Budget Compliance</option>
                  <option value="goal">Goal Progress</option>
                  <option value="cashflow">Cash Flow Audit</option>
                  <option value="forecast">Projections &amp; Affordability</option>
                  <option value="health">Financial Health Audit</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Scheduling Frequency</label>
                <select 
                  value={schedFrequency} 
                  onChange={(e) => setSchedFrequency(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="daily">Daily Cron Trigger</option>
                  <option value="weekly">Weekly Cron Trigger</option>
                  <option value="monthly">Monthly Cron Trigger</option>
                  <option value="quarterly">Quarterly Cron Trigger</option>
                  <option value="yearly">Yearly Cron Trigger</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/40 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-300 block uppercase">Aura AI Verification</span>
                  <span className="text-[9px] text-slate-500 font-mono block">Enables executive summarization engine</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={schedAI} 
                  onChange={(e) => setSchedAI(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setSchedOpen(false)}
                className="flex-1 py-2 text-xs font-bold font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                CANCEL
              </button>
              <button 
                onClick={handleCreateSchedule}
                className="flex-1 py-2 text-xs font-bold font-mono text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20"
              >
                ACTIVATE SCHEDULE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
});
