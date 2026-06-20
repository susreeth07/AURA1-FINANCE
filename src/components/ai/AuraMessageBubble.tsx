import React, { useCallback, useMemo } from 'react';
import {
  Copy, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb,
  ChevronRight, Quote
} from 'lucide-react';
import { AuraResponse } from '../../ai/models/AuraResponse';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuraMessageBubbleProps {
  message: string;
  sender: 'user' | 'ai';
  timestamp: string;
  isStreaming?: boolean;
  auraResponse?: AuraResponse;
  onFollowUp?: (question: string) => void;
  onCopy?: () => void;
  onRegenerate?: () => void;
}

// ─── Inline Markdown Parser ───────────────────────────────────────────────────

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const segments: React.ReactNode[] = [];
  const inlineRe = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = inlineRe.exec(text)) !== null) {
    if (m.index > last) segments.push(text.slice(last, m.index));
    const raw = m[0];
    if (raw.startsWith('**')) {
      segments.push(<strong key={key++} className="font-semibold text-white">{raw.slice(2, -2)}</strong>);
    } else if (raw.startsWith('*')) {
      segments.push(<em key={key++} className="italic text-slate-200">{raw.slice(1, -1)}</em>);
    } else if (raw.startsWith('`')) {
      segments.push(
        <code key={key++} className="font-mono text-xs bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">
          {raw.slice(1, -1)}
        </code>
      );
    }
    last = m.index + raw.length;
  }
  if (last < text.length) segments.push(text.slice(last));
  return segments;
}

interface ParsedBlock {
  type: 'paragraph' | 'heading' | 'bullet' | 'ordered' | 'code-block';
  content: string;
  level?: number;
  index?: number;
}

function parseMarkdownBlocks(raw: string): ParsedBlock[] {
  const lines = raw.split('\n');
  const blocks: ParsedBlock[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({ type: 'code-block', content: codeLines.join('\n') });
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] });
      continue;
    }
    const bulletMatch = line.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      blocks.push({ type: 'bullet', content: bulletMatch[1] });
      continue;
    }
    const orderedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (orderedMatch) {
      blocks.push({ type: 'ordered', index: parseInt(orderedMatch[1], 10), content: orderedMatch[2] });
      continue;
    }
    if (line.trim()) {
      blocks.push({ type: 'paragraph', content: line });
    }
  }
  if (inCodeBlock && codeLines.length) {
    blocks.push({ type: 'code-block', content: codeLines.join('\n') });
  }
  return blocks;
}

const MarkdownRenderer = React.memo(({ text }: { text: string }) => {
  const blocks = useMemo(() => parseMarkdownBlocks(text), [text]);
  return (
    <div className="space-y-1.5">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const sizes: Record<number, string> = { 1: 'text-lg font-bold', 2: 'text-base font-semibold', 3: 'text-sm font-semibold' };
            return (
              <p key={i} className={`${sizes[block.level ?? 2] ?? sizes[2]} text-white mt-2`}>
                {parseInlineMarkdown(block.content)}
              </p>
            );
          }
          case 'code-block':
            return (
              <pre key={i} className="font-mono text-xs bg-slate-900/80 border border-slate-700/50 text-emerald-300 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {block.content}
              </pre>
            );
          case 'bullet':
            return (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                <span>{parseInlineMarkdown(block.content)}</span>
              </div>
            );
          case 'ordered':
            return (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <span className="mt-0.5 text-indigo-400 font-mono text-xs shrink-0 w-4">{block.index}.</span>
                <span>{parseInlineMarkdown(block.content)}</span>
              </div>
            );
          default:
            return (
              <p key={i} className="text-sm text-slate-200 leading-relaxed">
                {parseInlineMarkdown(block.content)}
              </p>
            );
        }
      })}
    </div>
  );
});
MarkdownRenderer.displayName = 'MarkdownRenderer';

