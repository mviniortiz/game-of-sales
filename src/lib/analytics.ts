// Analytics & Conversion Tracking
// Supports Google Analytics 4 (GA4) + Google Ads conversions

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const GADS_CONVERSION_ID = import.meta.env.VITE_GADS_CONVERSION_ID || "AW-18055201052";
const GADS_CONVERSION_LABEL = "1oljCLaqtJMcEJyCsqFD";
const GADS_DEMO_CONVERSION_LABEL = import.meta.env.VITE_GADS_DEMO_CONVERSION_LABEL;

// SHA-256 hex — Google Ads Enhanced Conversions espera lowercase, trimmed, hashed
async function sha256Hex(value: string): Promise<string | undefined> {
  try {
    const normalized = value.trim().toLowerCase();
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return undefined;
  }
}

// E.164 best-effort: remove não-dígitos, garante + na frente
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // Se já parece BR completo (13 dígitos com 55) ou já tem código, mantém
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  // Adiciona +55 default BR
  if (digits.length >= 10) return `+55${digits}`;
  return `+${digits}`;
}

// Type-safe gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Funnel event names
export const FUNNEL_EVENTS = {
  // Landing page
  LANDING_VIEW: "landing_page_view",
  LANDING_CTA_CLICK: "landing_cta_click",
  LANDING_PRICING_VIEW: "landing_pricing_view",

  // Registration
  REGISTER_START: "register_start",
  REGISTER_COMPLETE: "register_complete",

  // Onboarding steps
  ONBOARDING_START: "onboarding_start",
  ONBOARDING_STEP: "onboarding_step",
  ONBOARDING_COMPANY: "onboarding_company_complete",
  ONBOARDING_PROFILE: "onboarding_profile_complete",
  ONBOARDING_PIPELINE: "onboarding_pipeline_complete",
  ONBOARDING_COMPLETE: "onboarding_complete",

  // Payment
  PAYMENT_START: "payment_start",
  PAYMENT_PLAN_SELECT: "payment_plan_select",
  PAYMENT_SUBMIT: "payment_submit",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_ERROR: "payment_error",

  // Trial
  TRIAL_ACTIVATED: "trial_activated",
  TRIAL_EXPIRED: "trial_expired",
  UPGRADE_CLICK: "upgrade_click",

  // Demo
  DEMO_REQUEST_SUBMIT: "demo_request_submit",
  DEMO_SCHEDULED: "demo_scheduled",

  // Engagement
  FIRST_DEAL_CREATED: "first_deal_created",
  FIRST_SALE_CREATED: "first_sale_created",
  TEAM_INVITE_SENT: "team_invite_sent",
} as const;

// Initialize GA4 script dynamically
export function initAnalytics() {
  if (!GA_MEASUREMENT_ID) return;

  // Avoid double-init
  if (document.getElementById("ga-script")) return;

  // Load gtag.js
  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: true,
  });

  // Google Ads (AW-...) já tem config feito pelo inline script do index.html.
  // Não reconfigurar aqui para evitar double-config que pode suprimir conversions.
}

// Track a custom event — sem send_to, vai pra TODOS destinos configurados
// (GA4 G-YK8230WKT3 + Google Ads AW-18055201052)
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  try {
    window.gtag?.("event", eventName, params || {});
  } catch {
    // Silently fail - analytics should never break the app
  }
}

// Track Google Ads conversion
export function trackConversion(
  conversionLabel: string,
  value?: number,
  currency = "BRL"
) {
  if (!GADS_CONVERSION_ID || !conversionLabel) return;

  try {
    window.gtag?.("event", "conversion", {
      send_to: `${GADS_CONVERSION_ID}/${conversionLabel}`,
      value,
      currency,
    });
  } catch {
    // Silently fail
  }
}

// Track Google Ads purchase conversion (registration/checkout)
export function trackPurchaseConversion(value?: number, transactionId?: string, isNewCustomer = true) {
  try {
    window.gtag?.("event", "conversion", {
      send_to: `${GADS_CONVERSION_ID}/${GADS_CONVERSION_LABEL}`,
      value: value || 1.0,
      currency: "BRL",
      transaction_id: transactionId || "",
      new_customer: isNewCustomer,
    });
  } catch {
    // Silently fail
  }
}

// Track Google Ads demo request conversion (lead signal for PMax).
// Atribuição de click é feita pelo auto-tagging do Google Ads (cookie _gcl_aw),
// NÃO precisa passar gclid manualmente. Enhanced Conversions só é enviado se
// flag VITE_GADS_ENHANCED_CONVERSIONS estiver ativada (precisa ser habilitado
// no painel do Google Ads antes, senão a conversion inteira pode ser rejeitada).
export async function trackDemoConversion(opts?: { email?: string; phone?: string; value?: number; leadId?: string }) {
  if (!GADS_DEMO_CONVERSION_LABEL) {
    console.warn(
      "[analytics] VITE_GADS_DEMO_CONVERSION_LABEL not set — demo conversion will NOT be sent to Google Ads"
    );
    return;
  }

  // gtag.js pode não ter carregado (adblocker, network, CSP). Sem ele a conversion
  // só vai pro dataLayer e nunca chega ao servidor Google Ads.
  if (typeof window.gtag !== "function") {
    console.warn("[gads] window.gtag unavailable — demo conversion NOT delivered (adblocker or script load failure)");
    return;
  }

  const enhancedEnabled = import.meta.env.VITE_GADS_ENHANCED_CONVERSIONS === "true";

  if (enhancedEnabled && (opts?.email || opts?.phone)) {
    try {
      const userData: Record<string, string> = {};
      if (opts.email) {
        const h = await sha256Hex(opts.email);
        if (h) userData.sha256_email_address = h;
      }
      if (opts.phone) {
        const h = await sha256Hex(normalizePhone(opts.phone));
        if (h) userData.sha256_phone_number = h;
      }
      if (Object.keys(userData).length) {
        window.gtag("set", "user_data", userData);
      }
    } catch {
      // Enhanced Conversions nunca pode bloquear a conversão principal
    }
  }

  try {
    const sendTo = `${GADS_CONVERSION_ID}/${GADS_DEMO_CONVERSION_LABEL}`;
    let acked = false;
    const ackTimeoutId = window.setTimeout(() => {
      if (!acked) {
        console.warn(`[gads] demo conversion NOT acked in 3s — hit likely blocked`, sendTo);
      }
    }, 3000);

    window.gtag("event", "conversion", {
      send_to: sendTo,
      currency: "BRL",
      value: opts?.value ?? 50,
      transaction_id: opts?.leadId,
      event_callback: () => {
        acked = true;
        window.clearTimeout(ackTimeoutId);
        console.log("[gads] demo conversion acked", sendTo);
      },
    });
  } catch (e) {
    console.warn("[gads] trackDemoConversion threw", e);
  }
}

// Track page view (for SPA navigation)
export function trackPageView(path: string, title?: string) {
  if (!GA_MEASUREMENT_ID) return;

  try {
    window.gtag?.("event", "page_view", {
      page_path: path,
      page_title: title,
      send_to: GA_MEASUREMENT_ID,
    });
  } catch {
    // Silently fail
  }
}
