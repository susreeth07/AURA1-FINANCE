-- ====================================================================
-- Aura Finance - Test Accounts Cleanup Script
-- File: supabase/cleanup_test_accounts.sql
-- ====================================================================
-- Purpose: Safely deletes all test users matching specific email patterns
--          along with their associated application data, avoiding trigger
--          and foreign key constraint violations.
-- ====================================================================

-- 1. Declare and capture target user IDs in a temporary table for isolation
CREATE TEMP TABLE target_users AS
SELECT id, email 
FROM auth.users 
WHERE email LIKE 'tester_%' 
   OR email LIKE 'signup-fresh-%' 
   OR email LIKE 'delete-test-%'
   OR email LIKE 'auth-audit-%';

-- 2. Delete from child tables in strict order of dependency.
-- Note: Incomes, expenses, and budgets trigger inserts into public.audit_logs.
-- Deleting them first is safe since their parent user still exists in auth.users.

DELETE FROM public.goal_transactions 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.savings_goals 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.incomes 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.expenses 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.budgets 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.bill_reminders 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.system_notifications 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.chat_messages 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.user_settings 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.profiles 
WHERE user_id IN (SELECT id FROM target_users);

DELETE FROM public.categories 
WHERE user_id IN (SELECT id FROM target_users);

-- 3. Purge all audit logs for these users (including newly created ones from delete triggers)
DELETE FROM public.audit_logs 
WHERE user_id IN (SELECT id FROM target_users);

-- 4. Delete the user records from auth.users (triggers profile deletion if any remain)
DELETE FROM auth.users 
WHERE id IN (SELECT id FROM target_users);

-- 5. Drop temp table
DROP TABLE target_users;
