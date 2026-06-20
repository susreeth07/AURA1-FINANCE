-- Migration: Fix Profiles RLS Policy
-- Path: supabase/migrations/20260620120000_fix_profiles_rls.sql

-- Enable INSERT policy for authenticated users on public.profiles
CREATE POLICY "Allow insert own profile details" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
