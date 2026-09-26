-- ============================================================================
-- NammaCal Phase 7 — Activity, Water & Habit Tracking Foundation
-- Migration: 20261007000000_phase7_activity_water_habits.sql
-- ============================================================================

-- 1. ACTIVITY LOGS TABLE
-- Stores individual workout/activity sessions with deterministic calorie estimates.
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (
        activity_type IN (
            'walking',
            'running',
            'cycling',
            'strength_training',
            'gym_workout',
            'swimming',
            'yoga',
            'sports',
            'other'
        )
    ),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
    distance_km NUMERIC(6, 2) CHECK (distance_km IS NULL OR distance_km >= 0),
    steps INTEGER CHECK (steps IS NULL OR steps >= 0),
    intensity TEXT NOT NULL DEFAULT 'moderate' CHECK (intensity IN ('light', 'moderate', 'vigorous')),
    calories_burned NUMERIC(6, 1) CHECK (calories_burned IS NULL OR calories_burned >= 0),
    calorie_provenance TEXT CHECK (
        calorie_provenance IS NULL OR 
        calorie_provenance IN ('calculated_activity_estimate', 'device_reported')
    ),
    logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (
        source IN ('manual', 'health_connect', 'device', 'import')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs(user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON public.activity_logs(user_id, created_at DESC);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_select_own"
    ON public.activity_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "activity_logs_insert_own"
    ON public.activity_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_logs_update_own"
    ON public.activity_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_logs_delete_own"
    ON public.activity_logs FOR DELETE
    USING (auth.uid() = user_id);


-- 2. DAILY ACTIVITY SUMMARY TABLE
-- Canonical daily step totals and activity summaries by source per day.
-- Prevents duplicate daily step records for the same source.
CREATE TABLE IF NOT EXISTS public.daily_activity_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0),
    step_source TEXT NOT NULL DEFAULT 'manual' CHECK (
        step_source IN ('manual', 'health_connect', 'device')
    ),
    active_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (active_duration_minutes >= 0),
    estimated_calories_burned NUMERIC(6, 1) NOT NULL DEFAULT 0 CHECK (estimated_calories_burned >= 0),
    device_calories_burned NUMERIC(6, 1) NOT NULL DEFAULT 0 CHECK (device_calories_burned >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_date_step_source UNIQUE (user_id, log_date, step_source)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_summary_user_date 
    ON public.daily_activity_summary(user_id, log_date DESC);

ALTER TABLE public.daily_activity_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_activity_summary_select_own"
    ON public.daily_activity_summary FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "daily_activity_summary_insert_own"
    ON public.daily_activity_summary FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_activity_summary_update_own"
    ON public.daily_activity_summary FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_activity_summary_delete_own"
    ON public.daily_activity_summary FOR DELETE
    USING (auth.uid() = user_id);


-- 3. WATER LOGS TABLE
-- Tracks water intake events in milliliters.
CREATE TABLE IF NOT EXISTS public.water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 10000),
    logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON public.water_logs(user_id, logged_at DESC);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "water_logs_select_own"
    ON public.water_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "water_logs_insert_own"
    ON public.water_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "water_logs_update_own"
    ON public.water_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "water_logs_delete_own"
    ON public.water_logs FOR DELETE
    USING (auth.uid() = user_id);


-- 4. HABITS TABLE
-- User-defined daily habits.
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_active ON public.habits(user_id, active);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habits_select_own"
    ON public.habits FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "habits_insert_own"
    ON public.habits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habits_update_own"
    ON public.habits FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habits_delete_own"
    ON public.habits FOR DELETE
    USING (auth.uid() = user_id);


-- 5. HABIT LOGS TABLE
-- Tracks daily completion of habits.
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed BOOLEAN NOT NULL DEFAULT true,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_habit_user_date UNIQUE (habit_id, logged_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON public.habit_logs(habit_id);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "habit_logs_select_own"
    ON public.habit_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "habit_logs_insert_own"
    ON public.habit_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habit_logs_update_own"
    ON public.habit_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "habit_logs_delete_own"
    ON public.habit_logs FOR DELETE
    USING (auth.uid() = user_id);
