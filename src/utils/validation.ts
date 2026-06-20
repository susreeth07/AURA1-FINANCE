export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validators = {
  /**
   * Helper to construct a validation result.
   */
  result(errors: Record<string, string>): ValidationResult {
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validates positive numeric amounts.
   */
  positiveAmount(val: number, fieldName: string): string | null {
    if (val === undefined || val === null || isNaN(val) || val <= 0) {
      return `${fieldName} must be a number greater than zero.`;
    }
    return null;
  },

  /**
   * Validates non-empty string fields.
   */
  requiredString(val: string, fieldName: string): string | null {
    if (!val || val.trim() === '') {
      return `${fieldName} is required.`;
    }
    return null;
  },

  /**
   * Validates string maximum lengths.
   */
  maximumLength(val: string, max: number, fieldName: string): string | null {
    if (val && val.length > max) {
      return `${fieldName} cannot exceed ${max} characters.`;
    }
    return null;
  },

  /**
   * Validates standard emails.
   */
  email(val: string): string | null {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val || !emailRegex.test(val)) {
      return 'A valid email address is required.';
    }
    return null;
  },

  /**
   * Validates standard UUID formats.
   */
  uuid(val: string, fieldName: string): string | null {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!val || !uuidRegex.test(val)) {
      return `${fieldName} must be a valid UUID key.`;
    }
    return null;
  },

  /**
   * Validates numeric currency values.
   */
  currency(val: number, fieldName: string): string | null {
    if (val === undefined || val === null || isNaN(val) || val < 0) {
      return `${fieldName} must be a valid currency index >= 0.`;
    }
    return null;
  },

  /**
   * Validates ISO date formats.
   */
  validDate(val: string, fieldName: string): string | null {
    if (!val || isNaN(Date.parse(val))) {
      return `${fieldName} must be a valid calendar date.`;
    }
    return null;
  },

  /**
   * Validates percentage thresholds.
   */
  percentage(val: number, fieldName: string): string | null {
    if (val === undefined || val === null || isNaN(val) || val < 0 || val > 100) {
      return `${fieldName} percentage must range between 0 and 100.`;
    }
    return null;
  },

  /**
   * Validates monthly salary inputs.
   */
  salary(val: number): string | null {
    if (val === undefined || val === null || isNaN(val) || val <= 0) {
      return 'Monthly salary index must be greater than zero.';
    }
    return null;
  },

  /**
   * Enterprise business validation rules for budget metrics.
   */
  budget(limit: number, categoryId: string, alertThreshold: number): ValidationResult {
    const errors: Record<string, string> = {};

    const limitErr = this.positiveAmount(limit, 'Budget Limit');
    if (limitErr) errors.limit = limitErr;

    const catErr = this.requiredString(categoryId, 'Budget Category');
    if (catErr) errors.categoryId = catErr;

    const threshErr = this.percentage(alertThreshold, 'Alert Threshold');
    if (threshErr) errors.alertThreshold = threshErr;

    return this.result(errors);
  },

  /**
   * Enterprise business validation rules for savings parameters.
   */
  savings(currentSavings: number, monthlySalary: number): ValidationResult {
    const errors: Record<string, string> = {};

    const savingsErr = this.currency(currentSavings, 'Current Savings');
    if (savingsErr) errors.currentSavings = savingsErr;

    if (currentSavings > monthlySalary) {
      errors.currentSavings = 'Current savings indices cannot exceed monthly base salary limits.';
    }

    return this.result(errors);
  },

  /**
   * Validates Savings Goal targets.
   */
  savingsGoal(name: string, targetAmount: number, currentAmount: number, category: string, targetDate: string): ValidationResult {
    const errors: Record<string, string> = {};

    const nameErr = this.requiredString(name, 'Goal Name');
    if (nameErr) errors.name = nameErr;

    const targetErr = this.positiveAmount(targetAmount, 'Target Amount');
    if (targetErr) errors.targetAmount = targetErr;

    const currentErr = this.currency(currentAmount, 'Current Amount');
    if (currentErr) errors.currentAmount = currentErr;

    const dateErr = this.validDate(targetDate, 'Target Date');
    if (dateErr) errors.targetDate = dateErr;

    if (!category || category.trim() === '') {
      errors.category = 'Goal Category is required.';
    }

    if (currentAmount > targetAmount) {
      errors.currentAmount = 'Current accrued savings cannot exceed target goals.';
    }

    return this.result(errors);
  }
};
