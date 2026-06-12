-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CATEGORIES TABLE (Normalized Categories System)
-- ==========================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL indicates system default
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('inflow', 'outflow')),
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_category UNIQUE (user_id, name, type)
);

-- ==========================================
-- 2. PROFILES TABLE (Linked to auth.users)
-- ==========================================
CREATE TABLE public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    monthly_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_salary >= 0),
    additional_income NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (additional_income >= 0),
    current_savings NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_savings >= 0),
    rent NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (rent >= 0),
    fixed_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (fixed_expenses >= 0),
    monthly_bills NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_bills >= 0),
    emi_loans NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (emi_loans >= 0),
    savings_goal_percentage INT NOT NULL DEFAULT 20 CHECK (savings_goal_percentage BETWEEN 0 AND 100),
    has_setup_profile BOOLEAN NOT NULL DEFAULT FALSE,
    salary_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. USER SETTINGS TABLE (App Customizations)
-- ==========================================
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme VARCHAR(10) NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
    strict_lock BOOLEAN NOT NULL DEFAULT TRUE,
    sound_effects BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. INCOMES TABLE (Revenue Inflows)
-- ==========================================
CREATE TABLE public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 5. EXPENSES TABLE (Outward Debits)
-- ==========================================
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    frequency VARCHAR(50) CHECK (frequency IN ('weekly', 'monthly', 'yearly', NULL)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. BUDGETS TABLE (Category Caps)
-- ==========================================
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    limit_amount NUMERIC(12, 2) NOT NULL CHECK (limit_amount > 0),
    alert_threshold INT NOT NULL DEFAULT 80 CHECK (alert_threshold BETWEEN 50 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, category_id)
);

-- ==========================================
-- 7. SAVINGS GOALS TABLE (Milestones)
-- ==========================================
CREATE TABLE public.savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
    category VARCHAR(50) CHECK (category IN ('laptop', 'bike', 'car', 'house', 'emergency', 'vacation')),
    target_date DATE NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'LAPTOP',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_current_amount CHECK (current_amount <= target_amount)
);

-- ==========================================
-- 8. SAVINGS GOALS TRANSACTIONS TABLE (Funding Audit)
-- ==========================================
CREATE TABLE public.goal_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 9. BILL REMINDERS TABLE (Scheduled Invoices)
-- ==========================================
CREATE TABLE public.bill_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 10. SYSTEM NOTIFICATIONS TABLE (Alert flags)
-- ==========================================
CREATE TABLE public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('budget', 'goal', 'bill', 'warning', 'ai')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 11. CHAT MESSAGES TABLE (AI Logs)
-- ==========================================
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender VARCHAR(10) CHECK (sender IN ('user', 'ai')),
    text TEXT NOT NULL,
    insights JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 12. AUDIT LOGS TABLE (Compliance & Analytics - Immutable)
-- ==========================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INITIAL DEFAULT CATEGORIES SEED
-- ==========================================
INSERT INTO public.categories (name, type, color, icon) VALUES
-- Inflow System Defaults
('Salary', 'inflow', '#10b981', 'DollarSign'),
('Freelance', 'inflow', '#818cf8', 'Briefcase'),
('Investments', 'inflow', '#3b82f6', 'TrendingUp'),
('Gifts', 'inflow', '#a855f7', 'Gift'),
('Other', 'inflow', '#6b7280', 'CircleHelp'),
-- Outflow System Defaults
('Housing', 'outflow', '#6366f1', 'Home'),
('Groceries', 'outflow', '#10b981', 'ShoppingBag'),
('Dining Out', 'outflow', '#f59e0b', 'Utensils'),
('Car/Transport', 'outflow', '#3b82f6', 'Car'),
('Entertainment', 'outflow', '#ec4899', 'Tv'),
('Utilities', 'outflow', '#06b6d4', 'Zap'),
('Health', 'outflow', '#14b8a6', 'HeartPulse'),
('Other', 'outflow', '#6b7280', 'CircleHelp');

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX idx_incomes_composite ON public.incomes(user_id, date, category_id);
CREATE INDEX idx_expenses_composite ON public.expenses(user_id, date, category_id);
CREATE INDEX idx_budgets_user_cat ON public.budgets(user_id, category_id);
CREATE INDEX idx_savings_goals_user ON public.savings_goals(user_id);
CREATE INDEX idx_bill_reminders_due ON public.bill_reminders(user_id, due_date) WHERE is_paid = FALSE;
CREATE INDEX idx_notifications_unread ON public.system_notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_audit_user_action ON public.audit_logs(user_id, action);

