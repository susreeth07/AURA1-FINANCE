import { supabase } from '../lib/supabaseClient';
import { UserProfile } from '../types';
import { logger } from '../utils/logger';

// Map database columns to UserProfile JS model
export function mapDbToProfile(profile: any): UserProfile {
  return {
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    monthlySalary: Number(profile.monthly_salary),
    additionalIncome: Number(profile.additional_income),
    currentSavings: Number(profile.current_savings),
    rent: Number(profile.rent),
    fixedExpenses: Number(profile.fixed_expenses),
    monthlyBills: Number(profile.monthly_bills),
    emiLoans: Number(profile.emi_loans),
    savingsGoalPercentage: Number(profile.savings_goal_percentage),
    hasSetupProfile: profile.has_setup_profile,
    onboardingStep: profile.onboarding_step ? Number(profile.onboarding_step) : 1,
    completedAt: profile.completed_at || undefined,
    salaryHistory: profile.salary_history || []
  };
}

// Map UserProfile JS model to database columns
export function mapProfileToDb(profile: Partial<UserProfile>): any {
  const dbData: any = {};
  
  if (profile.name !== undefined) dbData.name = profile.name;
  if (profile.email !== undefined) dbData.email = profile.email;
  if (profile.avatar !== undefined) dbData.avatar_url = profile.avatar;
  if (profile.monthlySalary !== undefined) dbData.monthly_salary = profile.monthlySalary;
  if (profile.additionalIncome !== undefined) dbData.additional_income = profile.additionalIncome;
  if (profile.currentSavings !== undefined) dbData.current_savings = profile.currentSavings;
  if (profile.rent !== undefined) dbData.rent = profile.rent;
  if (profile.fixedExpenses !== undefined) dbData.fixed_expenses = profile.fixedExpenses;
  if (profile.monthlyBills !== undefined) dbData.monthly_bills = profile.monthlyBills;
  if (profile.emiLoans !== undefined) dbData.emi_loans = profile.emiLoans;
  if (profile.savingsGoalPercentage !== undefined) dbData.savings_goal_percentage = profile.savingsGoalPercentage;
  if (profile.hasSetupProfile !== undefined) dbData.has_setup_profile = profile.hasSetupProfile;
  if (profile.onboardingStep !== undefined) dbData.onboarding_step = profile.onboardingStep;
  if (profile.completedAt !== undefined) dbData.completed_at = profile.completedAt;
  if (profile.salaryHistory !== undefined) dbData.salary_history = profile.salaryHistory;
  
  dbData.updated_at = new Date().toISOString();
  return dbData;
}

export const profileService = {
  /**
   * Run operation with exponential backoff retry.
   * Retry schedule: 1s, 2s, 4s.
   */
  async retryOperation<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (err: any) {
        attempt++;
        if (attempt >= maxRetries) {
          throw err;
        }
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.warn(`[ProfileService] Database operation failed: ${err.message || err}. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },

  /**
   * Load user profile details.
   */
  async loadProfile(userId: string): Promise<UserProfile | null> {
    return this.retryOperation(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapDbToProfile(data);
    });
  },

  /**
   * Save a partially completed onboarding step.
   * Upserts the profiles table, updating onboarding_step and fields.
   */
  async saveOnboardingStep(userId: string, step: number, profileData: Partial<UserProfile>): Promise<UserProfile> {
    return this.retryOperation(async () => {
      const dbPayload = mapProfileToDb({
        ...profileData,
        onboardingStep: step
      });
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          ...dbPayload
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbToProfile(data);
    });
  },

  /**
   * Complete the onboarding flow atomically.
   */
  async completeOnboarding(userId: string, finalProfile: UserProfile): Promise<UserProfile> {
    return this.retryOperation(async () => {
      const dbPayload = mapProfileToDb({
        ...finalProfile,
        onboardingStep: 4, // final step represents completion state
        hasSetupProfile: true,
        completedAt: new Date().toISOString()
      });

      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          ...dbPayload
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbToProfile(data);
    });
  },

  /**
   * Standard profile update (e.g. settings dashboard adjustments)
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.retryOperation(async () => {
      const dbPayload = mapProfileToDb(updates);
      
      const { data, error } = await supabase
        .from('profiles')
        .update(dbPayload)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return mapDbToProfile(data);
    });
  },

  /**
   * Validation suite for onboarding steps.
   */
  validateProfile(step: number, formData: any): { [key: string]: string } {
    const errors: { [key: string]: string } = {};

    if (step === 1) {
      if (formData.monthlySalary === undefined || formData.monthlySalary === null || String(formData.monthlySalary).trim() === '') {
        errors.monthlySalary = 'Base salary is required.';
      } else if (Number(formData.monthlySalary) <= 0) {
        errors.monthlySalary = 'Salary must be greater than zero.';
      }

      if (Number(formData.additionalIncome) < 0) {
        errors.additionalIncome = 'Additional yields cannot be negative.';
      }
    }

    if (step === 2) {
      const salary = Number(formData.monthlySalary) || 0;
      
      if (Number(formData.rent) < 0) {
        errors.rent = 'Rent cannot be negative.';
      } else if (Number(formData.rent) > salary) {
        errors.rent = 'Rent liability cannot exceed base salary.';
      }

      if (Number(formData.emiLoans) < 0) {
        errors.emiLoans = 'EMI obligations cannot be negative.';
      }

      if (Number(formData.fixedExpenses) < 0) {
        errors.fixedExpenses = 'Fixed expenses cannot be negative.';
      }

      if (Number(formData.monthlyBills) < 0) {
        errors.monthlyBills = 'Utility bills cannot be negative.';
      }

      const totalMonthlyExpenses = Number(formData.rent) + Number(formData.fixedExpenses) + Number(formData.monthlyBills) + Number(formData.emiLoans);
      if (totalMonthlyExpenses > salary) {
        errors.expensesTotal = 'Total combined monthly expenses cannot exceed base salary.';
      }
    }

    if (step === 3) {
      const salary = Number(formData.monthlySalary) || 0;
      
      if (Number(formData.currentSavings) < 0) {
        errors.currentSavings = 'Current savings cannot be negative.';
      } else if (Number(formData.currentSavings) > salary) {
        // As requested in section 6: "Savings: Cannot exceed salary"
        errors.currentSavings = 'Stored savings index cannot exceed monthly salary.';
      }
    }

    return errors;
  }
};
