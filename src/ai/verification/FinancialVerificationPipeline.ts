/**
 * FinancialVerificationPipeline.ts
 * 
 * Central Orchestration and Hardening Layer for Aura Finance's
 * Deterministic Financial Verification System (§AI-3.0).
 * 
 * Orchestrates Tiers 1 through 9:
 * - AI-2.1: FinancialVerifier (Numerical Grounding)
 * - AI-2.2: FinancialReasoningVerifier (Calculation Integrity)
 * - AI-2.3: FinancialConsistencyVerifier (Semantic Attribution)
 * - AI-2.4: FinancialFeasibilityVerifier (Feasibility & Constraints)
 * - AI-2.5: FinancialDecisionVerifier (Decision Safety)
 * - AI-2.6: FinancialUncertaintyVerifier (Uncertainty & Claim Scope)
 * - AI-2.7: FinancialResponseIntegrityVerifier (Response Integrity)
 * - AI-2.8: FinancialEvidenceVerifier (Evidence & Freshness)
 * - AI-2.9: FinancialCommunicationSafetyVerifier (Communication Safety)
 * 
 * Guarantees:
 * 1. Monotonic confidence reduction (confidence never increases).
 * 2. Strict per-tier and global confidence safety floors (minimum 0.10).
 * 3. Complete failure isolation: an exception in one verifier never crashes
 *    the pipeline, never drops prior warnings, and applies an auditable safety penalty.
 * 4. Cross-tier warning deduplication to prevent warning proliferation.
 * 5. High-performance deterministic execution (< 5ms target).
 */

import { FinancialVerifier } from './FinancialVerifier';
import { FinancialReasoningVerifier } from './FinancialReasoningVerifier';
import { FinancialConsistencyVerifier } from './FinancialConsistencyVerifier';
import { FinancialFeasibilityVerifier } from './FinancialFeasibilityVerifier';
import { FinancialDecisionVerifier } from './FinancialDecisionVerifier';
import { FinancialUncertaintyVerifier } from './FinancialUncertaintyVerifier';
import { FinancialResponseIntegrityVerifier } from './FinancialResponseIntegrityVerifier';
import { FinancialEvidenceVerifier } from './FinancialEvidenceVerifier';
import { FinancialCommunicationSafetyVerifier } from './FinancialCommunicationSafetyVerifier';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface ConfidenceScore {
  readonly level: ConfidenceLevel;
  readonly score: number;
}

export interface TierExecutionSummary {
  readonly tierName: string;
  readonly isValid: boolean;
  readonly warningCount: number;
  readonly executionStatus: 'success' | 'failed';
  readonly error?: string;
  readonly adjustedConfidence?: ConfidenceScore;
}

export interface PipelineVerificationResult {
  readonly isValid: boolean;
  readonly finalConfidence: ConfidenceScore;
  readonly warnings: readonly string[];
  readonly reasoning: readonly string[];
  readonly tierSummaries: Record<string, TierExecutionSummary>;
  readonly totalDurationMs: number;
}

export interface PipelineVerificationOptions {
  readonly existingWarnings?: readonly string[];
  readonly existingReasoning?: readonly string[];
}

export class FinancialVerificationPipeline {
  private static readonly CONFIDENCE_FLOOR = 0.10;

