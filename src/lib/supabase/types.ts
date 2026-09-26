export type UserRole = 'owner' | 'admin' | 'member';
export type UserStatus = 'pending' | 'active' | 'disabled';
export type InviteRole = 'admin' | 'member';
export type PreferredLanguage = 'en' | 'ta' | 'tanglish';

export type FoodCategory =
  | 'rice_grains'
  | 'millets'
  | 'wheat_flours'
  | 'dals_pulses'
  | 'vegetables'
  | 'fruits'
  | 'dairy'
  | 'poultry_eggs'
  | 'meat_seafood'
  | 'snacks_tamil'
  | 'breakfast_south'
  | 'lunch_dinner_south'
  | 'sweets'
  | 'beverages'
  | 'oils_fats'
  | 'spices_condiments'
  | 'packaged_foods'
  | 'gym_diet'
  | 'other';

export type FoodState = 'raw' | 'cooked' | 'packaged';
export type DataProvenance = 'verified_database' | 'user_entered' | 'estimated';

export type StandardPortion = {
  unit: string; // e.g. "katori", "piece", "cup", "ladle", "plate", "glass"
  gram_weight: number; // e.g. 150 for katori cooked rice / sambar
  label_en: string; // e.g. "1 medium katori / bowl (150 g)"
  label_ta?: string; // e.g. "1 கிண்ணம் / கவளம்"
  is_estimate: boolean; // true for non-standard household measures
  notes?: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  invited_by: string | null;
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_carb_target: number;
  daily_fat_target: number;
  daily_fiber_target: number;
  daily_water_ml_target: number;
  daily_step_target: number;
  preferred_language: PreferredLanguage;
  created_at: string;
  updated_at: string;
};

export type Invitation = {
  id: string;
  email: string;
  invitation_code: string;
  role: InviteRole;
  invited_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type Food = {
  id: string;
  name_en: string;
  name_ta: string | null;
  name_tanglish: string | null;
  category: FoodCategory;
  state: FoodState;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sugar_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  serving_unit_default: string;
  serving_size_default: number;
  standard_portions: StandardPortion[];
  data_provenance: DataProvenance;
  source_reference: string;
  is_verified: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FoodAlias = {
  id: string;
  food_id: string;
  alias: string;
  language: 'en' | 'ta' | 'tanglish' | 'hindi' | 'regional';
  created_at: string;
};

export type Recipe = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  servings: number;
  total_weight_g: number | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  food_id: string;
  quantity: number;
  unit: string;
  gram_weight: number;
  notes: string | null;
  created_at: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          status?: UserStatus;
          invited_by?: string | null;
          daily_calorie_target?: number;
          daily_protein_target?: number;
          daily_carb_target?: number;
          daily_fat_target?: number;
          daily_fiber_target?: number;
          daily_water_ml_target?: number;
          daily_step_target?: number;
          preferred_language?: PreferredLanguage;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          status?: UserStatus;
          invited_by?: string | null;
          daily_calorie_target?: number;
          daily_protein_target?: number;
          daily_carb_target?: number;
          daily_fat_target?: number;
          daily_fiber_target?: number;
          daily_water_ml_target?: number;
          daily_step_target?: number;
          preferred_language?: PreferredLanguage;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: Invitation;
        Insert: {
          id?: string;
          email: string;
          invitation_code: string;
          role?: InviteRole;
          invited_by: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          invitation_code?: string;
          role?: InviteRole;
          invited_by?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      foods: {
        Row: Food;
        Insert: {
          id?: string;
          name_en: string;
          name_ta?: string | null;
          name_tanglish?: string | null;
          category: FoodCategory;
          state: FoodState;
          calories_per_100g: number;
          protein_per_100g: number;
          carbs_per_100g: number;
          fat_per_100g: number;
          fiber_per_100g?: number;
          sugar_per_100g?: number | null;
          sodium_mg_per_100g?: number | null;
          serving_unit_default?: string;
          serving_size_default?: number;
          standard_portions?: StandardPortion[];
          data_provenance?: DataProvenance;
          source_reference: string;
          is_verified?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_ta?: string | null;
          name_tanglish?: string | null;
          category?: FoodCategory;
          state?: FoodState;
          calories_per_100g?: number;
          protein_per_100g?: number;
          carbs_per_100g?: number;
          fat_per_100g?: number;
          fiber_per_100g?: number;
          sugar_per_100g?: number | null;
          sodium_mg_per_100g?: number | null;
          serving_unit_default?: string;
          serving_size_default?: number;
          standard_portions?: StandardPortion[];
          data_provenance?: DataProvenance;
          source_reference?: string;
          is_verified?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      food_aliases: {
        Row: FoodAlias;
        Insert: {
          id?: string;
          food_id: string;
          alias: string;
          language?: 'en' | 'ta' | 'tanglish' | 'hindi' | 'regional';
          created_at?: string;
        };
        Update: {
          id?: string;
          food_id?: string;
          alias?: string;
          language?: 'en' | 'ta' | 'tanglish' | 'hindi' | 'regional';
          created_at?: string;
        };
        Relationships: [];
      };
      recipes: {
        Row: Recipe;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          servings?: number;
          total_weight_g?: number | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          servings?: number;
          total_weight_g?: number | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: RecipeIngredient;
        Insert: {
          id?: string;
          recipe_id: string;
          food_id: string;
          quantity: number;
          unit: string;
          gram_weight: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          food_id?: string;
          quantity?: number;
          unit?: string;
          gram_weight?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      invite_role: InviteRole;
      food_category: FoodCategory;
      food_state: FoodState;
      data_provenance: DataProvenance;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
