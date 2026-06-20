import { ReportTemplate } from './ReportModels';

export interface TemplateStyle {
  readonly bodyClass: string;
  readonly cardClass: string;
  readonly tableHeaderClass: string;
  readonly tableRowClass: string;
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly headerClass: string;
  readonly fontSans: string;
  readonly sectionSpacing: string;
  readonly showDigitalOnly: boolean;
}

export const REPORT_TEMPLATES: Record<ReportTemplate, TemplateStyle> = {
  executive: {
    bodyClass: 'bg-slate-900 text-slate-100 font-sans p-8 max-w-5xl mx-auto border border-indigo-500/20 rounded-2xl shadow-xl',
    cardClass: 'bg-slate-800/50 backdrop-blur-md border border-indigo-500/10 p-6 rounded-xl shadow-lg',
    tableHeaderClass: 'bg-indigo-900/50 text-indigo-200 border-b border-indigo-500/20 font-bold',
    tableRowClass: 'border-b border-slate-800 hover:bg-indigo-950/20 transition-colors',
    primaryColor: '#6366f1', // Indigo
    accentColor: '#10b981', // Emerald
    headerClass: 'border-b-2 border-indigo-500 pb-6 mb-8 text-center',
    fontSans: 'font-sans',
    sectionSpacing: 'space-y-8',
    showDigitalOnly: true
  },
  professional: {
    bodyClass: 'bg-slate-950 text-slate-100 font-mono p-8 max-w-5xl mx-auto border border-slate-800 rounded-lg shadow-md',
    cardClass: 'bg-slate-900 border border-slate-800 p-6 rounded-lg',
    tableHeaderClass: 'bg-slate-800 text-slate-200 border-b border-slate-700 font-bold',
    tableRowClass: 'border-b border-slate-800/50 hover:bg-slate-900 transition-colors',
    primaryColor: '#3b82f6', // Blue
    accentColor: '#f59e0b', // Amber
    headerClass: 'border-b border-slate-800 pb-4 mb-6',
    fontSans: 'font-mono',
    sectionSpacing: 'space-y-6',
    showDigitalOnly: true
  },
  minimal: {
    bodyClass: 'bg-slate-950 text-slate-100 font-sans p-6 max-w-4xl mx-auto',
    cardClass: 'border border-slate-800 p-5 rounded-md',
    tableHeaderClass: 'text-slate-300 border-b border-slate-800 font-semibold',
    tableRowClass: 'border-b border-slate-900 hover:bg-slate-900/30',
    primaryColor: '#f8fafc', // Slate 50
    accentColor: '#cbd5e1', // Slate 300
    headerClass: 'border-b-2 border-slate-800 pb-4 mb-6',
    fontSans: 'font-sans',
    sectionSpacing: 'space-y-5',
    showDigitalOnly: true
  },
  dark: {
    bodyClass: 'bg-slate-950 text-slate-50 font-sans p-8 max-w-5xl mx-auto ring-1 ring-purple-500/30 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.1)]',
    cardClass: 'bg-slate-900/80 border border-purple-500/10 p-6 rounded-2xl shadow-xl',
    tableHeaderClass: 'bg-purple-950/40 text-purple-200 border-b border-purple-500/20 font-bold',
    tableRowClass: 'border-b border-slate-900 hover:bg-purple-950/10 transition-colors',
    primaryColor: '#a855f7', // Purple
    accentColor: '#ec4899', // Pink
    headerClass: 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 h-1 rounded-full mb-8',
    fontSans: 'font-sans',
    sectionSpacing: 'space-y-8',
    showDigitalOnly: true
  },
  presentation: {
    bodyClass: 'bg-slate-900 text-slate-100 font-sans p-10 max-w-6xl mx-auto space-y-12',
    cardClass: 'bg-slate-800/80 border border-indigo-500/10 p-8 rounded-2xl shadow-2xl text-lg',
    tableHeaderClass: 'bg-slate-800 text-indigo-400 font-bold border-b border-indigo-500/20',
    tableRowClass: 'border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors',
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
    headerClass: 'pb-6 mb-8 text-left bg-slate-800/40 p-6 rounded-xl border border-indigo-500/10',
    fontSans: 'font-sans',
    sectionSpacing: 'space-y-12',
    showDigitalOnly: true
  },
  printable: {
    bodyClass: 'bg-white text-slate-950 font-serif p-8 max-w-4xl mx-auto shadow-none',
    cardClass: 'border border-slate-300 p-6 rounded-none mb-6 page-break-inside-avoid bg-white shadow-none text-slate-950',
    tableHeaderClass: 'bg-slate-100 text-slate-950 border-b-2 border-slate-400 font-bold text-sm',
    tableRowClass: 'border-b border-slate-200 text-sm hover:bg-transparent text-slate-950',
    primaryColor: '#000000',
    accentColor: '#333333',
    headerClass: 'border-b-2 border-slate-950 pb-4 mb-8 text-center text-slate-950',
    fontSans: 'font-serif',
    sectionSpacing: 'space-y-6',
    showDigitalOnly: false // Hide sharing links, interactive dialogs, edit/delete buttons
  }
};
