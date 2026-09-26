-- ==============================================================================
-- NammaCal Phase 3 Migration: Manual Food Logging & Meal Timeline
-- Introduces meal_logs and meal_items with strict Row Level Security (RLS),
-- historical nutrition snapshots, foreign key cascades, and check constraints
-- ==============================================================================

-- 1. Create meal_logs table (Container for Breakfast, Lunch, Dinner, Snack per date)
CREATE TABLE IF NOT EXISTS public.meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
    meal_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_meal_per_date UNIQUE (user_id, log_date, meal_type)
);

-- 2. Create meal_items table (Individual food items logged in a meal)
CREATE TABLE IF NOT EXISTS public.meal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_log_id UUID NOT NULL REFERENCES public.meal_logs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    food_id UUID REFERENCES public.foods(id) ON DELETE SET NULL,
    food_name TEXT NOT NULL,
    food_state TEXT NOT NULL CHECK (food_state IN ('raw', 'cooked', 'packaged')),
    quantity NUMERIC(7,2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    gram_weight NUMERIC(7,2) NOT NULL CHECK (gram_weight > 0),
    calories NUMERIC(7,1) NOT NULL CHECK (calories >= 0),
    protein NUMERIC(6,2) NOT NULL CHECK (protein >= 0),
    carbs NUMERIC(6,2) NOT NULL CHECK (carbs >= 0),
    fat NUMERIC(6,2) NOT NULL CHECK (fat >= 0),
    fiber NUMERIC(6,2) NOT NULL DEFAULT 0.0 CHECK (fiber >= 0),
    sugar NUMERIC(6,2),
    sodium_mg NUMERIC(7,2),
    is_estimated_portion BOOLEAN NOT NULL DEFAULT false,
    portion_assumption TEXT,
    data_provenance TEXT NOT NULL DEFAULT 'verified_database' CHECK (data_provenance IN (
        'verified_database',
        'user_entered',
        'estimated'
    )),
    source_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for meal_logs
-- A. Members can only select their own meals
CREATE POLICY "meal_logs_select_own"
    ON public.meal_logs
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- B. Members can only insert their own meals
CREATE POLICY "meal_logs_insert_own"
    ON public.meal_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );

-- C. Members can only update their own meals
CREATE POLICY "meal_logs_update_own"
    ON public.meal_logs
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- D. Members can only delete their own meals
CREATE POLICY "meal_logs_delete_own"
    ON public.meal_logs
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- 5. RLS Policies for meal_items
-- A. Members can only select their own meal items
CREATE POLICY "meal_items_select_own"
    ON public.meal_items
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- B. Members can only insert items into their own meals
CREATE POLICY "meal_items_insert_own"
    ON public.meal_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.meal_logs
            WHERE meal_logs.id = meal_items.meal_log_id
            AND meal_logs.user_id = auth.uid()
        )
    );

-- C. Members can only update their own meal items
CREATE POLICY "meal_items_update_own"
    ON public.meal_items
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

-- D. Members can only delete their own meal items
CREATE POLICY "meal_items_delete_own"
    ON public.meal_items
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- 6. High-Performance Indexes for Rapid Day & Timeline Lookups
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON public.meal_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_meal_items_meal_log_id ON public.meal_items(meal_log_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_user_id ON public.meal_items(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_created_at ON public.meal_items(created_at);
