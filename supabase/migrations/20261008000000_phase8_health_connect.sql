-- ============================================================================
-- NammaCal Phase 8 — Android & Health Connect Integration
-- Migration: 20261008000000_phase8_health_connect.sql
-- ============================================================================

-- 1. HEALTH INTEGRATIONS TABLE
-- Tracks provider connection state, sync tokens/timestamps, and user preferences.
CREATE TABLE IF NOT EXISTS public.health_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('health_connect')),
    enabled BOOLEAN NOT NULL DEFAULT true,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_sync_at TIMESTAMPTZ,
    last_successful_sync_at TIMESTAMPTZ,
    last_error TEXT,
    sync_cursor TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_health_integrations_user 
    ON public.health_integrations(user_id);

-- Enable RLS on health_integrations
ALTER TABLE public.health_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_integrations_select_own"
    ON public.health_integrations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "health_integrations_insert_own"
    ON public.health_integrations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "health_integrations_update_own"
    ON public.health_integrations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "health_integrations_delete_own"
    ON public.health_integrations FOR DELETE
    USING (auth.uid() = user_id);


-- 2. ACTIVITY EXTERNAL RECORDS TABLE
-- Links external provider records to NammaCal internal logs for deduplication and idempotency.
CREATE TABLE IF NOT EXISTS public.activity_external_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('health_connect')),
    external_record_id TEXT NOT NULL,
    external_record_type TEXT NOT NULL CHECK (
        external_record_type IN ('steps', 'exercise_session', 'calories')
    ),
    activity_log_id UUID REFERENCES public.activity_logs(id) ON DELETE SET NULL,
    source_data_origin TEXT, -- Package name or app source (e.g., com.google.android.apps.fitness)
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_provider_ext_record UNIQUE (user_id, provider, external_record_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_external_records_user 
    ON public.activity_external_records(user_id);

CREATE INDEX IF NOT EXISTS idx_activity_external_records_lookup 
    ON public.activity_external_records(user_id, provider, external_record_id);

-- Enable RLS on activity_external_records
ALTER TABLE public.activity_external_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_external_records_select_own"
    ON public.activity_external_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "activity_external_records_insert_own"
    ON public.activity_external_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_external_records_update_own"
    ON public.activity_external_records FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "activity_external_records_delete_own"
    ON public.activity_external_records FOR DELETE
    USING (auth.uid() = user_id);
