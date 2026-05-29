"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

// Cookieless, privacy-first analytics + exception capture. Memory persistence
// means no cookies/localStorage (keeps the "no cookies for the public app"
// promise and avoids a consent banner). No autocapture — only the explicit
// events fired via lib/analytics.ts. No-op entirely when no key is set.
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!KEY) return;
    if ((posthog as unknown as { __loaded?: boolean }).__loaded) return;
    posthog.init(KEY, {
      api_host: HOST,
      persistence: "memory",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      disable_surveys: true,
      disable_session_recording: true,
      person_profiles: "identified_only",
      capture_exceptions: true,
    });
    // Shared PostHog project with other apps -> stamp every event so it's
    // filterable by `app` (and $host already carries the domain).
    posthog.register({ app: "commitcrimes" });
  }, []);

  useEffect(() => {
    if (KEY && (posthog as unknown as { __loaded?: boolean }).__loaded) {
      posthog.capture("$pageview");
    }
  }, [pathname]);

  return <>{children}</>;
}
