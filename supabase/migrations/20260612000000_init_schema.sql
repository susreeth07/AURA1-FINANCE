-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked to auth.users)
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

-- 2. INCOMES TABLE
CREATE TABLE public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL DEFAULT 'Salary',
    date DATE NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. EXPENSES TABLE
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    frequency VARCHAR(50) CHECK (frequency IN ('weekly', 'monthly', 'yearly', NULL)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BUDGETS TABLE
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    limit_amount NUMERIC(12, 2) NOT NULL CHECK (limit_amount > 0),
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    alert_threshold INT NOT NULL DEFAULT 80 CHECK (alert_threshold BETWEEN 50 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, category)
);

-- 5. SAVINGS GOALS TABLE
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

-- 6. BILL REMINDERS TABLE
CREATE TABLE public.bill_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SYSTEM NOTIFICATIONS TABLE
CREATE TABLE public.system_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) CHECK (type IN ('budget', 'goal', 'bill', 'warning', 'ai')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. CHAT MESSAGES TABLE
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender VARCHAR(10) CHECK (sender IN ('user', 'ai')),
    text TEXT NOT NULL,
    insights JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Query Speed Optimization
CREATE INDEX idx_incomes_user_date ON public.incomes(user_id, date);
CREATE INDEX idx_expenses_user_date ON public.expenses(user_id, date);
CREATE INDEX idx_budgets_user ON public.budgets(user_id);
CREATE INDEX idx_savings_goals_user ON public.savings_goals(user_id);
CREATE INDEX idx_notifications_user_unread ON public.system_notifications(user_id) WHERE is_read = FALSE;

-- Automated Profile Creation Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, avatar_url, has_setup_profile)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New Participant'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'),
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ROW LEVEL SECURITY POLICIES

-- PROFILES
CREATE POLICY "Allow users to read their own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- INCOMES
CREATE POLICY "Allow users to read their own incomes" ON public.incomes
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own incomes" ON public.incomes
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own incomes" ON public.incomes
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own incomes" ON public.incomes
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- EXPENSES
CREATE POLICY "Allow users to read their own expenses" ON public.expenses
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own expenses" ON public.expenses
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own expenses" ON public.expenses
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own expenses" ON public.expenses
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BUDGETS
CREATE POLICY "Allow users to read their own budgets" ON public.budgets
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own budgets" ON public.budgets
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own budgets" ON public.budgets
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own budgets" ON public.budgets
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SAVINGS GOALS
CREATE POLICY "Allow users to read their own savings goals" ON public.savings_goals
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own savings goals" ON public.savings_goals
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own savings goals" ON public.savings_goals
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own savings goals" ON public.savings_goals
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- BILL REMINDERS
CREATE POLICY "Allow users to read their own bill reminders" ON public.bill_reminders
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own bill reminders" ON public.bill_reminders
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own bill reminders" ON public.bill_reminders
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own bill reminders" ON public.bill_reminders
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- SYSTEM NOTIFICATIONS
CREATE POLICY "Allow users to read their own system notifications" ON public.system_notifications
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own system notifications" ON public.system_notifications
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own system notifications" ON public.system_notifications
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CHAT MESSAGES
CREATE POLICY "Allow users to read their own chat messages" ON public.chat_messages
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own chat messages" ON public.chat_messages
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