-- Hardening indexes
CREATE INDEX idx_bill_reminders_category ON public.bill_reminders(category_id);
CREATE INDEX idx_chat_messages_user_created ON public.chat_messages(user_id, created_at DESC);
CREATE INDEX idx_goal_tx_user_goal ON public.goal_transactions(user_id, goal_id);

-- ==========================================
-- TRIGGERS & PROCEDURES
-- ==========================================

-- 1. Automated Profile & Settings Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Profile Row
  INSERT INTO public.profiles (user_id, name, email, avatar_url, has_setup_profile)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New Participant'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
    FALSE
  );

  -- Create Settings Row
  INSERT INTO public.user_settings (user_id, theme, strict_lock, sound_effects)
  VALUES (
    new.id,
    'dark',
    TRUE,
    FALSE
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Automated Audit Logger Trigger
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    operation VARCHAR(10);
    rec_id UUID;
    tbl_name VARCHAR(100);
    payload_data JSONB;
BEGIN
    tbl_name := TG_TABLE_NAME::text;
    IF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
        rec_id := NEW.id;
        payload_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        rec_id := NEW.id;
        payload_data := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        rec_id := OLD.id;
        payload_data := to_jsonb(OLD);
    END IF;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
    VALUES (
        COALESCE(
            CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.user_id 
                ELSE NEW.user_id 
            END, 
            auth.uid()
        ),
        operation || '_' || UPPER(tbl_name),
        tbl_name,
        rec_id,
        payload_data
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Log Triggers to Core Transaction Tables
CREATE TRIGGER audit_incomes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.incomes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_budgets_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. CATEGORIES POLICIES
CREATE POLICY "Allow public select of system defaults OR own custom categories" ON public.categories
    FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Allow users to insert custom categories" ON public.categories
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete own custom categories" ON public.categories
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. PROFILES POLICIES
CREATE POLICY "Allow select own profile details" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow update own profile details" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. USER SETTINGS POLICIES
CREATE POLICY "Allow select own settings" ON public.user_settings
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow update own settings" ON public.user_settings
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. INCOMES POLICIES
CREATE POLICY "Allow select own incomes" ON public.incomes
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own incomes" ON public.incomes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own incomes" ON public.incomes
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete own incomes" ON public.incomes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. EXPENSES POLICIES
CREATE POLICY "Allow select own expenses" ON public.expenses
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own expenses" ON public.expenses
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own expenses" ON public.expenses
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete own expenses" ON public.expenses
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. BUDGETS POLICIES
CREATE POLICY "Allow select own budgets" ON public.budgets
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own budgets" ON public.budgets
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own budgets" ON public.budgets
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete own budgets" ON public.budgets
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. SAVINGS GOALS POLICIES
CREATE POLICY "Allow select own goals" ON public.savings_goals
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own goals" ON public.savings_goals
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own goals" ON public.savings_goals
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete own goals" ON public.savings_goals
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. GOAL TRANSACTIONS POLICIES
CREATE POLICY "Allow select own goal transactions" ON public.goal_transactions
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own goal transactions" ON public.goal_transactions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 9. BILL REMINDERS POLICIES
CREATE POLICY "Allow select own reminders" ON public.bill_reminders
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own reminders" ON public.bill_reminders
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow update own reminders" ON public.bill_reminders
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete own reminders" ON public.bill_reminders
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 10. SYSTEM NOTIFICATIONS POLICIES
CREATE POLICY "Allow select own notifications" ON public.system_notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow update own notifications" ON public.system_notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow delete own notifications" ON public.system_notifications
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 11. CHAT MESSAGES POLICIES
CREATE POLICY "Allow select own chats" ON public.chat_messages
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow insert own chats" ON public.chat_messages
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 12. AUDIT LOGS POLICIES (Read-Only to Tenant, Manual Write Blocked)
CREATE POLICY "Allow select own audit logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
