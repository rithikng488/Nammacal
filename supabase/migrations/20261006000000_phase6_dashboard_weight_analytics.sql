-- =========================================================================
-- Migration: 20261006000000_phase6_dashboard_weight_analytics.sql
-- Description: Phase 6 - Weight Tracking, Target Customization, and Progress Analytics
-- =========================================================================

-- 1. Create weight_logs table for historical weight tracking
CREATE TABLE IF NOT EXISTS public.weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg >= 20.0 AND weight_kg <= 400.0),
    logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT weight_logs_user_date_unique UNIQUE (user_id, logged_at)
);

-- 2. Indexes for fast date-range queries
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_logged_at
    ON public.weight_logs(user_id, logged_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: Strict user isolation
CREATE POLICY "weight_logs_select_own"
    ON public.weight_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "weight_logs_insert_own"
    ON public.weight_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weight_logs_update_own"
    ON public.weight_logs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weight_logs_delete_own"
    ON public.weight_logs
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Extend profiles table with optional biometrics for target calculation if not present
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1) CHECK (height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 260)),
    ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
    ADD COLUMN IF NOT EXISTS birth_year INT CHECK (birth_year IS NULL OR (birth_year >= 1900 AND birth_year <= 2026)),
    ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IS NULL OR activity_level IN ('sedentary', 'light', 'moderate', 'very_active', 'extra_active')),
    ADD COLUMN IF NOT EXISTS goal TEXT CHECK (goal IS NULL OR goal IN ('lose_weight', 'maintain', 'gain_muscle'));
