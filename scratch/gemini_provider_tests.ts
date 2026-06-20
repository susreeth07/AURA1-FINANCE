/**
 * Phase 9.1 – Production Verification Suite (Extended)
 *
 * Verifies all Phase 9.1 final refinements:
 *   §1  Model auto-selection (small → Flash Lite, normal → Flash, complex → Pro)
 *   §2  Cost protection (daily/monthly budget warnings and Flash downgrade)
 *   §3  Request queue (FIFO ordering, queue metrics, concurrency gating)
 *   §4  Provider failover (retry → circuit breaker → fallback model → MockProvider)
 *   §5  Tool-calling stubs (ToolCallingProvider interface compliance)
 *   §6  Streaming cancellation contract
 *   §7  Correlation IDs and secure logging
 *   §8  Token accounting (daily/monthly cost maps)
 *   §9  Provider capability detection
 *   §10 Circuit breaker recovery (HalfOpen state machine)
 */
import { AuraAI } from '../src/ai/AuraAI';
import { AIHealth } from '../src/ai/AIHealth';
import { AIConfiguration } from '../src/ai/AIConfiguration';
import { ProviderRateLimiter } from '../src/ai/providers/ProviderRateLimiter';
import { CircuitBreaker } from '../src/ai/providers/CircuitBreaker';
import { TokenUsageTracker } from '../src/ai/providers/TokenUsageTracker';
import { CostProtection } from '../src/ai/providers/CostProtection';
import { ModelSelector } from '../src/ai/providers/ModelSelector';
import { LLMProvider, GenerationOptions, ToolCallingProvider } from '../src/ai/providers/LLMProvider';
import { GeminiProvider } from '../src/ai/providers/GeminiProvider';
import { MockProvider } from '../src/ai/providers/MockProvider';
import { RateLimitError } from '../src/ai/providers/ProviderErrors';
import { AnalyticsRepository } from '../src/analytics/AnalyticsRepository';
import { AnalyticsSnapshot } from '../src/analytics/AnalyticsSnapshot';
import { Money } from '../src/domain/finance/Money';
import { Currency } from '../src/domain/finance/Currency';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passedTests++;
  } else {
    failedTests++;
    console.error(`❌ FAILURE: ${message}`);
  }
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

let mockSnapshot: AnalyticsSnapshot;
AnalyticsRepository.loadSnapshot = async (_userId: string): Promise<AnalyticsSnapshot> => mockSnapshot;

function buildSnapshot(): AnalyticsSnapshot {
  const currency = Currency.USD;
  return {
    profile: {
      email: 'test@aurafinance.com',
      name: 'Test User',
      avatar: '',
      monthlySalary:         Money.fromDecimal(8000, currency),
      additionalIncome:      Money.fromDecimal(0, currency),
      currentSavings:        Money.fromDecimal(15000, currency),
      rent:                  Money.fromDecimal(2000, currency),
      fixedExpenses:         Money.fromDecimal(1000, currency),
      monthlyBills:          Money.fromDecimal(500, currency),
      emiLoans:              Money.fromDecimal(500, currency),
      savingsGoalPercentage: 20,
      hasSetupProfile:       true,
      salaryHistory:         []
    },
    incomes:         [],
    expenses:        [],
    budgets:         [],
    savingsGoals:    [],
    notifications:   [],
    timelineHistory: [],
    cashFlowHistory: [],
    reminders:       []
  };
}

// Provider that always fails (used to trip circuit breaker)
class FailingProvider implements LLMProvider {
  readonly id = 'failing';
  supportsStreaming()     { return false; }
  supportsSystemPrompts() { return false; }
  supportsVision()        { return false; }
  supportsToolCalling()   { return false; }
  async generate(): Promise<string> {
    throw new Error('Simulated connection failure');
  }
}

// =========================================================================
// TEST SUITE
// =========================================================================

