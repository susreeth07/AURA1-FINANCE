import { AnalyticsPipeline } from './AnalyticsPipeline';
import { DashboardPayload } from './DashboardModels';

export class DashboardAggregator {
  /**
   * Single entry point to fetch consolidated, cache-aware dashboard payload.
   */
  static async getDashboardPayload(userId: string, forceRefresh = false): Promise<DashboardPayload> {
    const result = await AnalyticsPipeline.run(userId, forceRefresh);
    return result.dashboard;
  }
}
