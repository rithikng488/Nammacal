-- =========================================================================
-- Migration: 20261005000000_phase5_ai_logging.sql
-- Description: Phase 5 - AI Photo & Voice Logging, AI Provenance, and Usage Tracking
-- =========================================================================

-- 1. Extend data_provenance check constraint on meal_items to support AI provenance
ALTER TABLE public.meal_items DROP CONSTRAINT IF EXISTS meal_items_data_provenance_check;
ALTER TABLE public.meal_items ADD CONSTRAINT meal_items_data_provenance_check 
    CHECK (data_provenance IN (
        'verified_database',
        'user_entered',
        'estimated',
        'ai_photo_estimate',
        'ai_voice_parse'
    ));

-- 2. Create ai_usage_logs table for user quota tracking and cost control
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('photo_analysis', 'voice_transcription', 'food_parsing')),
    provider TEXT NOT NULL DEFAULT 'gemini',
    model TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for rate-limit window checks
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_action_time 
    ON public.ai_usage_logs(user_id, action_type, created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Authenticated users can view and log their own usage
CREATE POLICY "Users can view own AI usage logs"
    ON public.ai_usage_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage logs"
    ON public.ai_usage_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
