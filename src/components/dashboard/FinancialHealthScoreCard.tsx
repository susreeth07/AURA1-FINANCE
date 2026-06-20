import React, { useEffect, useRef, useState, memo, useMemo } from 'react';
import { Shield } from 'lucide-react';
import { motion } from 'motion/react';

interface FinancialHealthScoreCardProps {
  score: number; // 0-100, or -1 for loading
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  currency?: string;
}

const RADIUS = 52;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// 270 degrees = 3/4 of circumference
const ARC_LENGTH = CIRCUMFERENCE * 0.75;

function getScoreColor(score: number): string {
  if (score > 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function formatCurrency(value: number, currency: string): string {
  return `${currency}${value.toLocaleString('en-IN')}`;
}

function getLastUpdated(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const SkeletonBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} />
);

const FinancialHealthScoreCard: React.FC<FinancialHealthScoreCardProps> = ({
  score,
  monthlyIncome,
  monthlyExpenses,
  savings,
  currency = '₹',
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const isLoading = score === -1;
  const lastUpdated = useMemo(() => getLastUpdated(), []);
  const scoreColor = useMemo(() => (isLoading ? '#64748b' : getScoreColor(score)), [score, isLoading]);

  useEffect(() => {
    if (isLoading) { setAnimatedScore(0); return; }
    const targetScore = Math.max(0, Math.min(100, score));
    startTimeRef.current = null;
    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / 1200, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * targetScore));
      if (progress < 1) animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current); };
  }, [score, isLoading]);

  const dashOffset = useMemo(
    () => isLoading ? ARC_LENGTH : ARC_LENGTH - (animatedScore / 100) * ARC_LENGTH,
    [animatedScore, isLoading]
  );

  const SIZE = RADIUS * 2 + STROKE_WIDTH * 2 + 4;
  const center = SIZE / 2;

  const metrics = useMemo(() => [
    { label: 'Income',   value: monthlyIncome,   color: '#10b981' },
    { label: 'Expenses', value: monthlyExpenses,  color: '#ef4444' },
    { label: 'Savings',  value: savings,          color: '#6366f1' },
  ], [monthlyIncome, monthlyExpenses, savings]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative rounded-2xl glass-panel-dark p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-200 tracking-wide">Financial Health</span>
        </div>
        {isLoading
          ? <div className="skeleton-text w-24 h-3" />
          : <span className="text-xs text-slate-500 font-mono">Updated {lastUpdated}</span>
        }
      </div>

      {isLoading ? (
        /* Skeleton state */
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <SkeletonBlock className="w-28 h-28 rounded-full" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="w-2 h-2 rounded-full" />
                <div className="skeleton-text w-14 h-3" />
              </div>
              <div className="skeleton-text w-20 h-3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* SVG Arc — 270° (3/4 circle), starts bottom-left */}
          <div className="flex justify-center">
            <svg
              width={SIZE}
              height={Math.round(SIZE * 0.82)}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              style={{ overflow: 'visible' }}
              aria-label={`Financial health score: ${animatedScore}`}
            >
              <g transform={`rotate(135, ${center}, ${center})`}>
                {/* Track */}
                <circle
                  cx={center} cy={center} r={RADIUS}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
                  strokeLinecap="round"
                />
                {/* Filled arc */}
                <circle
                  cx={center} cy={center} r={RADIUS}
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 0.04s linear, stroke 0.5s ease',
                    filter: `drop-shadow(0 0 8px ${scoreColor}55)`,
                  }}
                />
              </g>
              {/* Center score text */}
              <text
                x={center} y={center - 7}
                textAnchor="middle" dominantBaseline="middle"
                fill={scoreColor} fontSize="26" fontWeight="700" fontFamily="inherit"
                style={{ transition: 'fill 0.5s ease' }}
              >
                {animatedScore}
              </text>
              <text
                x={center} y={center + 14}
                textAnchor="middle" dominantBaseline="middle"
                fill="rgba(148,163,184,0.85)" fontSize="10" fontWeight="500" fontFamily="inherit"
              >
                Score
              </text>
            </svg>
          </div>

          {/* Metric rows */}
          <div className="flex flex-col gap-2.5">
            {metrics.map(m => (
              <div key={m.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-xs text-slate-400 font-medium">{m.label}</span>
                </div>
                <span className="text-xs font-semibold text-slate-200 font-mono">
                  {formatCurrency(m.value, currency)}
                </span>
              </div>
            ))}
          </div>

          {/* Interpretation pill */}
          <div
            className="mt-1 rounded-lg px-3 py-2 text-xs font-medium text-center"
            style={{ background: `${scoreColor}18`, border: `1px solid ${scoreColor}30`, color: scoreColor }}
          >
            {score > 70
              ? '✓ Excellent financial health'
              : score >= 40
                ? '⚠ Moderate — room to improve'
                : '✗ Needs urgent attention'}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default memo(FinancialHealthScoreCard);
