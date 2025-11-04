-- Fix Supabase search_path security warning
-- Run this SQL in Supabase SQL Editor

-- Fix the update_updated_at_column function to have a fixed search_path
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Verify the function is now secure
SELECT 
    proname as function_name,
    prosrc as function_source,
    proconfig as config_settings
FROM pg_proc 
WHERE proname = 'update_updated_at_column';

-- If you want to see all functions with mutable search_path issues:
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    CASE 
        WHEN p.proconfig IS NULL THEN 'MUTABLE (needs fixing)'
        WHEN 'search_path' = ANY(p.proconfig) THEN 'FIXED'
        ELSE 'MUTABLE (needs fixing)'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prokind = 'f'; -- functions only