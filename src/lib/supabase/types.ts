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
export type DataProvenance =
  | 'verified_database'
  | 'user_entered'
  | 'estimated'
  | 'ai_photo_estimate'
  | 'ai_voice_parse';

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
  height_cm?: number | null;
  gender?: 'male' | 'female' | 'other' | null;
  birth_year?: number | null;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active' | null;
  goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | null;
  created_at: string;
  updated_at: string;
};

export type WeightLog = {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'strength_training'
  | 'gym_workout'
  | 'swimming'
  | 'yoga'
  | 'sports'
  | 'other';

export type ActivityIntensity = 'light' | 'moderate' | 'vigorous';

export type ActivitySource = 'manual' | 'health_connect' | 'device' | 'import';

export type CalorieProvenance = 'calculated_activity_estimate' | 'device_reported';

export type ActivityLog = {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  duration_minutes: number;
  distance_km: number | null;
  steps: number | null;
  intensity: ActivityIntensity;
  calories_burned: number | null;
  calorie_provenance: CalorieProvenance | null;
  logged_at: string;
  note: string | null;
  source: ActivitySource;
  created_at: string;
  updated_at: string;
};

export type StepSource = 'manual' | 'health_connect' | 'device';

export type DailyActivitySummary = {
  id: string;
  user_id: string;
  log_date: string;
  steps: number;
  step_source: StepSource;
  active_duration_minutes: number;
  estimated_calories_burned: number;
  device_calories_burned: number;
  created_at: string;
  updated_at: string;
};

export type WaterLog = {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  created_at: string;
  updated_at: string;
};

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  logged_date: string;
  completed: boolean;
  note: string | null;
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
  final_cooked_weight_g: number | null;
  total_weight_g?: number | null;
  notes: string | null;
  total_raw_weight_g: number | null;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  total_sugar: number | null;
  total_sodium_mg: number | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_mg_per_100g: number | null;
  is_estimated_portion: boolean;
  data_provenance: DataProvenance;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  food_id: string | null;
  food_name: string;
  food_state: FoodState;
  quantity: number;
  unit: string;
  gram_weight: number;
  ingredient_order: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number | null;
  sodium_mg: number | null;
  is_estimated_portion: boolean;
  portion_assumption: string | null;
  data_provenance: DataProvenance;
  source_reference: string | null;
  notes: string | null;
  created_at: string;
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export type MealLog = {
  id: string;
  user_id: string;
  log_date: string;
  meal_type: MealType;
  meal_name: string | null;
  created_at: string;
  updated_at: string;
};

export type MealItem = {
  id: string;
  meal_log_id: string;
  user_id: string;
  food_id: string | null;
  recipe_id?: string | null;
  food_name: string;
  food_state: FoodState;
  quantity: number;
  unit: string;
  gram_weight: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number | null;
  sodium_mg: number | null;
  is_estimated_portion: boolean;
  portion_assumption: string | null;
  data_provenance: DataProvenance;
  source_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type AIActionType = 'photo_analysis' | 'voice_transcription' | 'food_parsing';

export type AIUsageLog = {
  id: string;
  user_id: string;
  action_type: AIActionType;
  provider: string;
  model: string;
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
          height_cm?: number | null;
          gender?: 'male' | 'female' | 'other' | null;
          birth_year?: number | null;
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active' | null;
          goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | null;
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
          height_cm?: number | null;
          gender?: 'male' | 'female' | 'other' | null;
          birth_year?: number | null;
          activity_level?: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active' | null;
          goal?: 'lose_weight' | 'maintain' | 'gain_muscle' | null;
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
          final_cooked_weight_g?: number | null;
          total_weight_g?: number | null;
          notes?: string | null;
          total_raw_weight_g?: number | null;
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          total_fiber?: number;
          total_sugar?: number | null;
          total_sodium_mg?: number | null;
          calories_per_100g?: number | null;
          protein_per_100g?: number | null;
          carbs_per_100g?: number | null;
          fat_per_100g?: number | null;
          fiber_per_100g?: number | null;
          sugar_per_100g?: number | null;
          sodium_mg_per_100g?: number | null;
          is_estimated_portion?: boolean;
          data_provenance?: DataProvenance;
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
          final_cooked_weight_g?: number | null;
          total_weight_g?: number | null;
          notes?: string | null;
          total_raw_weight_g?: number | null;
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          total_fiber?: number;
          total_sugar?: number | null;
          total_sodium_mg?: number | null;
          calories_per_100g?: number | null;
          protein_per_100g?: number | null;
          carbs_per_100g?: number | null;
          fat_per_100g?: number | null;
          fiber_per_100g?: number | null;
          sugar_per_100g?: number | null;
          sodium_mg_per_100g?: number | null;
          is_estimated_portion?: boolean;
          data_provenance?: DataProvenance;
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
          food_id?: string | null;
          food_name: string;
          food_state?: FoodState;
          quantity: number;
          unit: string;
          gram_weight: number;
          ingredient_order?: number;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          fiber?: number;
          sugar?: number | null;
          sodium_mg?: number | null;
          is_estimated_portion?: boolean;
          portion_assumption?: string | null;
          data_provenance?: DataProvenance;
          source_reference?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          food_id?: string | null;
          food_name?: string;
          food_state?: FoodState;
          quantity?: number;
          unit?: string;
          gram_weight?: number;
          ingredient_order?: number;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          fiber?: number;
          sugar?: number | null;
          sodium_mg?: number | null;
          is_estimated_portion?: boolean;
          portion_assumption?: string | null;
          data_provenance?: DataProvenance;
          source_reference?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      meal_logs: {
        Row: MealLog;
        Insert: {
          id?: string;
          user_id: string;
          log_date: string;
          meal_type: MealType;
          meal_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_date?: string;
          meal_type?: MealType;
          meal_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meal_items: {
        Row: MealItem;
        Insert: {
          id?: string;
          meal_log_id: string;
          user_id: string;
          food_id?: string | null;
          recipe_id?: string | null;
          food_name: string;
          food_state: FoodState;
          quantity: number;
          unit: string;
          gram_weight: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber?: number;
          sugar?: number | null;
          sodium_mg?: number | null;
          is_estimated_portion?: boolean;
          portion_assumption?: string | null;
          data_provenance?: DataProvenance;
          source_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meal_log_id?: string;
          user_id?: string;
          food_id?: string | null;
          recipe_id?: string | null;
          food_name?: string;
          food_state?: FoodState;
          quantity?: number;
          unit?: string;
          gram_weight?: number;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          fiber?: number;
          sugar?: number | null;
          sodium_mg?: number | null;
          is_estimated_portion?: boolean;
          portion_assumption?: string | null;
          data_provenance?: DataProvenance;
          source_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage_logs: {
        Row: AIUsageLog;
        Insert: {
          id?: string;
          user_id: string;
          action_type: AIActionType;
          provider?: string;
          model?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: AIActionType;
          provider?: string;
          model?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      weight_logs: {
        Row: WeightLog;
        Insert: {
          id?: string;
          user_id: string;
          weight_kg: number;
          logged_at?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          weight_kg?: number;
          logged_at?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: {
          id?: string;
          user_id: string;
          activity_type: ActivityType;
          duration_minutes: number;
          distance_km?: number | null;
          steps?: number | null;
          intensity?: ActivityIntensity;
          calories_burned?: number | null;
          calorie_provenance?: CalorieProvenance | null;
          logged_at?: string;
          note?: string | null;
          source?: ActivitySource;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: ActivityType;
          duration_minutes?: number;
          distance_km?: number | null;
          steps?: number | null;
          intensity?: ActivityIntensity;
          calories_burned?: number | null;
          calorie_provenance?: CalorieProvenance | null;
          logged_at?: string;
          note?: string | null;
          source?: ActivitySource;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_activity_summary: {
        Row: DailyActivitySummary;
        Insert: {
          id?: string;
          user_id: string;
          log_date?: string;
          steps?: number;
          step_source?: StepSource;
          active_duration_minutes?: number;
          estimated_calories_burned?: number;
          device_calories_burned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          log_date?: string;
          steps?: number;
          step_source?: StepSource;
          active_duration_minutes?: number;
          estimated_calories_burned?: number;
          device_calories_burned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      water_logs: {
        Row: WaterLog;
        Insert: {
          id?: string;
          user_id: string;
          amount_ml: number;
          logged_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount_ml?: number;
          logged_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habits: {
        Row: Habit;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          frequency?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          frequency?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habit_logs: {
        Row: HabitLog;
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          logged_date?: string;
          completed?: boolean;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          habit_id?: string;
          user_id?: string;
          logged_date?: string;
          completed?: boolean;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
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
      meal_type: MealType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
