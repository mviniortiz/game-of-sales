// Medição do site e do app: GA4 + Google Ads (gtag.js) e Microsoft Clarity.
// Regras que este arquivo garante:
//   1. Só o site no ar mede (vyzon.com.br e subdomínios). Localhost e prévia da
//      Vercel não carregam o gtag.js nem mandam nada.
//   2. Nenhum evento se perde por ter saído cedo: o gtag.js só carrega depois da
//      primeira interação, então o que dispara antes fica numa fila (guardada na
//      sessão do navegador) e sai quando o script carrega, mesmo que a página
//      tenha trocado no meio.
//   3. Aparelho do time marca o tráfego como interno (traffic_type), para o
//      filtro de tráfego interno do GA4 tirar dos relatórios.

import { getAttribution } from "./attribution";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const GADS_CONVERSION_ID = import.meta.env.VITE_GADS_CONVERSION_ID || "AW-18055201052";
// Conversão "Compra" do Google Ads: assinatura paga, na volta do Stripe.
const GADS_PURCHASE_LABEL = "1oljCLaqtJMcEJyCsqFD";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
    // Microsoft Clarity — carregado pelo stub no index.html (após 1ª interação).
    clarity?: (...args: unknown[]) => void;
  }
}

export type EventParams = Record<string, string | number | boolean>;

// Nomes dos eventos do site e do funil de conta. Os do app logado ficam em
// APP_EVENTS (src/lib/appAnalytics.ts).
export const FUNNEL_EVENTS = {
  // Landing
  LANDING_VIEW: "landing_page_view",

  // Cadastro
  REGISTER_START: "register_start",
  /** Conta criada, esperando a pessoa confirmar o e-mail. Ainda não é cadastro. */
  REGISTER_EMAIL_SENT: "register_email_sent",
  /** Empresa criada: o cadastro acabou. Uma vez por conta. */
  REGISTER_COMPLETE: "register_complete",

  // Plano
  PLAN_LOCK_VIEW: "plan_lock_view",
  UPGRADE_CLICK: "upgrade_click",
  /** Assinatura paga confirmada na volta do Stripe (evento padrão do GA4). */
  PURCHASE: "purchase",
} as const;

// ── Trava de domínio ────────────────────────────────────────────────────────

const DOMINIO_MEDIDO = /(^|\.)vyzon\.com\.br$/;

/** Só o site no ar mede. Mesma regra do Pixel e do Clarity no index.html. */
export function dominioMedido(host: string = typeof window === "undefined" ? "" : window.location.hostname): boolean {
  return DOMINIO_MEDIDO.test(host);
}

// ── Tráfego interno ─────────────────────────────────────────────────────────

const INTERNO_KEY = "vyz_interno";
let internoAvisado = false;

/**
 * Marca (ou desmarca) este navegador como do time. Vale daqui pra frente, em
 * qualquer página. Também dá para marcar abrindo o site com ?interno=1 e
 * desmarcar com ?interno=0.
 */
export function marcarInterno(sim = true) {
  try {
    if (sim) localStorage.setItem(INTERNO_KEY, "1");
    else localStorage.removeItem(INTERNO_KEY);
  } catch {
    // sem storage: vale só para esta página
  }
  // Uma vez por página: quem chama a cada render não enche a fila.
  if (!sim || internoAvisado) return;
  internoAvisado = true;
  gtag("set", { traffic_type: "internal" });
}

/** Este navegador é do time? */
export function ehInterno(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get("interno");
    if (q === "1") localStorage.setItem(INTERNO_KEY, "1");
    if (q === "0") localStorage.removeItem(INTERNO_KEY);
    return localStorage.getItem(INTERNO_KEY) === "1";
  } catch {
    return false;
  }
}

// ── Fila ────────────────────────────────────────────────────────────────────
// "esperando": o gtag.js ainda não carregou; tudo vai para a fila.
// "ligado": o script carregou; vai direto.
// "desligado": fora do domínio ou sem ID do GA4; nada é guardado nem enviado.

type Comando = [string, ...unknown[]];
type Estado = "esperando" | "ligado" | "desligado";

const FILA_KEY = "vyz_ga_fila";
const TETO_FILA = 60;

let estado: Estado = typeof window !== "undefined" && !!GA_MEASUREMENT_ID && dominioMedido() ? "esperando" : "desligado";
let iniciado = false;
let fila: Comando[] = estado === "esperando" ? lerFila() : [];

function lerFila(): Comando[] {
  try {
    const salvo = JSON.parse(sessionStorage.getItem(FILA_KEY) || "[]");
    return Array.isArray(salvo) ? (salvo.filter((c) => Array.isArray(c) && typeof c[0] === "string") as Comando[]) : [];
  } catch {
    return [];
  }
}

function salvarFila() {
  try {
    if (fila.length) sessionStorage.setItem(FILA_KEY, JSON.stringify(fila));
    else sessionStorage.removeItem(FILA_KEY);
  } catch {
    // sem storage: a fila vale só para esta página
  }
}

/** Único caminho até o gtag. Nunca joga exceção: medição não derruba a tela. */
function gtag(...comando: Comando) {
  try {
    if (estado === "desligado") return;
    if (estado === "ligado") {
      window.gtag(...comando);
      return;
    }
    if (fila.length >= TETO_FILA) return;
    fila.push(comando);
    salvarFila();
  } catch {
    // idem
  }
}