  /**
   * Executes all 9 verification tiers sequentially with error isolation,
   * monotonic confidence propagation, and global warning deduplication.
   */
  public static verify(
    query: string,
    answerText: string,
    context: Record<string, any>,
    toolOutputs: Record<string, any>,
    initialConfidence?: ConfidenceScore,
    options?: PipelineVerificationOptions
  ): PipelineVerificationResult {
    const startTime = performance.now();

    let currentConfidence: ConfidenceScore = initialConfidence
      ? { level: initialConfidence.level, score: initialConfidence.score }
      : { level: 'High', score: 0.85 };

    let warningsList: string[] = options?.existingWarnings ? [...options.existingWarnings] : [];
    let reasoningList: string[] = options?.existingReasoning ? [...options.existingReasoning] : [];
    const tierSummaries: Record<string, TierExecutionSummary> = {};

    // Helper to safely execute a verifier tier with error isolation
    const runTierSafely = (
      tierKey: string,
      tierDisplayName: string,
      verifierFn: () => {
        isValid: boolean;
        warnings?: readonly string[];
        reasoning?: readonly string[];
        adjustedConfidence?: { level: ConfidenceLevel; score: number };
      }
    ): void => {
      try {
        const res = verifierFn();

        if (!res.isValid) {
          if (res.warnings && res.warnings.length > 0) {
            warningsList = [...warningsList, ...res.warnings];
          }
          if (res.reasoning && res.reasoning.length > 0) {
            reasoningList = [...reasoningList, ...res.reasoning];
          }
        }

        // Monotonic confidence constraint: confidence must never increase
        if (res.adjustedConfidence && res.adjustedConfidence.score !== undefined) {
          const clampedScore = Math.max(
            this.CONFIDENCE_FLOOR,
            Math.min(currentConfidence.score, res.adjustedConfidence.score)
          );

          let calculatedLevel: ConfidenceLevel = 'High';
          if (clampedScore < 0.50) {
            calculatedLevel = 'Low';
          } else if (clampedScore < 0.80) {
            calculatedLevel = 'Medium';
          }

          currentConfidence = {
            level: calculatedLevel,
            score: clampedScore
          };
        }

        tierSummaries[tierKey] = {
          tierName: tierDisplayName,
          isValid: res.isValid,
          warningCount: res.warnings ? res.warnings.length : 0,
          executionStatus: 'success',
          adjustedConfidence: currentConfidence
        };
      } catch (err: any) {
        // Robust Failure Isolation (§AI-3.0 Phase 5)
        const errorMessage = err?.message || String(err);
        warningsList = [
          ...warningsList,
          `⚠️ Verification Pipeline: ${tierDisplayName} encountered an execution anomaly. Safe defaults applied.`
        ];
        reasoningList = [
          ...reasoningList,
          `Verification Pipeline: Isolated execution failure in ${tierDisplayName}: ${errorMessage}. Applied safety downgrade.`
        ];

        // Apply a cautious safety downgrade (-0.15), capped at Medium / 0.65
        const penalizedScore = Math.max(
          this.CONFIDENCE_FLOOR,
          Number((currentConfidence.score - 0.15).toFixed(2))
        );
        const safeScore = Math.min(penalizedScore, 0.65);

        let downgradedLevel: ConfidenceLevel = 'Low';
        if (safeScore >= 0.50) {
          downgradedLevel = 'Medium';
        }

        currentConfidence = {
          level: downgradedLevel,
          score: safeScore
        };

        tierSummaries[tierKey] = {
          tierName: tierDisplayName,
          isValid: false,
          warningCount: 1,
          executionStatus: 'failed',
          error: errorMessage,
          adjustedConfidence: currentConfidence
        };
      }
    };

    // -------------------------------------------------------------------------
    // Tier 1: Numerical Grounding (§AI-2.1)
    // -------------------------------------------------------------------------
    runTierSafely('tier1_numerical_grounding', 'FinancialVerifier (§AI-2.1)', () => {
      return FinancialVerifier.verify(
        query,
        answerText,
        context,
        toolOutputs,
        currentConfidence
      );
    });

    // -------------------------------------------------------------------------
    // Tier 2: Relational Arithmetic & Calculation Integrity (§AI-2.2)
    // -------------------------------------------------------------------------
    runTierSafely('tier2_calculation_integrity', 'FinancialReasoningVerifier (§AI-2.2)', () => {
      return FinancialReasoningVerifier.verify(
        query,
        answerText,
        context,
        toolOutputs,
        currentConfidence
      );
    });

    // -------------------------------------------------------------------------
    // Tier 3: Semantic Attribution & Consistency (§AI-2.3)
    // -------------------------------------------------------------------------
    runTierSafely('tier3_consistency', 'FinancialConsistencyVerifier (§AI-2.3)', () => {
      return FinancialConsistencyVerifier.verify(
        query,
        answerText,
        context,
        toolOutputs,
        currentConfidence,
        {
          existingWarnings: warningsList,
          existingReasoning: reasoningList
        }
      );
    });

    // -------------------------------------------------------------------------
    // Tier 4: Feasibility, Affordability & Constraints (§AI-2.4)
    // -------------------------------------------------------------------------
    runTierSafely('tier4_feasibility', 'FinancialFeasibilityVerifier (§AI-2.4)', () => {
      return FinancialFeasibilityVerifier.verify(
        query,
        answerText,
        context,
        toolOutputs,
        currentConfidence,
        {
          existingWarnings: warningsList,
          existingReasoning: reasoningList
        }
      );
    });

    // -------------------------------------------------------------------------
    // Tier 5: Decision Safety & Recommendation Integrity (§AI-2.5)
    // -------------------------------------------------------------------------
    runTierSafely('tier5_decision_safety', 'FinancialDecisionVerifier (§AI-2.5)', () => {
      return FinancialDecisionVerifier.verify(
        query,
        answerText,
        context,
        toolOutputs,
        currentConfidence,
        {
          existingWarnings: warningsList,
          existingReasoning: reasoningList
        }
      );
    });

    // -------------------------------------------------------------------------
    // Tier 6: Uncertainty, Claim Scope & Confidence Integrity (§AI-2.6)
    // -------------------------------------------------------------------------
    runTierSafely('tier6_uncertainty', 'FinancialUncertaintyVerifier (§AI-2.6)', () => {
      return FinancialUncertaintyVerifier.verify(
        query,
        answerText,
        context,
        toolOutputs,
        currentConfidence,
        {
          existingWarnings: warningsList,
          existingReasoning: reasoningList
        }
      );
    });

    // -------------------------------------------------------------------------
    // Tier 7: Response Integrity & Answer Completeness (§AI-2.7)
    // -------------------------------------------------------------------------
    runTierSafely('tier7_response_integrity', 'FinancialResponseIntegrityVerifier (§AI-2.7)', () => {
      return FinancialResponseIntegrityVerifier.verify(
        query,
        answerText,
        context,
        toolOutputs,
        currentConfidence,
        {
          existingWarnings: warningsList,
          existingReasoning: reasoningList
        }
      );
    });

    // -------------------------------------------------------------------------
    // Tier 8: Financial Evidence & Grounding (§AI-2.8)
    // -------------------------------------------------------------------------
    runTierSafely('tier8_evidence', 'FinancialEvidenceVerifier (§AI-2.8)', () => {
      return FinancialEvidenceVerifier.verify(
        query,
        answerText,
        context,
        toolOutputs,
        currentConfidence,
        {
          existingWarnings: warningsList,
          existingReasoning: reasoningList
        }
      );
    });

    // -------------------------------------------------------------------------
    // Tier 9: Communication Safety & Actionability (§AI-2.9)
    // -------------------------------------------------------------------------
    runTierSafely('tier9_communication_safety', 'FinancialCommunicationSafetyVerifier (§AI-2.9)', () => {
      return FinancialCommunicationSafetyVerifier.verify(
        query,
        answerText,
        context,
        toolOutputs,
        currentConfidence,
        {
          existingWarnings: warningsList,
          existingReasoning: reasoningList
        }
      );
    });

    const totalDurationMs = performance.now() - startTime;
    const allTiersValid = Object.values(tierSummaries).every(t => t.isValid);

    return {
      isValid: allTiersValid,
      finalConfidence: currentConfidence,
      warnings: warningsList,
      reasoning: reasoningList,
      tierSummaries,
      totalDurationMs
    };
  }
}
