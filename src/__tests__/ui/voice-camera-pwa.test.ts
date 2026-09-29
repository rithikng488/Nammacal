import { describe, it, expect, afterEach } from "vitest";
import manifest from "@/app/manifest";
import { getSupportedAudioMimeType } from "@/components/ai/VoiceLogModal";

describe("Voice, Camera, and PWA UI/UX Polish", () => {
  describe("PWA Web Manifest Configuration", () => {
    it("should export a valid Next.js PWA Web App manifest", () => {
      const pwaManifest = manifest();

      expect(pwaManifest).toBeDefined();
      expect(pwaManifest.name).toBe("NammaCal — Indian Nutrition & Calorie Tracker");
      expect(pwaManifest.short_name).toBe("NammaCal");
      expect(pwaManifest.start_url).toBe("/");
      expect(pwaManifest.display).toBe("standalone");
      expect(pwaManifest.theme_color).toBe("#166534");
      expect(pwaManifest.background_color).toBe("#ffffff");
      expect(pwaManifest.icons?.length).toBeGreaterThan(0);
    });
  });

  describe("Dynamic Audio MIME Type Detection for Voice Logging", () => {
    const originalMediaRecorder = global.MediaRecorder;

    afterEach(() => {
      global.MediaRecorder = originalMediaRecorder;
    });

    it("should return audio/webm;codecs=opus when supported (standard Chrome/Android)", () => {
      global.MediaRecorder = {
        isTypeSupported: (mime: string) => mime === "audio/webm;codecs=opus" || mime === "audio/webm",
      } as unknown as typeof MediaRecorder;

      const detected = getSupportedAudioMimeType();
      expect(detected).toBe("audio/webm;codecs=opus");
    });

    it("should fallback to audio/mp4 when webm is unsupported (Safari / iOS / WebView)", () => {
      global.MediaRecorder = {
        isTypeSupported: (mime: string) => mime === "audio/mp4" || mime === "audio/aac",
      } as unknown as typeof MediaRecorder;

      const detected = getSupportedAudioMimeType();
      expect(detected).toBe("audio/mp4");
    });

    it("should fallback to audio/aac if only aac is supported", () => {
      global.MediaRecorder = {
        isTypeSupported: (mime: string) => mime === "audio/aac",
      } as unknown as typeof MediaRecorder;

      const detected = getSupportedAudioMimeType();
      expect(detected).toBe("audio/aac");
    });

    it("should fallback to empty string when no tested types are supported", () => {
      global.MediaRecorder = {
        isTypeSupported: () => false,
      } as unknown as typeof MediaRecorder;

      const detected = getSupportedAudioMimeType();
      expect(detected).toBe("");
    });
  });
});
