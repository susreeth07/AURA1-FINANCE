-- Migration: Fix User Deletion Audit Constraint Block
-- Path: supabase/migrations/20260620110000_fix_user_deletion_audit.sql

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    operation VARCHAR(10);
    rec_id UUID;
    tbl_name VARCHAR(100);
    payload_data JSONB;
    log_user_id UUID;
    user_exists BOOLEAN;
BEGIN
    tbl_name := TG_TABLE_NAME::text;
    IF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
        rec_id := NEW.id;
        payload_data := to_jsonb(NEW);
        log_user_id := NEW.user_id;
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        rec_id := NEW.id;
        payload_data := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
        log_user_id := NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        rec_id := OLD.id;
        payload_data := to_jsonb(OLD);
        log_user_id := OLD.user_id;
    END IF;

    -- Check if log_user_id exists in auth.users to prevent FK violation during cascade delete.
    -- During user deletion cascade, the auth.users record is removed before or during child table triggers,
    -- causing inserts referencing the deleted user to fail constraint checks.
    IF log_user_id IS NOT NULL THEN
        SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = log_user_id) INTO user_exists;
        IF NOT user_exists THEN
            log_user_id := NULL;
        END IF;
    ELSE
        log_user_id := auth.uid();
    END IF;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, payload)
    VALUES (
        log_user_id,
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
