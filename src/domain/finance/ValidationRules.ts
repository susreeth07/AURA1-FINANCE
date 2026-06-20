import { Money } from './Money';

export class ValidationRules {
  static validateAmount(amount: Money): { isValid: boolean; error?: string } {
    if (amount.isZero() || amount.isNegative()) {
      return { isValid: false, error: "Amount must be greater than zero." };
    }
    return { isValid: true };
  }

  static validateSalary(salary: Money): { isValid: boolean; error?: string } {
    if (salary.isNegative()) {
      return { isValid: false, error: "Salary cannot be negative." };
    }
    // Cap at 10,000,000 standard currency units (1,000,000,000 cents)
    const cap = 1000000000n;
    if (salary.cents > cap) {
      return { isValid: false, error: "Salary exceeds the maximum allowable limit of 10,000,000." };
    }
    return { isValid: true };
  }

  static validateCategory(category: string): { isValid: boolean; error?: string } {
    const trimmed = category.trim();
    if (trimmed.length === 0) {
      return { isValid: false, error: "Category is required." };
    }
    if (trimmed.length > 50) {
      return { isValid: false, error: "Category must be 50 characters or less." };
    }
    return { isValid: true };
  }

  static validateDate(date: Date): { isValid: boolean; error?: string } {
    if (isNaN(date.getTime())) {
      return { isValid: false, error: "Invalid date format." };
    }
    return { isValid: true };
  }

  static validateDescription(description?: string): { isValid: boolean; error?: string } {
    if (description && description.length > 250) {
      return { isValid: false, error: "Description must be 250 characters or less." };
    }
    return { isValid: true };
  }
}