const ConfidenceBadge = React.memo(({ level }: { level: 'High' | 'Medium' | 'Low' }) => {
  const styles: Record<string, string> = {
    High: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    Low: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  };
  const dotColor: Record<string, string> = {
    High: 'bg-emerald-400',
    Medium: 'bg-amber-400',
    Low: 'bg-rose-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${styles[level]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor[level]}`} />
      {level} Confidence
    </span>
  );
});
ConfidenceBadge.displayName = 'ConfidenceBadge';

const AuraExtras = React.memo(({
  auraResponse,
  onFollowUp,
}: {
  auraResponse: AuraResponse;
  onFollowUp?: (q: string) => void;
}) => {
  const { confidence, insights, warnings, recommendations, followUpQuestions, citations } = auraResponse;
  return (
    <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
      <ConfidenceBadge level={confidence.level} />

      {insights.length > 0 && (
        <div className="ai-insight-card p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-2">
            <Lightbulb className="w-3.5 h-3.5" />
            Insights
          </div>
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <ChevronRight className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w, i) => (
            <div key={i} className="ai-warning-card flex items-start gap-2 p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-xs text-amber-200">{w}</span>
            </div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-1.5">
          {recommendations.map((rec, i) => (
            <div key={i} className="kpi-card flex items-start gap-2 p-2.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span className="text-xs text-emerald-200">{rec}</span>
            </div>
          ))}
        </div>
      )}

      {followUpQuestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {followUpQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onFollowUp?.(q)}
              aria-label={`Follow-up: ${q}`}
              className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-colors focus-ring"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {citations.length > 0 && (
        <div className="flex items-start gap-1.5 pt-1">
          <Quote className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-500 leading-relaxed">{citations.join(' · ')}</p>
        </div>
      )}
    </div>
  );
});
AuraExtras.displayName = 'AuraExtras';

export const AuraMessageBubble = React.memo(({
  message,
  sender,
  timestamp,
  isStreaming = false,
  auraResponse,
  onFollowUp,
  onCopy,
  onRegenerate,
}: AuraMessageBubbleProps) => {
  const isAI = sender === 'ai';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message).catch(() => {});
    onCopy?.();
  }, [message, onCopy]);

  return (
    <div
      role="log"
      aria-live={isStreaming ? 'polite' : 'off'}
      className={`flex ${isAI ? 'justify-start' : 'justify-end'} px-2`}
    >
      {isAI && (
        <div
          className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 mt-1 mr-2 shadow-[0_0_12px_rgba(99,102,241,0.3)]"
          aria-hidden="true"
        >
          <span className="font-bold text-xs text-white">A</span>
        </div>
      )}

      <div className="group relative max-w-[85%] min-w-[80px]">
        <div
          className={`relative rounded-2xl px-4 py-3 ${
            isAI
              ? 'ai-bubble rounded-tl-sm'
              : 'user-bubble rounded-tr-sm shadow-lg'
          }`}
        >
          {isAI && (
            <div className="absolute -top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10">
              <button
                onClick={handleCopy}
                aria-label="Copy message"
                className="p-1 rounded-md bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  aria-label="Regenerate response"
                  className="p-1 rounded-md bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {isAI ? (
            <>
              <MarkdownRenderer text={message} />
              {isStreaming && <span className="cursor-blink" aria-hidden="true" />}
            </>
          ) : (
            <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{message}</p>
          )}

          {isAI && auraResponse && (
            <AuraExtras auraResponse={auraResponse} onFollowUp={onFollowUp} />
          )}
        </div>

        <p className={`text-[10px] mt-1 text-slate-500 ${isAI ? 'text-left pl-1' : 'text-right pr-1'}`}>
          {timestamp}
        </p>
      </div>

      {!isAI && (
        <div
          className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0 mt-1 ml-2"
          aria-hidden="true"
        >
          <span className="font-bold text-xs text-slate-200">U</span>
        </div>
      )}
    </div>
  );
});

AuraMessageBubble.displayName = 'AuraMessageBubble';
