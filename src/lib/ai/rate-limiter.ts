import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AIActionType } from "../supabase/types";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const DEFAULT_AI_RATE_LIMITS: Record<AIActionType, RateLimitConfig> = {
  photo_analysis: {
    maxRequests: parseInt(process.env.AI_PHOTO_RATE_LIMIT || "20", 10),
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  voice_transcription: {
    maxRequests: parseInt(process.env.AI_VOICE_RATE_LIMIT || "30", 10),
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  food_parsing: {
    maxRequests: parseInt(process.env.AI_PARSE_RATE_LIMIT || "60", 10),
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

/**
 * In-memory sliding window store for fast rate checks.
 */
class InMemoryRateLimiter {
  private userLogs = new Map<string, Array<{ action: AIActionType; timestamp: number }>>();

  /**
   * Checks if user has exceeded rate limits for a given action.
   */
  public checkLimit(
    userId: string,
    action: AIActionType,
    customConfig?: RateLimitConfig
  ): { allowed: boolean; remaining: number; resetInMs: number } {
    const config = customConfig || DEFAULT_AI_RATE_LIMITS[action];
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const userEntries = this.userLogs.get(userId) || [];
    // Filter to active window and current action
    const recent = userEntries.filter(
      (entry) => entry.action === action && entry.timestamp > windowStart
    );

    if (recent.length >= config.maxRequests) {
      const oldest = recent[0];
      const resetInMs = Math.max(0, oldest.timestamp + config.windowMs - now);
      return { allowed: false, remaining: 0, resetInMs };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - recent.length,
      resetInMs: config.windowMs,
    };
  }

  /**
   * Records a completed or initiated action for a user.
   */
  public recordUsage(userId: string, action: AIActionType): void {
    const now = Date.now();
    const userEntries = this.userLogs.get(userId) || [];
    // Prune entries older than 24 hours to prevent memory leaks
    const pruned = userEntries.filter((entry) => now - entry.timestamp < 24 * 60 * 60 * 1000);
    pruned.push({ action, timestamp: now });
    this.userLogs.set(userId, pruned);
  }

  /**
   * Resets limits for testing purposes.
   */
  public reset(userId?: string): void {
    if (userId) {
      this.userLogs.delete(userId);
    } else {
      this.userLogs.clear();
    }
  }
}

export const rateLimiter = new InMemoryRateLimiter();

/**
 * Asserts rate limit, throws user-friendly error if exceeded, and logs usage.
 */
export async function enforceAIRateLimit(
  userId: string,
  action: AIActionType,
  client?: SupabaseClient<Database>
): Promise<void> {
  const result = rateLimiter.checkLimit(userId, action);

  if (!result.allowed) {
    const minutesLeft = Math.ceil(result.resetInMs / 60000);
    const friendlyName =
      action === "photo_analysis"
        ? "food photo analysis"
        : action === "voice_transcription"
        ? "voice food logging"
        : "natural language food parsing";

    throw new Error(
      `Hourly limit reached for ${friendlyName}. Please wait ~${minutesLeft} minute${
        minutesLeft === 1 ? "" : "s"
      } before trying again.`
    );
  }

  // Record in-memory
  rateLimiter.recordUsage(userId, action);

  // Optionally log to database table if supabase client is available
  if (client) {
    try {
      await client.from("ai_usage_logs").insert({
        user_id: userId,
        action_type: action,
        provider: process.env.AI_PROVIDER || "gemini",
        model: process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash",
      });
    } catch {
      // Don't fail the request if usage logging fails
    }
  }
}
