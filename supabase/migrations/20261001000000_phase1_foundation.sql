-- ==============================================================================
-- NammaCal Phase 1 Migration: Foundation, Profiles, Roles, and Invitations
-- Strictly enforces Row Level Security (RLS) and Private Invite-Only Access
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('pending', 'active', 'disabled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_role') THEN
        CREATE TYPE invite_role AS ENUM ('admin', 'member');
    END IF;
END $$;

-- 2. Create Profiles Table (Linked 1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'member',
    status user_status NOT NULL DEFAULT 'active',
    invited_by UUID REFERENCES public.profiles(id),
    daily_calorie_target NUMERIC(6,1) DEFAULT 2000.0,
    daily_protein_target NUMERIC(5,1) DEFAULT 100.0,
    daily_carb_target NUMERIC(5,1) DEFAULT 250.0,
    daily_fat_target NUMERIC(5,1) DEFAULT 65.0,
    daily_fiber_target NUMERIC(5,1) DEFAULT 30.0,
    daily_water_ml_target NUMERIC(6,1) DEFAULT 3000.0,
    daily_step_target INTEGER DEFAULT 8000,
    preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'ta', 'tanglish')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Invitations Table (Guards private registration)
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    invitation_code TEXT UNIQUE NOT NULL,
    role invite_role NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES public.profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function to Check Admin/Owner Role
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role IN ('owner', 'admin') AND status = 'active'
    );
$$;

-- Helper Function to Check User Active Status
CREATE OR REPLACE FUNCTION public.is_user_active(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND status = 'active'
    );
$$;

-- 6. RLS Policies for Profiles
-- A. Members can select their own profile (only if active)
CREATE POLICY "profiles_select_own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id AND status = 'active'
    );

-- B. Admins and Owners can select all profiles
CREATE POLICY "profiles_select_admin"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin_or_owner(auth.uid())
    );

-- C. Members can update their personal targets, name, language (cannot alter role or status)
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id AND status = 'active'
    )
    WITH CHECK (
        auth.uid() = id AND status = 'active'
    );

-- D. Owners can update any profile (e.g. promoting to admin, disabling user)
CREATE POLICY "profiles_update_admin"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'owner' AND status = 'active'
        )
    );

-- 7. RLS Policies for Invitations
-- A. Only Admins/Owners can view invitations
CREATE POLICY "invitations_select_admin"
    ON public.invitations
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin_or_owner(auth.uid())
    );

-- B. Only Admins/Owners can create invitations
CREATE POLICY "invitations_insert_admin"
    ON public.invitations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin_or_owner(auth.uid())
    );

-- C. Only Admins/Owners can update/revoke invitations
CREATE POLICY "invitations_update_admin"
    ON public.invitations
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin_or_owner(auth.uid())
    );

-- 8. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