async function runTestSuite(): Promise<void> {
  console.log('==========================================');
  console.log(' Phase 9.1 Extended Verification Suite   ');
  console.log('==========================================\n');

  mockSnapshot = buildSnapshot();
  AIConfiguration.setProfile('testing');

  // Reset all singletons before first test
  ProviderRateLimiter.reset();
  CircuitBreaker.reset();
  TokenUsageTracker.reset();
  CostProtection.reset();
  AIHealth.clear();

  // -----------------------------------------------------------------------
  // §1 – MODEL AUTO-SELECTION
  // -----------------------------------------------------------------------
  console.log('--- §1 Model Auto-Selection ---');

  AIConfiguration.setProfile('production');

  // Small: "Hello" → 1 word → small
  const smallSel = ModelSelector.selectModel('Hello');
  assert(smallSel.complexity === 'small', '§1: Short greeting → small complexity');
  assert(
    smallSel.model === AIConfiguration.getConfig().experimentalModel,
    '§1: Small prompt → experimentalModel (Flash Lite)'
  );

  // Normal: conversational query of 8–35 words (no financial keywords)
  const normalSel = ModelSelector.selectModel(
    'Can you show me a summary of my spending and income for this month please'
  );
  assert(normalSel.complexity === 'normal', '§1: 14-word query → normal complexity');
  assert(
    normalSel.model === AIConfiguration.getConfig().fallbackModel,
    '§1: Normal prompt → fallbackModel (Flash)'
  );

  // Complex: contains financial keyword "forecast"
  const complexSel = ModelSelector.selectModel(
    'Generate a 12-month cash flow forecast and simulate surplus investment'
  );
  assert(complexSel.complexity === 'complex', '§1: Financial forecast query → complex complexity');
  assert(
    complexSel.model === AIConfiguration.getConfig().defaultModel,
    '§1: Complex prompt → defaultModel (Pro)'
  );

  // Explicit override bypasses auto-selection
  const overrideSel = ModelSelector.selectModel('Hello', 'custom-model-x');
  assert(overrideSel.model === 'custom-model-x', '§1: Explicit modelOverride must be respected');

  AIConfiguration.setProfile('testing');

  // -----------------------------------------------------------------------
  // §2 – COST PROTECTION
  // -----------------------------------------------------------------------
  console.log('--- §2 Cost Protection ---');

  CostProtection.reset();
  AIConfiguration.setProfile('testing'); // daily limit $0.10, monthly $1.00

  // Record usage below threshold
  CostProtection.record(100, 100); // tiny cost
  assert(!CostProtection.shouldDowngradeToFlash(), '§2: Below threshold – should not downgrade');
  assert(CostProtection.isAllowed(), '§2: Below threshold – spending allowed');

  // Exhaust daily budget (testing: $0.10 limit)
  // Cost per call: ~(500_000 prompt + 500_000 completion) tokens ≈ expensive
  // Simple: record enough tokens to exceed $0.10
  // prompt cost: 500_000 * 0.000075 / 1000 = $0.0375
  // completion: 500_000 * 0.000300 / 1000 = $0.15 → total $0.1875 > $0.10
  CostProtection.reset();
  CostProtection.record(500_000, 500_000);
  assert(CostProtection.shouldDowngradeToFlash(), '§2: Over daily limit → should downgrade to Flash');

  const summary = CostProtection.getSummary();
  assert(summary.dailyWarningTriggered, '§2: Daily warning flag must be set');
  assert(summary.dailyCostUsd > 0.10, '§2: Daily cost must exceed the test limit');

  // At 2× hard limit, spending must be blocked
  // 2 * $0.10 = $0.20. Our single record already pushed $0.1875 → one more record > 0.20
  CostProtection.record(500_000, 500_000);
  assert(!CostProtection.isAllowed(), '§2: Over hard daily limit (2×) → spending disallowed');

  CostProtection.reset();

  // -----------------------------------------------------------------------
  // §3 – REQUEST QUEUE
  // -----------------------------------------------------------------------
  console.log('--- §3 Request Queue ---');

  ProviderRateLimiter.reset();
  ProviderRateLimiter.setLimits(60, 2, 5); // concurrency=2, queue capacity=5

  // Acquire both slots
  await ProviderRateLimiter.acquire();
  await ProviderRateLimiter.acquire();

  const metrics1 = ProviderRateLimiter.getMetrics();
  assert(metrics1.activeConcurrency === 2, '§3: Two slots acquired – activeConcurrency=2');
  assert(metrics1.queueDepth === 0, '§3: No queued requests yet');

  // Start two requests that will park in the queue (non-blocking – they await slot release)
  let r1Resolved = false;
  let r2Resolved = false;
  const p1 = ProviderRateLimiter.acquire().then(() => { r1Resolved = true; ProviderRateLimiter.release(); });
  const p2 = ProviderRateLimiter.acquire().then(() => { r2Resolved = true; ProviderRateLimiter.release(); });

  // Give the event loop a tick so they enter the queue
  await new Promise(r => setTimeout(r, 5));
  assert(ProviderRateLimiter.getMetrics().queueDepth === 2, '§3: Two requests must be queued');
  assert(ProviderRateLimiter.getMetrics().totalQueued === 2, '§3: totalQueued counter must be 2');

  // Release a slot – first queued request should be granted
  ProviderRateLimiter.release();
  await new Promise(r => setTimeout(r, 10));
  assert(r1Resolved, '§3: First queued request must resolve after slot release (FIFO)');

  // Release the second active slot → r2 gets granted
  ProviderRateLimiter.release();
  await new Promise(r => setTimeout(r, 10));
  assert(r2Resolved, '§3: Second queued request must resolve after second slot release (FIFO)');

  await Promise.allSettled([p1, p2]);

  // Queue capacity: fill to limit+1 and verify rejection
  ProviderRateLimiter.reset();
  ProviderRateLimiter.setLimits(60, 1, 2); // concurrency=1, queue=2
  await ProviderRateLimiter.acquire(); // occupy slot

  // These will queue (not await yet to avoid hanging)
  const pq1 = ProviderRateLimiter.acquire();
  const pq2 = ProviderRateLimiter.acquire();
  await new Promise(r => setTimeout(r, 5)); // let them park in queue

  let queueFull = false;
  try {
    await ProviderRateLimiter.acquire(); // queue is full (size=2) → throw
  } catch (e) {
    queueFull = e instanceof RateLimitError;
  }
  assert(queueFull, '§3: Queue overflow must throw RateLimitError');

  // Drain: release active slot + 2 queued grants
  ProviderRateLimiter.release(); // grants pq1
  await new Promise(r => setTimeout(r, 10));
  ProviderRateLimiter.release(); // releases pq1's slot, grants pq2
  await new Promise(r => setTimeout(r, 10));
  ProviderRateLimiter.release(); // releases pq2's slot
  await Promise.allSettled([pq1, pq2]); // ensure both promises settle

  ProviderRateLimiter.reset();
  ProviderRateLimiter.setLimits(100, 5, 100);

  // -----------------------------------------------------------------------
  // §4 – PROVIDER FAILOVER (from original suite)
  // -----------------------------------------------------------------------
  console.log('--- §4 Provider Failover ---');

  CircuitBreaker.reset();
  AIHealth.clear();
  assert(CircuitBreaker.getState() === 'Closed', '§4: Breaker starts CLOSED');

  AuraAI.shutdown();
  AuraAI.initialize('testing', new FailingProvider());

  try { await AuraAI.query('user_test', 'trigger failure 1'); } catch (_) {}
  try { await AuraAI.query('user_test', 'trigger failure 2'); } catch (_) {}
  try { await AuraAI.query('user_test', 'trigger failure 3'); } catch (_) {}

  assert(CircuitBreaker.getState() === 'Open', '§4: Breaker must trip OPEN after 3 failures');

  const fallbackResp = await AuraAI.query('user_test', 'trigger success under open circuit');
  assert(fallbackResp.metadata.providerUsed === 'mock', '§4: Open circuit → mock provider fallback');
  assert(fallbackResp.metadata.circuitBreakerState === 'Open', '§4: Metadata must record OPEN circuit state');

  // -----------------------------------------------------------------------
  // §5 – TOOL CALLING INTERFACE COMPLIANCE
  // -----------------------------------------------------------------------
  console.log('--- §5 Tool Calling Stubs ---');

  const mock = new MockProvider();
  assert(mock.supportsToolCalling() === false, '§5: MockProvider supportsToolCalling() → false (no native calling)');

  // MockProvider must still implement ToolCallingProvider interface
  const mockAsTool = mock as unknown as ToolCallingProvider;
  const toolResult = await mockAsTool.generateWithTools('What is my budget?', []);
  assert(typeof toolResult.text === 'string', '§5: generateWithTools must return a text field');
  assert(Array.isArray(toolResult.toolCalls), '§5: generateWithTools must return a toolCalls array');
  assert(toolResult.toolCalls.length === 0, '§5: MockProvider generateWithTools must return empty tool calls');

  const continueResult = await mockAsTool.continueWithToolResults('What is my budget?', []);
  assert(typeof continueResult === 'string', '§5: continueWithToolResults must return a string');

  const gemini = new GeminiProvider();
  assert(gemini.supportsToolCalling() === true, '§5: GeminiProvider supportsToolCalling() → true');
  const geminiAsTool = gemini as unknown as ToolCallingProvider;
  // GeminiProvider without API key → throws InvalidApiKeyError from generateWithTools
  let toolCallingRejected = false;
  try {
    await geminiAsTool.generateWithTools('test', []);
  } catch (_) {
    toolCallingRejected = true;
  }
  assert(toolCallingRejected, '§5: GeminiProvider without key must throw on generateWithTools');

  // -----------------------------------------------------------------------
  // §6 – STREAMING CANCELLATION CONTRACT
  // -----------------------------------------------------------------------
  console.log('--- §6 Streaming ---');

  AuraAI.shutdown();
  AuraAI.initialize('testing', new MockProvider());

  const streamingMock = new MockProvider();
  const stream = await streamingMock.generateStream('show me my budget');
  const chunks: string[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk.chunk);
    if (chunks.length === 3) break; // Cancellation: stop consuming early
  }

  assert(chunks.length >= 1, '§6: Stream must deliver at least one chunk');
  assert(chunks.length === 3, '§6: Stream cancellation after 3 chunks must work without error');

  // -----------------------------------------------------------------------
  // §7 – CORRELATION IDs
  // -----------------------------------------------------------------------
  console.log('--- §7 Correlation IDs ---');

  AuraAI.shutdown();
  AuraAI.initialize('testing', new MockProvider());

  const corrResp = await AuraAI.query('user_test', 'How is my budget?', {
    correlationId: 'test-corr-abc123',
    sessionId: 'test-sess-xyz789'
  });

  assert(corrResp.metadata.correlationId === 'test-corr-abc123', '§7: Custom correlationId must propagate');
  assert(corrResp.metadata.sessionId === 'test-sess-xyz789', '§7: Custom sessionId must propagate');
  assert(typeof corrResp.metadata.requestId === 'string' && corrResp.metadata.requestId.startsWith('req_'), '§7: requestId must be auto-generated');

  // -----------------------------------------------------------------------
  // §8 – TOKEN ACCOUNTING
  // -----------------------------------------------------------------------
  console.log('--- §8 Token Accounting ---');

  TokenUsageTracker.reset();
  TokenUsageTracker.recordUsage(1000, 2000);

  const stats = TokenUsageTracker.getStats();
  assert(stats.totalTokens === 3000, '§8: Total tokens must accumulate correctly');
  // Prompt: 1000 * 0.000075 / 1000 = 0.000075
  // Completion: 2000 * 0.000300 / 1000 = 0.0006
  assert(stats.estimatedCostUsd === 0.000675, '§8: Cost estimation must match standard rates');

  const dayKey = new Date().toISOString().slice(0, 10);
  const monthKey = new Date().toISOString().slice(0, 7);
  assert(stats.dailyTotals[dayKey] === 3000, '§8: Daily token totals must be recorded');
  assert(stats.monthlyTotals[monthKey] === 3000, '§8: Monthly token totals must be recorded');
  assert(typeof stats.dailyCostUsd[dayKey] === 'number', '§8: Daily cost USD map must be populated');
  assert(typeof stats.monthlyCostUsd[monthKey] === 'number', '§8: Monthly cost USD map must be populated');

  // -----------------------------------------------------------------------
  // §9 – PROVIDER CAPABILITY DETECTION
  // -----------------------------------------------------------------------
  console.log('--- §9 Provider Capability Detection ---');

  const mockProv = new MockProvider();
  assert(mockProv.supportsStreaming()     === true,  '§9: MockProvider supports streaming');
  assert(mockProv.supportsSystemPrompts() === true,  '§9: MockProvider supports system prompts');
  assert(mockProv.supportsVision()        === false, '§9: MockProvider does not support vision');
  assert(mockProv.supportsToolCalling()   === false, '§9: MockProvider does not support native tool calling');

  const geminiProv = new GeminiProvider();
  assert(geminiProv.supportsStreaming()     === true, '§9: GeminiProvider supports streaming');
  assert(geminiProv.supportsSystemPrompts() === true, '§9: GeminiProvider supports system prompts');
  assert(geminiProv.supportsVision()        === false, '§9: GeminiProvider does not support vision (current build)');
  assert(geminiProv.supportsToolCalling()   === true, '§9: GeminiProvider supports tool calling interface');

  // -----------------------------------------------------------------------
  // §10 – CIRCUIT BREAKER RECOVERY (HalfOpen state machine)
  // -----------------------------------------------------------------------
  console.log('--- §10 Circuit Breaker Recovery ---');

  CircuitBreaker.reset();

  // Record 3 failures to open
  CircuitBreaker.recordFailure();
  CircuitBreaker.recordFailure();
  CircuitBreaker.recordFailure();
  assert(CircuitBreaker.getState() === 'Open', '§10: Breaker must open after 3 failures');

  const statsBeforeRecovery = CircuitBreaker.getStats();
  assert(statsBeforeRecovery.openCount === 1, '§10: openCount must be 1 after first trip');
  assert(statsBeforeRecovery.failures === 3,  '§10: failures counter must be 3');

  // Record a success while Open (simulating a probe)
  CircuitBreaker.recordSuccess();
  assert(CircuitBreaker.getState() === 'Closed', '§10: Success call must reset breaker to Closed');
  assert(CircuitBreaker.getStats().failures === 0, '§10: Failure counter must reset to 0 after success');

  // Re-trip and check recoveryAttempts (indirectly via stats)
  CircuitBreaker.recordFailure();
  CircuitBreaker.recordFailure();
  CircuitBreaker.recordFailure();
  assert(CircuitBreaker.getState() === 'Open', '§10: Breaker must open again on new failures');
  assert(CircuitBreaker.getStats().openCount === 2, '§10: openCount must increment to 2');

  // -----------------------------------------------------------------------
  // §11 – AIHealth queue & cost fields
  // -----------------------------------------------------------------------
  console.log('--- §11 AIHealth Extended Report ---');

  const report = AIHealth.getReport();
  assert(typeof report.requestQueueDepth  === 'number', '§11: requestQueueDepth must be a number');
  assert(typeof report.requestQueueRejected === 'number', '§11: requestQueueRejected must be a number');
  assert(typeof report.dailyCostUsd       === 'number', '§11: dailyCostUsd must be a number');
  assert(typeof report.monthlyCostUsd     === 'number', '§11: monthlyCostUsd must be a number');
  assert(typeof report.dailyCostWarning   === 'boolean', '§11: dailyCostWarning must be a boolean');
  assert(typeof report.downgradedToFlash  === 'boolean', '§11: downgradedToFlash must be a boolean');

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('\n==========================================');
  console.log(`Verification Complete: Passed: ${passedTests}, Failed: ${failedTests}`);
  console.log('==========================================\n');

  if (failedTests > 0) process.exit(1);
}

runTestSuite().catch(err => {
  console.error('Test Suite execution crashed:', err);
  process.exit(1);
});