function soltarFila() {
  estado = "ligado";
  const pendentes = fila;
  fila = [];
  salvarFila();
  for (const comando of pendentes) {
    try {
      window.gtag(...comando);
    } catch {
      // um comando ruim não segura os outros
    }
  }
}

/**
 * Carrega o gtag.js e configura o GA4. Chamado pelo main.tsx depois da primeira
 * interação (ou de 4s), para o script ficar fora da janela de TBT.
 */
export function initAnalytics() {
  if (estado === "desligado" || iniciado) return;
  iniciado = true;
  try {
    window.dataLayer = window.dataLayer || [];
    // Precisa empurrar o objeto `arguments`: o gtag.js ignora array comum.
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    internoAvisado = ehInterno();
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: true,
      ...(internoAvisado ? { traffic_type: "internal" } : {}),
    });
    // Google Ads (AW-...) já tem config feito pelo inline script do index.html.
    // Não reconfigurar aqui para evitar double-config que pode suprimir conversions.

    // Marca a SESSÃO com a hipótese de consciência (não só a conversão), pra dar
    // pra segmentar conversão por estágio mental no GA4/Clarity.
    reportAwareness();

    const script = document.createElement("script");
    script.id = "ga-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    // A fila só sai com o script de pé: antes disso a página pode trocar e o
    // que estiver só no dataLayer morre junto.
    script.onload = soltarFila;
    // Bloqueador de anúncio: o script nunca vem. Para de guardar o que não vai sair.
    script.onerror = () => {
      estado = "desligado";
      fila = [];
      salvarFila();
    };
    document.head.appendChild(script);
  } catch {
    estado = "desligado";
  }
}

// Envia canal + hipótese de consciência pro GA4 (user_property + evento) e Clarity
// (tags filtráveis). Lê o first-touch já capturado no bootstrap (getAttribution).
function reportAwareness() {
  try {
    const a = getAttribution();
    if (!a) return;
    const params = {
      traffic_source: a.traffic_source || "unknown",
      awareness_hypothesis: a.awareness_hypothesis || "unknown",
      utm_campaign: a.utm_campaign || "(none)",
      query_intent: a.query_intent || "(none)",
    };
    // user_property na frente da fila: vale para os eventos que esperavam.
    fila.unshift(["set", "user_properties", {
      awareness_hypothesis: params.awareness_hypothesis,
      traffic_source: params.traffic_source,
    }]);
    trackEvent("awareness_detected", params);
    claritySet("awareness", params.awareness_hypothesis);
    claritySet("traffic_source", params.traffic_source);
  } catch {
    // analytics nunca pode quebrar o app
  }
}

/**
 * Evento para o GA4 (e para o Google Ads, que escuta o mesmo gtag). Pode ser
 * chamado a qualquer hora: antes do gtag.js carregar, espera na fila.
 */
export function trackEvent(eventName: string, params?: EventParams) {
  gtag("event", eventName, params || {});
}

/**
 * Assinatura paga. Manda o `purchase` do GA4 e a conversão "Compra" do Google
 * Ads. A promessa resolve quando já é seguro trocar de página: na hora, se o
 * evento ficou na fila (ela sobrevive à troca), ou quando o GA4 confirma o
 * envio, com teto de 1,2s.
 */
export function trackPurchase(o: { value: number; transactionId: string; plan: string }): Promise<void> {
  const compra = {
    transaction_id: o.transactionId,
    value: o.value,
    currency: "BRL",
    items: [{ item_id: o.plan, item_name: "Vyzon", price: o.value, quantity: 1 }],
  };
  const ads = {
    send_to: `${GADS_CONVERSION_ID}/${GADS_PURCHASE_LABEL}`,
    value: o.value,
    currency: "BRL",
    transaction_id: o.transactionId,
  };
  clarityEvent(FUNNEL_EVENTS.PURCHASE);
  clarityUpgrade(FUNNEL_EVENTS.PURCHASE);
  if (estado !== "ligado") {
    gtag("event", FUNNEL_EVENTS.PURCHASE, compra);
    gtag("event", "conversion", ads);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const teto = window.setTimeout(resolve, 1200);
    gtag("event", FUNNEL_EVENTS.PURCHASE, {
      ...compra,
      event_callback: () => {
        window.clearTimeout(teto);
        resolve();
      },
    });
    gtag("event", "conversion", ads);
  });
}

/** Só para testes: estado da fila e do envio. */
export function _medicao() {
  return { estado, fila: [...fila] };
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

/** Prioriza a GRAVAÇÃO desta sessão (use em momentos-chave: aha da Lume, CTA). */
export function clarityUpgrade(reason: string) {
  try {
    window.clarity?.("upgrade", reason);
  } catch {
    // noop
  }
}

// Eventos de comportamento da navegação e da Lume. Mesmos nomes em GA4 (funil
// mensurável) e no Clarity (filtro de sessão). Use trackBehavior() pra disparar nos dois.
export const DEMO_EVENTS = {
  NAV_TAB_CLICK: "nav_tab_click",
  EVA_SUGGESTION_SHOWN: "eva_suggestion_shown",
  EVA_SUGGESTION_ACCEPTED: "eva_suggestion_accepted",
  EVA_SUGGESTION_ADJUSTED: "eva_suggestion_adjusted",
} as const;

/** Dispara um evento de comportamento em GA4 (+Ads) E no Clarity de uma vez. */
export function trackBehavior(eventName: string, params?: EventParams) {
  trackEvent(eventName, params);
  clarityEvent(eventName);
}

