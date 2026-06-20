-- Migration: Extend Notification Categories and Add Lifecycle Status
-- Path: supabase/migrations/20260620000000_extend_notification_types.sql

-- 1. Drop existing type check constraint
ALTER TABLE public.system_notifications DROP CONSTRAINT IF EXISTS system_notifications_type_check;

-- 2. Add the updated type check constraint
ALTER TABLE public.system_notifications ADD CONSTRAINT system_notifications_type_check 
  CHECK (type IN ('budget', 'goal', 'bill', 'warning', 'salary', 'summary', 'achievement', 'reminder', 'system', 'ai'));

-- 3. Add lifecycle status column with constraints
ALTER TABLE public.system_notifications ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'created'
  CHECK (status IN ('created', 'queued', 'delivered', 'displayed', 'read', 'archived', 'deleted'));

-- 4. Migrate existing data from is_read to status
UPDATE public.system_notifications SET status = 'read' WHERE is_read = TRUE;
UPDATE public.system_notifications SET status = 'delivered' WHERE is_read = FALSE;

-- 5. Create performance indexes for the new status column
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.system_notifications(user_id, status);
