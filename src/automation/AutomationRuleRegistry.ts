import { AutomationRule } from './rules/AutomationRule';

export class AutomationRuleRegistry {
  private rules = new Map<string, { rule: AutomationRule; enabled: boolean }>();

  register(rule: AutomationRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Duplicate rule registration detected for ID: ${rule.id}`);
    }
    this.rules.set(rule.id, { rule, enabled: true });
  }

  enable(ruleId: string): void {
    const entry = this.rules.get(ruleId);
    if (entry) {
      entry.enabled = true;
    }
  }

  disable(ruleId: string): void {
    const entry = this.rules.get(ruleId);
    if (entry) {
      entry.enabled = false;
    }
  }

  getEnabledRules(): AutomationRule[] {
    return Array.from(this.rules.values())
      .filter(entry => entry.enabled)
      .map(entry => entry.rule);
  }

  getSortedRules(): AutomationRule[] {
    const enabledRules = this.getEnabledRules();
    
    const priorityMap: Record<string, number> = {
      CRITICAL: 5,
      HIGH: 4,
      MEDIUM: 3,
      LOW: 2,
      BACKGROUND: 1
    };

    const visited = new Map<string, 'visiting' | 'visited'>();
    const sortedIds: string[] = [];

    const visit = (ruleId: string) => {
      if (visited.get(ruleId) === 'visiting') {
        throw new Error(`Circular dependency detected involving rule: ${ruleId}`);
      }
      if (visited.get(ruleId) === 'visited') {
        return;
      }

      visited.set(ruleId, 'visiting');

      const entry = this.rules.get(ruleId);
      if (entry) {
        for (const depId of entry.rule.dependencies) {
          visit(depId);
        }
      }

      visited.set(ruleId, 'visited');
      sortedIds.push(ruleId);
    };

    for (const rule of enabledRules) {
      visit(rule.id);
    }

    const ruleIndexMap = new Map<string, number>();
    sortedIds.forEach((id, idx) => ruleIndexMap.set(id, idx));

    // Sort by topological dependency sequence first, then by priority level descending
    return [...enabledRules].sort((a, b) => {
      const idxA = ruleIndexMap.get(a.id) ?? 0;
      const idxB = ruleIndexMap.get(b.id) ?? 0;
      
      if (idxA !== idxB) {
        return idxA - idxB;
      }

      const pA = priorityMap[a.priority] ?? 1;
      const pB = priorityMap[b.priority] ?? 1;
      return pB - pA;
    });
  }

  clear(): void {
    this.rules.clear();
  }
}
