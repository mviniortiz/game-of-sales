import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.DEV ? "development" : "production",
    enabled: !import.meta.env.DEV,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration({ enableLongTask: false }),
      Sentry.replayIntegration(),
    ],
    ignoreErrors: [
      "Cannot read properties of undefined (reading 'domInteractive')",
      "undefined is not an object (evaluating 'performance.timing.domInteractive')",
    ],
  });
}

export { Sentry };
