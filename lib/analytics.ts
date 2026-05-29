import posthog from "posthog-js";

// Thin wrapper so components can fire events without caring whether PostHog is
// configured (it's a no-op without a key, e.g. local dev / OSS forks).
export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    if ((posthog as unknown as { __loaded?: boolean }).__loaded) {
      posthog.capture(event, props);
    }
  } catch {
    /* never let analytics break the app */
  }
}
