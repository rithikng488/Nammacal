/**
 * Client-side audit helpers for NammaCal.
 *
 * Privacy Invariants:
 * - Listens only to official OS screenshot detection callback events.
 * - NEVER captures or transmits screen images, bitmaps, or gallery data.
 */

let isScreenshotListenerInitialized = false;

export function initScreenshotDetection(): () => void {
  if (typeof window === "undefined" || isScreenshotListenerInitialized) {
    return () => {};
  }

  const handleScreenshot = async () => {
    try {
      await fetch("/api/audit/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "screenshot_detected",
          entityType: "app_screen",
          severity: "info",
          metadata: {
            screen: window.location.pathname,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch {
      // Non-fatal, silently ignore
    }
  };

  window.addEventListener("nammacalScreenshotDetected", handleScreenshot);
  isScreenshotListenerInitialized = true;

  return () => {
    window.removeEventListener("nammacalScreenshotDetected", handleScreenshot);
    isScreenshotListenerInitialized = false;
  };
}
