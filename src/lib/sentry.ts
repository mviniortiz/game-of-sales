// Sentry carrega via dynamic import pra não entrar no bundle principal.
// Init é chamado em idle callback depois do primeiro paint.

let sentryModule: typeof import("@sentry/react") | null = null;

async function loadSentry() {
  if (sentryModule) return sentryModule;
  sentryModule = await import("@sentry/react");
  return sentryModule;
}

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  if (import.meta.env.DEV) return;

  const Sentry = await loadSentry();
  Sentry.init({
    dsn,
    environment: "production",
    enabled: true,
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

export async function captureException(error: unknown, extra?: Record<string, unknown>) {
  try {
    const Sentry = await loadSentry();
    Sentry.captureException(error, { extra });
  } catch {
    // Se Sentry nem carrega, ignora — erro já foi pro console.
  }
}
