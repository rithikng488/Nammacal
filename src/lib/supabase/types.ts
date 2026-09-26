export type UserRole = 'owner' | 'admin' | 'member';
export type UserStatus = 'pending' | 'active' | 'disabled';
export type InviteRole = 'admin' | 'member';
export type PreferredLanguage = 'en' | 'ta' | 'tanglish';

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
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
