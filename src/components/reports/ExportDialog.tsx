import React, { useState, useMemo, useEffect } from 'react';
import { X, FileText, FileSpreadsheet, FileCode, Printer, Download, Eye } from 'lucide-react';
import { ReportDocument } from '../../reports/ReportModels';
import { CSVExporter } from '../../reports/CSVExporter';
import { MarkdownExporter } from '../../reports/MarkdownExporter';
import { ExcelExporter } from '../../reports/ExcelExporter';
import { PDFExporter } from '../../reports/PDFExporter';

interface ExportDialogProps {
  readonly report: ReportDocument;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = React.memo(({ report, isOpen, onClose }) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'csv' | 'markdown'>('pdf');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string>('');

  const exporters = useMemo(() => ({
    pdf: new PDFExporter(),
    excel: new ExcelExporter(),
    csv: new CSVExporter(),
    markdown: new MarkdownExporter()
  }), []);

  useEffect(() => {
    if (!previewOpen || !isOpen) {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
        setPreviewBlobUrl('');
      }
      return;
    }

    const exporter = exporters[selectedFormat];
    const blob = exporter.export(report);
    const url = URL.createObjectURL(blob);
    setPreviewBlobUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [previewOpen, isOpen, selectedFormat, report, exporters]);

  if (!isOpen) return null;

  const handleExportDownload = () => {
    const exporter = exporters[selectedFormat];
    const blob = exporter.export(report);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.${
      selectedFormat === 'excel' ? 'xls' : selectedFormat
    }`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintTrigger = () => {
    const blob = exporters.pdf.export(report);
    const url = URL.createObjectURL(blob);
    const w = window.open(url);
    if (w) w.focus();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Export Audit Report</h3>
            <p className="text-2xs font-mono text-slate-500 mt-0.5">CHOOSE EXPORT COMPILER TYPE</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Formats Selection */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/40">
          
          <button 
            onClick={() => { setSelectedFormat('pdf'); setPreviewOpen(false); }}
            className={`p-4 flex flex-col items-center justify-center rounded-2xl border transition-all ${
              selectedFormat === 'pdf' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Printer className="w-8 h-8 mb-2" />
            <span className="text-xs font-bold font-mono">PRINTABLE PDF</span>
          </button>

          <button 
            onClick={() => { setSelectedFormat('excel'); setPreviewOpen(false); }}
            className={`p-4 flex flex-col items-center justify-center rounded-2xl border transition-all ${
              selectedFormat === 'excel' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-8 h-8 mb-2" />
            <span className="text-xs font-bold font-mono">EXCEL WORKBOOK</span>
          </button>

          <button 
            onClick={() => { setSelectedFormat('csv'); setPreviewOpen(false); }}
            className={`p-4 flex flex-col items-center justify-center rounded-2xl border transition-all ${
              selectedFormat === 'csv' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-8 h-8 mb-2" />
            <span className="text-xs font-bold font-mono">RAW CSV LEDGER</span>
          </button>

          <button 
            onClick={() => { setSelectedFormat('markdown'); setPreviewOpen(false); }}
            className={`p-4 flex flex-col items-center justify-center rounded-2xl border transition-all ${
              selectedFormat === 'markdown' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-8 h-8 mb-2" />
            <span className="text-xs font-bold font-mono">MARKDOWN FILE</span>
          </button>

        </div>

        {/* Live Preview section */}
        {previewOpen ? (
          <div className="flex-1 overflow-hidden p-6 border-t border-slate-800 bg-slate-950 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <span className="text-3xs font-mono text-indigo-400 uppercase tracking-widest">Live Pre-compiler Preview</span>
              <button 
                onClick={() => setPreviewOpen(false)}
                className="text-xs font-mono text-slate-500 hover:text-slate-300"
              >
                [CLOSE PREVIEW]
              </button>
            </div>
            
            <div className="flex-1 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/30">
              {selectedFormat === 'pdf' ? (
                <iframe 
                  src={previewBlobUrl} 
                  title="PDF Pre-print Layout Preview"
                  className="w-full h-full border-none bg-white"
                />
              ) : selectedFormat === 'markdown' ? (
                <iframe 
                  src={previewBlobUrl} 
                  title="Markdown Document Preview"
                  className="w-full h-full border-none bg-slate-900 text-slate-200 p-4 font-mono text-xs"
                />
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  Visual previews are only supported for Printable layouts & Markdown. 
                  Please download the file to inspect the raw workbook or ledger.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center border-t border-slate-800/80 bg-slate-950/20">
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Export builds a digital copy of the report frozen in time, protected by the integrity signatures.
            </p>
          </div>
        )}

        {/* Actions footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          <button 
            disabled={previewOpen}
            onClick={() => setPreviewOpen(true)}
            className="px-4 py-2 text-xs font-bold font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl flex items-center gap-2 transition-all"
          >
            <Eye className="w-4 h-4" /> PREVIEW DOCUMENT
          </button>
          
          <div className="flex gap-3">
            {selectedFormat === 'pdf' && (
              <button 
                onClick={handlePrintTrigger}
                className="px-4 py-2 text-xs font-bold font-mono text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-all border border-slate-800"
              >
                <Printer className="w-4 h-4" /> TRIGGER PRINT
              </button>
            )}
            
            <button 
              onClick={handleExportDownload}
              className="px-5 py-2.5 text-xs font-bold font-mono text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" /> DOWNLOAD COMPILED FILE
            </button>
          </div>
        </div>

      </div>
    </div>
  );
});
