import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, FileText, Printer, Download, RotateCcw, ChevronRight, 
  HelpCircle, Send, Sparkles, MessageSquare, ArrowLeft, BarChart2,
  ListCollapse, Heart, Star, Pin
} from 'lucide-react';
import { ReportDocument } from '../../reports/ReportModels';
import { reportService } from '../../reports/ReportService';
import { ExecutiveSummaryCard } from './ExecutiveSummaryCard';
import { ExportDialog } from './ExportDialog';
import { AuraAI } from '../../ai/AuraAI';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar, 
  XAxis, YAxis, Tooltip
} from 'recharts';

interface ReportViewerProps {
  readonly reportId: string;
  readonly onClose: () => void;
  readonly onReportDeleted?: () => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = React.memo(({ reportId, onClose, onReportDeleted }) => {
  const [report, setReport] = useState<ReportDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [exportOpen, setExportOpen] = useState(false);

  // AI Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "Hello! I have loaded this financial report into memory. You can ask me any questions about these metrics or charts." }
  ]);
  const [chatThinking, setChatThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getReport(reportId);
      if (data) {
        setReport(data);
      } else {
        setError("Report not found in storage.");
      }
    } catch (e) {
      console.error('[ReportViewer] Failed to load report:', e);
      setError("Failed to retrieve report data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportId]);

  // Scroll to bottom on new chat messages
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatThinking]);

  const handleRefresh = async () => {
    if (!report) return;
    setLoading(true);
    try {
      const newReport = await reportService.refreshReport(report.id);
      // Wait for background job to finish or poll. Since refreshReport returns a queued stub immediately:
      // Let's poll for status changes in localStorage
      let attempts = 0;
      const interval = setInterval(async () => {
        const polled = await reportService.getReport(newReport.id);
        attempts++;
        if (polled && polled.metadata.status !== 'queued' && polled.metadata.status !== 'running') {
          clearInterval(interval);
          setReport(polled);
          setLoading(false);
        }
        if (attempts > 30) {
          clearInterval(interval);
          setError("Report regeneration timed out.");
          setLoading(false);
        }
      }, 1000);
    } catch (e) {
      console.error('[ReportViewer] Failed to refresh report:', e);
      setError("Regeneration trigger failed.");
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!report) return;
    await reportService.toggleFavorite(report.id);
    const updated = await reportService.getReport(report.id);
    if (updated) setReport(updated);
  };

  const handleTogglePin = async () => {
    if (!report) return;
    await reportService.togglePin(report.id);
    const updated = await reportService.getReport(report.id);
    if (updated) setReport(updated);
  };

