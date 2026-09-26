-- ==============================================================================
-- NammaCal Phase 4 Migration: Recipe Calculator & Recipe Management
-- Extends recipes and recipe_ingredients with nutrition density, cooked yield,
-- historical ingredient snapshots, and connects recipes to meal_items
-- ==============================================================================

-- 1. Extend recipes table with cooked weight, nutrition density, and notes
ALTER TABLE public.recipes 
    ADD COLUMN IF NOT EXISTS final_cooked_weight_g NUMERIC(8,2) CHECK (final_cooked_weight_g > 0),
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS total_raw_weight_g NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS total_calories NUMERIC(8,1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_protein NUMERIC(7,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_carbs NUMERIC(7,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_fat NUMERIC(7,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_fiber NUMERIC(7,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_sugar NUMERIC(7,2),
    ADD COLUMN IF NOT EXISTS total_sodium_mg NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS calories_per_100g NUMERIC(7,1),
    ADD COLUMN IF NOT EXISTS protein_per_100g NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS carbs_per_100g NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS fat_per_100g NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS fiber_per_100g NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS sugar_per_100g NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS sodium_mg_per_100g NUMERIC(7,2),
    ADD COLUMN IF NOT EXISTS is_estimated_portion BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS data_provenance TEXT NOT NULL DEFAULT 'verified_database' CHECK (data_provenance IN (
        'verified_database',
        'user_entered',
        'estimated'
    ));

-- Ensure servings has positive check constraint
ALTER TABLE public.recipes
    DROP CONSTRAINT IF EXISTS recipes_servings_check;
ALTER TABLE public.recipes
    ADD CONSTRAINT recipes_servings_check CHECK (servings > 0);

-- 2. Extend recipe_ingredients table with historical nutrition snapshot & order
ALTER TABLE public.recipe_ingredients
    ALTER COLUMN food_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS food_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS food_state TEXT NOT NULL DEFAULT 'raw' CHECK (food_state IN ('raw', 'cooked', 'packaged')),
    ADD COLUMN IF NOT EXISTS ingredient_order INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS calories NUMERIC(7,1) NOT NULL DEFAULT 0 CHECK (calories >= 0),
    ADD COLUMN IF NOT EXISTS protein NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (protein >= 0),
    ADD COLUMN IF NOT EXISTS carbs NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (carbs >= 0),
    ADD COLUMN IF NOT EXISTS fat NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (fat >= 0),
    ADD COLUMN IF NOT EXISTS fiber NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (fiber >= 0),
    ADD COLUMN IF NOT EXISTS sugar NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS sodium_mg NUMERIC(7,2),
    ADD COLUMN IF NOT EXISTS is_estimated_portion BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS portion_assumption TEXT,
    ADD COLUMN IF NOT EXISTS data_provenance TEXT NOT NULL DEFAULT 'verified_database' CHECK (data_provenance IN (
        'verified_database',
        'user_entered',
        'estimated'
    )),
    ADD COLUMN IF NOT EXISTS source_reference TEXT;

-- 3. Connect recipes to meal_items with ON DELETE SET NULL to preserve historical logs
ALTER TABLE public.meal_items
    ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- 5. Strict User Isolation Policies for recipes
DROP POLICY IF EXISTS "recipes_select_authenticated" ON public.recipes;
DROP POLICY IF EXISTS "recipes_insert_authenticated" ON public.recipes;
DROP POLICY IF EXISTS "recipes_update_authenticated" ON public.recipes;
DROP POLICY IF EXISTS "recipes_delete_authenticated" ON public.recipes;
DROP POLICY IF EXISTS "recipes_select_own" ON public.recipes;
DROP POLICY IF EXISTS "recipes_insert_own" ON public.recipes;
DROP POLICY IF EXISTS "recipes_update_own" ON public.recipes;
DROP POLICY IF EXISTS "recipes_delete_own" ON public.recipes;

CREATE POLICY "recipes_select_own"
    ON public.recipes
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
    );

CREATE POLICY "recipes_insert_own"
    ON public.recipes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "recipes_update_own"
    ON public.recipes
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
    )
    WITH CHECK (
        user_id = auth.uid()
    );

CREATE POLICY "recipes_delete_own"
    ON public.recipes
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
    );

-- 6. Strict Policies for recipe_ingredients
DROP POLICY IF EXISTS "recipe_ingredients_policy" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_select_own" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_insert_own" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_update_own" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "recipe_ingredients_delete_own" ON public.recipe_ingredients;

CREATE POLICY "recipe_ingredients_select_own"
    ON public.recipe_ingredients
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "recipe_ingredients_insert_own"
    ON public.recipe_ingredients
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "recipe_ingredients_update_own"
    ON public.recipe_ingredients
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "recipe_ingredients_delete_own"
    ON public.recipe_ingredients
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.recipes
            WHERE recipes.id = recipe_ingredients.recipe_id
            AND recipes.user_id = auth.uid()
        )
    );

-- 7. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON public.recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_updated_at ON public.recipes(updated_at);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_items_recipe_id ON public.meal_items(recipe_id);
