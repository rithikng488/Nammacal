import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Server-only Supabase Admin Client using SUPABASE_SERVICE_ROLE_KEY.
 *
 * CRITICAL SECURITY INVARIANT:
 * This client bypasses Row Level Security (RLS) and can perform administrative actions
 * like creating users, approving invites, and querying administrative audit trails.
 * It MUST NEVER be imported or executed in client components or browser bundles.
 */
export function getAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: Supabase Admin Client cannot be invoked in browser environment."
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