  const handleToggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !report) return;
    const userQuery = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setChatInput('');
    setChatThinking(true);

    try {
      // Build context envelope
      const contextString = `
Report Title: ${report.title}
Report Period: ${report.metadata.period}
Inflow (Income): ${report.kpis.totalIncome}
Outflow (Expenses): ${report.kpis.totalExpenses}
Net Surplus: ${report.kpis.netBalance}
Runway: ${report.kpis.runway} months
Health Score: ${report.kpis.healthScore}/100
KPIs Growth: Income Growth ${report.kpis.incomeGrowthPct}%, Expense Growth ${report.kpis.expenseGrowthPct}%
AI Summary Headline: ${report.executive.headline}
AI Summary Overview: ${report.executive.overview}
Active Risks: ${report.executive.risks.join('; ')}
Recommendations: ${report.executive.recommendations.join('; ')}
`;

      const aiQueryPrompt = `
You are Aura AI financial assistant. You are helping the user analyze a specific financial report.
Here is the Report context details:
${contextString}

The user asks: "${userQuery}"

Provide a concise, helpful, professional financial explanation based only on this report. Keep it under 4-5 sentences.
`;

      const aiResponse = await AuraAI.query(report.metadata.generatedBy, aiQueryPrompt);
      setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse.answer }]);
    } catch (e) {
      console.error('[ReportViewer] Chat query failed:', e);
      setChatMessages(prev => [...prev, { role: 'ai', content: "I'm sorry, I encountered an error retrieving that explanation. Please try again." }]);
    } finally {
      setChatThinking(false);
    }
  };

  const toggleAllSections = () => {
    if (!report) return;
    const allCollapsed = Object.keys(collapsedSections).length === report.sections.length && 
                         Object.values(collapsedSections).every(v => v);
    
    const nextState: Record<string, boolean> = {};
    if (!allCollapsed) {
      for (const section of report.sections) {
        nextState[section.id] = true;
      }
    }
    setCollapsedSections(nextState);
  };

  // Preset chart colors
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-indigo-400 animate-pulse">COMPILING AUDIT SNAPSHOTS...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 border border-rose-900/30 rounded-3xl bg-rose-950/10">
        <span className="text-xs font-mono text-rose-400 mb-2">INTEGRITY EXCEPTION LOGGED</span>
        <p className="text-sm text-slate-300 mb-6">{error || 'An error occurred.'}</p>
        <button onClick={onClose} className="px-5 py-2 text-xs font-bold font-mono text-white bg-slate-800 hover:bg-slate-700 rounded-xl">
          RETURN TO REPORT CENTER
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative max-h-[85vh]">
      
      {/* Sticky Table of Contents (Left 1 col) */}
      <aside className="lg:col-span-1 hidden lg:block sticky top-0 bg-slate-900/40 p-5 rounded-3xl border border-white/5 h-fit text-xs space-y-6">
        <div>
          <h5 className="font-bold text-white mb-3">TOC Outline</h5>
          <nav className="space-y-1 text-slate-400 font-mono">
            <a href="#summary" className="block py-1.5 px-3 rounded-lg hover:bg-white/5 hover:text-white transition-all">&gt; Executive Summary</a>
            <a href="#kpis" className="block py-1.5 px-3 rounded-lg hover:bg-white/5 hover:text-white transition-all">&gt; Core KPIs</a>
            
            {report.comparison && (
              <a href="#comparison" className="block py-1.5 px-3 rounded-lg hover:bg-white/5 hover:text-white transition-all text-pink-400 font-bold">&gt; Compare Delta</a>
            )}

            {report.sections.map(s => (
              <a key={s.id} href={`#sec_${s.id}`} className="block py-1.5 px-3 rounded-lg hover:bg-white/5 hover:text-white transition-all">
                &gt; {s.title}
              </a>
            ))}
          </nav>
        </div>

        <div className="border-t border-white/5 pt-4">
          <button 
            onClick={toggleAllSections}
            className="w-full text-left font-mono py-1.5 text-slate-400 hover:text-white flex items-center gap-1.5"
          >
            <ListCollapse className="w-4 h-4" /> Toggle Sections
          </button>
        </div>
      </aside>

      {/* Main Report Body (Middle 3 cols) */}
      <div className="lg:col-span-3 flex flex-col space-y-6 overflow-y-auto pr-2 max-h-[85vh] scrollbar-thin">
        
        {/* Navigation Action Header */}
        <div className="flex items-center justify-between bg-slate-900/80 p-4 border border-white/5 rounded-3xl sticky top-0 z-10 backdrop-blur-md">
          <button onClick={onClose} className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> BACK TO CENTER
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleTogglePin}
              className={`p-2 rounded-xl border border-white/5 bg-slate-800/40 transition-colors ${
                report.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Pin className="w-4 h-4" />
            </button>
            <button 
              onClick={handleToggleFavorite}
              className={`p-2 rounded-xl border border-white/5 bg-slate-800/40 transition-colors ${
                report.isFavorite ? 'text-pink-500' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className="w-4 h-4 fill-current" />
            </button>
            <button 
              onClick={handleRefresh}
              className="p-2 rounded-xl border border-white/5 bg-slate-800/40 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-2xs font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" /> RE-GENERATE
            </button>
            <button 
              onClick={() => setExportOpen(true)}
              className="px-4 py-2 text-xs font-bold font-mono text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" /> EXPORT AUDIT
            </button>
          </div>
        </div>

        {/* Audit Header Page block */}
        <div className="bg-slate-900/20 p-6 border border-white/5 rounded-3xl space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-3xs font-mono text-indigo-400 tracking-widest uppercase block mb-1">ENTERPRISE AUDIT RECORD</span>
              <h2 className="text-xl font-black text-white">{report.title}</h2>
              <span className="text-2xs font-mono text-slate-500 uppercase mt-1 block">SCHEMA_V{report.metadata.schemaVersion} // COMPLIANCE_SECURE</span>
            </div>
            <div className="text-right font-mono text-[10px] text-slate-500 space-y-0.5">
              <div>UUID: {report.id}</div>
              <div>HASH: {report.metadata.integrityHash.substring(0, 16)}...</div>
            </div>
          </div>
        </div>

        {/* Section: Executive Summary */}
        <section id="summary" className="scroll-mt-20">
          <ExecutiveSummaryCard summary={report.executive} />
        </section>

        {/* Section: Core KPIs Grid */}
        <section id="kpis" className="scroll-mt-20 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Financial Key Performance Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/30 p-4 border border-white/5 rounded-2xl">
              <span className="text-3xs font-mono text-slate-400 block uppercase">Inflow Revenue</span>
              <span className="text-base font-bold text-white mt-1 block">₹{report.kpis.totalIncome.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900/30 p-4 border border-white/5 rounded-2xl">
              <span className="text-3xs font-mono text-slate-400 block uppercase">Expense Outflow</span>
              <span className="text-base font-bold text-white mt-1 block">₹{report.kpis.totalExpenses.toLocaleString()}</span>
            </div>
            <div className="bg-slate-900/30 p-4 border border-white/5 rounded-2xl">
              <span className="text-3xs font-mono text-slate-400 block uppercase">Net Surplus</span>
              <span className={`text-base font-bold mt-1 block ${report.kpis.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{report.kpis.netBalance.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-900/30 p-4 border border-white/5 rounded-2xl">
              <span className="text-3xs font-mono text-slate-400 block uppercase">Savings Rate</span>
              <span className="text-base font-bold text-white mt-1 block">{report.kpis.savingsRate}%</span>
            </div>
            <div className="bg-slate-900/30 p-4 border border-white/5 rounded-2xl">
              <span className="text-3xs font-mono text-slate-400 block uppercase">Health Score</span>
              <span className="text-base font-bold text-white mt-1 block">{report.kpis.healthScore}/100</span>
            </div>
            <div className="bg-slate-900/30 p-4 border border-white/5 rounded-2xl">
              <span className="text-3xs font-mono text-slate-400 block uppercase">Liquid Runway</span>
              <span className="text-base font-bold text-white mt-1 block">{report.kpis.runway.toFixed(1)} Months</span>
            </div>
          </div>
        </section>

        {/* Comparison Engine View */}
        {report.comparison && (
          <section id="comparison" className="scroll-mt-20 p-6 border border-pink-500/20 bg-pink-500/5 rounded-3xl space-y-4">
            <h4 className="text-xs font-mono font-bold text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4" /> Period Comparative delta analysis
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(report.comparison.kpiDeltas).map(([kpiName, delta]) => {
                const d = delta as any;
                const isPositive = d.direction === 'up';
                const isNeutral = d.direction === 'flat';
                return (
                  <div key={kpiName} className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-between">
                    <span className="text-3xs font-mono text-slate-400 uppercase">{kpiName}</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-xs font-bold text-white">₹{d.currentValue.toLocaleString()}</span>
                      <span className={`text-[10px] font-mono font-bold ${isNeutral ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isNeutral ? '' : isPositive ? '▲' : '▼'}{d.changePct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {report.comparison.recommendationsAdded.length > 0 && (
              <div className="text-2xs font-mono text-slate-300">
                <div className="font-bold text-pink-400 mb-1">New AI Recommendations:</div>
                <ul className="list-disc pl-4 space-y-1">
                  {report.comparison.recommendationsAdded.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Detailed Sections Block */}
        {report.sections.map(section => {
          const isCollapsed = collapsedSections[section.id];
          return (
            <section key={section.id} id={`sec_${section.id}`} className="scroll-mt-20 bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden transition-all">
              
              {/* Section Header */}
              <div 
                onClick={() => handleToggleSection(section.id)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.01] transition-colors"
              >
                <div>
                  <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider">{section.title}</h4>
                  <p className="text-3xs text-slate-400 mt-0.5">{section.summary}</p>
                </div>
                <ChevronRight className={`w-4.5 h-4.5 text-slate-500 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
              </div>

              {/* Section Body */}
              {!isCollapsed && (
                <div className="p-6 border-t border-white/5 bg-slate-950/20 space-y-6">
                  
                  {/* Render Charts if present */}
                  {section.charts && section.charts.map(chart => {
                    return (
                      <div key={chart.id} className="h-48 w-full bg-slate-950/40 p-4 border border-white/5 rounded-2xl flex flex-col justify-between">
                        <div className="text-3xs font-mono text-slate-400 uppercase tracking-wider mb-2">{chart.title}</div>
                        <div className="flex-1 w-full min-h-0">
                          {chart.type === 'area' ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chart.data}>
                                <defs>
                                  <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Area type="monotone" dataKey="income" stroke="#6366f1" fillOpacity={1} fill="url(#areaColor)" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="none" strokeDasharray="3 3" />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : chart.type === 'radial' ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chart.data}>
                                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                                  {chart.data.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.pct > 90 ? '#ef4444' : entry.pct > 70 ? '#f59e0b' : '#10b981'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chart.data}>
                                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                <Bar dataKey="pct" fill="#6366f1" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Section Data Tables */}
                  <div className="overflow-x-auto border border-white/5 rounded-2xl bg-slate-900/10">
                    <table className="w-full text-[11px] font-mono text-left">
                      <thead>
                        <tr className="bg-slate-900/30 text-slate-400 border-b border-white/5">
                          <th className="p-3">Key Parameter</th>
                          <th className="p-3">Value / Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(section.data || {}).map(([k, v]) => (
                          <tr key={k} className="border-b border-white/5 text-slate-300">
                            <td className="p-3 font-bold">{k}</td>
                            <td className="p-3">{String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Section Warnings */}
                  {section.warnings && section.warnings.length > 0 && (
                    <div className="space-y-1.5">
                      {section.warnings.map((w, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-3xs font-mono text-rose-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              )}

            </section>
          );
        })}

        {/* PDF & Export dialog wiring */}
        <ExportDialog 
          report={report} 
          isOpen={exportOpen} 
          onClose={() => setExportOpen(false)} 
        />

      </div>

      {/* Floating AI Report Chat (asking questions about this report context) */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
        {chatOpen ? (
          <div className="w-80 h-96 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-xs font-bold font-mono">Ask Aura Assistant</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message lists */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-none bg-slate-950/30">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 max-w-[85%] rounded-2xl text-[11px] leading-relaxed ${
                    msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200 border border-white/5'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatThinking && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-slate-850 text-slate-400 text-3xs font-mono flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span>Aura is calculating...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t border-slate-800 flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(); }}
                placeholder="Ask about this report..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button 
                onClick={handleSendChatMessage}
                className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          <button 
            onClick={() => setChatOpen(true)}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all border border-indigo-500 hover:scale-105"
          >
            <MessageSquare className="w-4.5 h-4.5" /> ASK AURA ABOUT REPORT
          </button>
        )}
      </div>

    </div>
  );
});
