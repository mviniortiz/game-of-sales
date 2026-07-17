// Analytics & Conversion Tracking
// Supports Google Analytics 4 (GA4) + Google Ads conversions

import { getAttribution } from "./attribution";

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
    // Microsoft Clarity — carregado pelo stub no index.html (após 1ª interação).
    clarity?: (...args: any[]) => void;
  }
}

// Funnel event names
export const FUNNEL_EVENTS = {
  // Landing page
  LANDING_VIEW: "landing_page_view",
  LANDING_CTA_CLICK: "landing_cta_click",
  LANDING_PRICING_VIEW: "landing_pricing_view",
  LANDING_SCROLL_DEPTH: "scroll_depth",
  DEMO_OPEN: "demo_open",
  AGENT_BUILDER_START: "agent_builder_start",
  AGENT_BUILDER_LEAD: "agent_builder_lead",

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

  // Marca a SESSÃO com a hipótese de consciência (não só a conversão), pra dar
  // pra segmentar conversão por estágio mental no GA4/Clarity. Sem isso a média
  // esconde o erro (página converte no agregado e desperdiça tráfego alto-intenção).
  reportAwareness();
}

// Envia canal + hipótese de consciência pro GA4 (user_property + evento) e Clarity
// (tags filtráveis). Lê o first-touch já capturado no bootstrap (getAttribution).
export function reportAwareness() {
  try {
    const a = getAttribution();
    if (!a) return;
    const params = {
      traffic_source: a.traffic_source || "unknown",
      awareness_hypothesis: a.awareness_hypothesis || "unknown",
      utm_campaign: a.utm_campaign || "(none)",
      query_intent: a.query_intent || "(none)",
    };
    // user_property: segmenta relatórios inteiros por consciência, não só eventos.
    window.gtag?.("set", "user_properties", {
      awareness_hypothesis: params.awareness_hypothesis,
      traffic_source: params.traffic_source,
    });
    trackEvent("awareness_detected", params);
    claritySet("awareness", params.awareness_hypothesis);
    claritySet("traffic_source", params.traffic_source);
  } catch {
    // analytics nunca pode quebrar o app
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// Microsoft Clarity — custom tags / events / identify / upgrade.
// O clarity() global é carregado pelo stub no index.html (após a 1ª interação);
// antes disso window.clarity é undefined, então os wrappers no-op com segurança.
// Tags levam ~30min–2h pra aparecer como filtro no painel. Docs:
// https://learn.microsoft.com/clarity/setup-and-installation/clarity-api
// ─────────────────────────────────────────────────────────────────────────────

/** Tag de sessão (filtrável no painel). `value` pode ser string ou lista. */
export function claritySet(key: string, value: string | string[]) {
  try {
    window.clarity?.("set", key, value);
  } catch {
    // analytics nunca pode quebrar o app
  }
}

/** Evento custom (vira "smart event" filtrável no painel). */
export function clarityEvent(name: string) {
  try {
    window.clarity?.("event", name);
  } catch {
    // noop
  }
}

/** Liga a sessão a um id estável (ex.: id da demo). friendlyName aparece no painel. */
export function clarityIdentify(customId: string, friendlyName?: string) {
  try {
    window.clarity?.("identify", customId, undefined, undefined, friendlyName);
  } catch {
    // noop
  }
}

/** Prioriza a GRAVAÇÃO desta sessão (use em momentos-chave: aha da EVA, CTA). */
export function clarityUpgrade(reason: string) {
  try {
    window.clarity?.("upgrade", reason);
  } catch {
    // noop
  }
}

// Eventos de comportamento da demo/EVA. Mesmos nomes em GA4 (funil mensurável) e
// no Clarity (filtro de sessão). Use trackBehavior() pra disparar nos dois.
export const DEMO_EVENTS = {
  DEMO_START: "demo_start",
  EVA_STEP_VIEW: "eva_step_view",
  NAV_TAB_CLICK: "nav_tab_click",
  NAV_OFF_FLOW: "nav_off_flow",
  DEMO_CTA: "demo_cta",
  EVA_SUGGESTION_SHOWN: "eva_suggestion_shown",
  EVA_SUGGESTION_ACCEPTED: "eva_suggestion_accepted",
  EVA_SUGGESTION_ADJUSTED: "eva_suggestion_adjusted",
} as const;

/** Dispara um evento de comportamento em GA4 (+Ads) E no Clarity de uma vez. */
export function trackBehavior(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  trackEvent(eventName, params);
  clarityEvent(eventName);
}

/**
 * Heurística: a sessão atual é uma DEMO? Verdadeiro se a flag foi setada no
 * EmbedDemo (sessionStorage) ou se o app roda dentro de um iframe (embed).
 * Usada pra distinguir clique manual de aba (off-flow) durante a demo.
 */
export function isDemoSession(): boolean {
  try {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("vyzon_demo") === "1") return true;
  } catch {
    // storage bloqueado — segue pra checagem de iframe
  }
  try {
    return window.self !== window.top;
  } catch {
    // acesso cross-origin a window.top => estamos num iframe
    return true;
  }
}
