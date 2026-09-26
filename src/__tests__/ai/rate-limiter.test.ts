import { describe, it, expect, beforeEach } from "vitest";
import { rateLimiter, enforceAIRateLimit } from "@/lib/ai/rate-limiter";

describe("Phase 5 - AI Rate Limiter & Abuse Protection", () => {
  beforeEach(() => {
    rateLimiter.reset();
  });

  it("allows operations within configured quota", async () => {
    const userId = "user-test-quota";
    const customConfig = { maxRequests: 3, windowMs: 60000 };

    const check1 = rateLimiter.checkLimit(userId, "photo_analysis", customConfig);
    expect(check1.allowed).toBe(true);
    expect(check1.remaining).toBe(3);

    rateLimiter.recordUsage(userId, "photo_analysis");

    const check2 = rateLimiter.checkLimit(userId, "photo_analysis", customConfig);
    expect(check2.allowed).toBe(true);
    expect(check2.remaining).toBe(2);
  });

  it("rejects operations when user exceeds quota and calculates reset cooldown", async () => {
    const userId = "user-over-quota";
    const customConfig = { maxRequests: 2, windowMs: 60000 };

    rateLimiter.recordUsage(userId, "photo_analysis");
    rateLimiter.recordUsage(userId, "photo_analysis");

    const check = rateLimiter.checkLimit(userId, "photo_analysis", customConfig);
    expect(check.allowed).toBe(false);
    expect(check.remaining).toBe(0);
    expect(check.resetInMs).toBeGreaterThan(0);
    expect(check.resetInMs).toBeLessThanOrEqual(60000);
  });

  it("isolates rate limits between distinct users", async () => {
    const userA = "user-a";
    const userB = "user-b";
    const customConfig = { maxRequests: 1, windowMs: 60000 };

    rateLimiter.recordUsage(userA, "photo_analysis");

    expect(rateLimiter.checkLimit(userA, "photo_analysis", customConfig).allowed).toBe(false);
    expect(rateLimiter.checkLimit(userB, "photo_analysis", customConfig).allowed).toBe(true);
  });

  it("isolates rate limits between distinct action types (photo vs voice)", async () => {
    const userId = "user-multi-action";
    const customConfig = { maxRequests: 1, windowMs: 60000 };

    rateLimiter.recordUsage(userId, "photo_analysis");

    expect(rateLimiter.checkLimit(userId, "photo_analysis", customConfig).allowed).toBe(false);
    expect(rateLimiter.checkLimit(userId, "voice_transcription", customConfig).allowed).toBe(true);
  });

  it("throws user-friendly error when enforceAIRateLimit exceeds limit", async () => {
    const userId = "user-throw-test";
    // Artificially fill quota
    for (let i = 0; i < 25; i++) {
      rateLimiter.recordUsage(userId, "photo_analysis");
    }

    await expect(enforceAIRateLimit(userId, "photo_analysis")).rejects.toThrow(
      "Hourly limit reached for food photo analysis"
    );
  });
});
