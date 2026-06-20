import { AnalyticsPipeline } from '../analytics/AnalyticsPipeline';
import { AutomationFacade } from '../automation/AutomationFacade';

export class ContextBuilder {
  static async build(userId: string): Promise<Record<string, any>> {
    // 1. Get analytics context from pipeline (forceRefresh=false by default)
    const { dashboard, aiContext } = await AnalyticsPipeline.run(userId);
    
    // 2. Get automation summary
    const autoSummary = await AutomationFacade.getSummary(userId);

    // 3. Compact representation to save tokens
    return {
      kpis: aiContext.kpis,
      risks: aiContext.risks,
      trends: dashboard.charts.cashFlowTrend.value,
      budgets: aiContext.budgets.map(b => ({
        cat: b.category,
        lim: b.limit,
        spent: b.spent,
        pct: b.utilizationPercent
      })),
      savings: aiContext.savings.map(g => ({
        name: g.goalName,
        tar: g.targetAmount,
        cur: g.currentAmount,
        pct: g.progressPercent,
        m: g.remainingMonths
      })),
      forecasts: aiContext.forecasts,
      alerts: aiContext.alerts,
      reminders: (autoSummary.upcomingReminders || []).map(r => ({
        title: r.title,
        amt: r.amount,
        due: r.due_date,
        paid: r.is_paid
      })),
      notifications: (autoSummary.unreadNotifications || []).slice(0, 5).map(n => ({
        title: n.title,
        type: n.type,
        msg: n.message
      })),
      recommendations: aiContext.recommendations,
      insights: aiContext.insights,
      healthStatus: autoSummary.platformHealth
    };
  }
}
