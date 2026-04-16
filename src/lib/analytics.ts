// Analytics & Conversion Tracking
// Supports Google Analytics 4 (GA4) + Google Ads conversions

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const GADS_CONVERSION_ID = import.meta.env.VITE_GADS_CONVERSION_ID || "AW-18055201052";
const GADS_CONVERSION_LABEL = "1oljCLaqtJMcEJyCsqFD";

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

  // Configure Google Ads conversion tracking if available
  if (GADS_CONVERSION_ID) {
    window.gtag("config", GADS_CONVERSION_ID);
  }
}

// Track a custom event
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (!GA_MEASUREMENT_ID) return;

  try {
    window.gtag?.("event", eventName, {
      ...params,
      send_to: GA_MEASUREMENT_ID,
    });
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
