-- ============================================================================
-- NammaCal Phase 9 — Admin Activity & Audit Center
-- Migration: 20261009000000_phase9_admin_audit.sql
-- ============================================================================

-- 1. ADMIN AUDIT EVENTS TABLE
-- Immutable append-only audit trail for application administration, security,
-- media uploads, AI events, and Health Connect sync events.
CREATE TABLE IF NOT EXISTS public.admin_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'security')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_hash TEXT,
    user_agent_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance and high-speed administrative filtering
CREATE INDEX IF NOT EXISTS idx_admin_audit_events_created 
    ON public.admin_audit_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_events_user 
    ON public.admin_audit_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_events_event_type 
    ON public.admin_audit_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_events_severity 
    ON public.admin_audit_events(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_events_entity 
    ON public.admin_audit_events(entity_type, entity_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_audit_events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Only administrators and owners can read audit records
CREATE POLICY "admin_audit_events_select_admin"
    ON public.admin_audit_events FOR SELECT
    USING (public.is_admin_or_owner(auth.uid()));

-- Policy 2: Authenticated users can insert their own audit entries
CREATE POLICY "admin_audit_events_insert_authenticated"
    ON public.admin_audit_events FOR INSERT
    WITH CHECK (
        auth.uid() = actor_user_id OR
        actor_user_id IS NULL OR
        public.is_admin_or_owner(auth.uid())
    );

-- Note: No UPDATE or DELETE policies are granted.
-- Audit events are strictly append-only and immutable.
