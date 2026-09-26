-- ==============================================================================
-- NammaCal Phase 2 Migration: Indian/Tamil Food Database & Nutrition System
-- Incorporates IFCT 2017 (ICMR-NIN) Verified Dataset, Raw vs Cooked Distinction,
-- Household Portion Conversions, Trigram Search Indexes, and RLS Protections
-- ==============================================================================

-- 1. Enable pg_trgm extension for fuzzy and typo-tolerant search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create Food Category & State Enums if needed, or enforce via Check Constraints
CREATE TABLE IF NOT EXISTS public.foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_ta TEXT,                           -- Tamil Script (e.g. புழுங்கல் அரிசி, இட்லி)
    name_tanglish TEXT,                     -- Phonetic Tamil (e.g. Puzhungal Arisi, Idli)
    category TEXT NOT NULL CHECK (category IN (
        'rice_grains',
        'millets',
        'wheat_flours',
        'dals_pulses',
        'vegetables',
        'fruits',
        'dairy',
        'poultry_eggs',
        'meat_seafood',
        'snacks_tamil',
        'breakfast_south',
        'lunch_dinner_south',
        'sweets',
        'beverages',
        'oils_fats',
        'spices_condiments',
        'packaged_foods',
        'gym_diet',
        'other'
    )),
    state TEXT NOT NULL CHECK (state IN ('raw', 'cooked', 'packaged')),
    calories_per_100g NUMERIC(6,2) NOT NULL,
    protein_per_100g NUMERIC(6,2) NOT NULL,
    carbs_per_100g NUMERIC(6,2) NOT NULL,
    fat_per_100g NUMERIC(6,2) NOT NULL,
    fiber_per_100g NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    sugar_per_100g NUMERIC(6,2),
    sodium_mg_per_100g NUMERIC(7,2),
    serving_unit_default TEXT NOT NULL DEFAULT 'g',
    serving_size_default NUMERIC(6,2) NOT NULL DEFAULT 100.0,
    -- JSONB standard portions for household units (katori, idli, cup, piece, ladle, etc.)
    standard_portions JSONB NOT NULL DEFAULT '[]'::jsonb,
    data_provenance TEXT NOT NULL DEFAULT 'verified_database' CHECK (data_provenance IN (
        'verified_database',
        'user_entered',
        'estimated'
    )),
    source_reference TEXT NOT NULL,         -- e.g. "IFCT 2017: ICMR-NIN (Code: A.1)" or "USDA FoodData Central"
    is_verified BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Food Aliases Table
CREATE TABLE IF NOT EXISTS public.food_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'tanglish' CHECK (language IN ('en', 'ta', 'tanglish', 'hindi', 'regional')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Recipes & Recipe Ingredients Tables (Foundation for Phase 4)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    servings NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    total_weight_g NUMERIC(8,2),
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE RESTRICT,
    quantity NUMERIC(7,2) NOT NULL,
    unit TEXT NOT NULL,
    gram_weight NUMERIC(7,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for Foods
-- A. Any authenticated user can read verified foods OR foods they created themselves
CREATE POLICY "foods_select_authenticated"
    ON public.foods
    FOR SELECT
    TO authenticated
    USING (
        is_verified = true OR created_by = auth.uid()
    );

-- B. Members can insert their own unverified custom foods; Admins/Owners can insert verified foods
CREATE POLICY "foods_insert_authenticated"
    ON public.foods
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (is_verified = false AND created_by = auth.uid()) OR
        (public.is_admin_or_owner(auth.uid()))
    );

-- C. Members can only update their own unverified foods; Admins/Owners can update any food
CREATE POLICY "foods_update_authenticated"
    ON public.foods
    FOR UPDATE
    TO authenticated
    USING (
        (is_verified = false AND created_by = auth.uid()) OR
        (public.is_admin_or_owner(auth.uid()))
    )
    WITH CHECK (
        (is_verified = false AND created_by = auth.uid()) OR
        (public.is_admin_or_owner(auth.uid()))
    );

-- D. Members can only delete their own unverified foods; Admins/Owners can delete verified foods
CREATE POLICY "foods_delete_authenticated"
    ON public.foods
    FOR DELETE
    TO authenticated
    USING (
        (is_verified = false AND created_by = auth.uid()) OR
        (public.is_admin_or_owner(auth.uid()))
    );

-- 7. RLS Policies for Food Aliases
CREATE POLICY "food_aliases_select_authenticated"
    ON public.food_aliases
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.foods
            WHERE foods.id = food_aliases.food_id
            AND (foods.is_verified = true OR foods.created_by = auth.uid())
        )
    );

CREATE POLICY "food_aliases_admin_manage"
    ON public.food_aliases
    FOR ALL
    TO authenticated
    USING (
        public.is_admin_or_owner(auth.uid())
    );

-- 8. RLS Policies for Recipes and Ingredients
CREATE POLICY "recipes_select_authenticated"
    ON public.recipes
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR is_public = true
    );

CREATE POLICY "recipes_insert_authenticated"
    ON public.recipes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "recipes_update_authenticated"
    ON public.recipes
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
    );

CREATE POLICY "recipes_delete_authenticated"
    ON public.recipes
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
    );

CREATE POLICY "recipe_ingredients_policy"
    ON public.recipe_ingredients
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- 9. Performance & Trigram Search Indexes
CREATE INDEX IF NOT EXISTS idx_foods_category ON public.foods(category);
CREATE INDEX IF NOT EXISTS idx_foods_state ON public.foods(state);
CREATE INDEX IF NOT EXISTS idx_foods_created_by ON public.foods(created_by);
CREATE INDEX IF NOT EXISTS idx_food_aliases_food_id ON public.food_aliases(food_id);

-- Trigram Indexes for Instant Fuzzy Search in English, Tamil, and Tanglish
CREATE INDEX IF NOT EXISTS idx_foods_name_en_trgm ON public.foods USING gin (name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_foods_name_ta_trgm ON public.foods USING gin (name_ta gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_foods_name_tanglish_trgm ON public.foods USING gin (name_tanglish gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_food_aliases_alias_trgm ON public.food_aliases USING gin (alias gin_trgm_ops);
