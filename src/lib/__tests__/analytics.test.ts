// Fila, trava de domínio e tráfego interno do GA4 (src/lib/analytics.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Analytics = typeof import("@/lib/analytics");

const jsdom = (globalThis as unknown as { jsdom: { reconfigure: (o: { url: string }) => void } }).jsdom;

/** Carrega o módulo do zero, como numa página nova, no endereço dado. */
async function abrir(url: string, ga = "G-TESTE"): Promise<Analytics> {
    jsdom.reconfigure({ url });
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", ga);
    vi.resetModules();
    return import("@/lib/analytics");
}

/** O que chegou no gtag de verdade (o dataLayer guarda objetos `arguments`). */
const enviados = () => (window.dataLayer ?? []).map((a) => Array.from(a as ArrayLike<unknown>));
const eventos = () => enviados().filter((c) => c[0] === "event").map((c) => c[1]);
const script = () => document.getElementById("ga-script") as HTMLScriptElement | null;
const carregarScript = () => script()!.onload!(new Event("load"));

beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    script()?.remove();
    window.dataLayer = [];
});
afterEach(() => vi.unstubAllEnvs());

describe("trava de domínio", () => {
    it.each(["http://localhost:8080/", "https://vyzon-git-teste.vercel.app/", "https://vyzon.com.br.exemplo.com/"])("fora do vyzon.com.br não carrega nem guarda nada: %s", async (url) => {
        const a = await abrir(url);
        a.trackEvent("register_start");
        a.initAnalytics();
        expect(a._medicao()).toEqual({ estado: "desligado", fila: [] });
        expect(script()).toBeNull();
        expect(enviados()).toEqual([]);
        expect(sessionStorage.getItem("vyz_ga_fila")).toBeNull();
    });

    it.each(["https://vyzon.com.br/", "https://www.vyzon.com.br/criar-conta"])("no site no ar mede: %s", async (url) => {
        const a = await abrir(url);
        expect(a._medicao().estado).toBe("esperando");
    });

    it("sem ID do GA4 fica desligado", async () => {
        const a = await abrir("https://vyzon.com.br/", "");
        a.initAnalytics();
        expect(a._medicao().estado).toBe("desligado");
        expect(script()).toBeNull();
    });
});

describe("fila", () => {
    it("evento antes do gtag.js carregar espera e sai depois do config, na ordem", async () => {
        const a = await abrir("https://vyzon.com.br/criar-conta");
        a.trackEvent("register_start", { plan: "pro" });
        a.trackEvent("register_complete", { plan: "pro", via: "email" });
        expect(enviados()).toEqual([]);

        a.initAnalytics();
        expect(enviados().map((c) => c[0])).toEqual(["js", "config"]);
        expect(eventos()).toEqual([]);

        carregarScript();
        expect(a._medicao()).toEqual({ estado: "ligado", fila: [] });
        expect(eventos()).toEqual(["register_start", "register_complete"]);
        expect(enviados().findIndex((c) => c[0] === "config")).toBeLessThan(enviados().findIndex((c) => c[0] === "event"));
        expect(sessionStorage.getItem("vyz_ga_fila")).toBeNull();

        a.trackEvent("upgrade_click");
        expect(eventos()).toEqual(["register_start", "register_complete", "upgrade_click"]);
    });

    it("o que ficou na fila sobrevive à troca de página", async () => {
        const antes = await abrir("https://vyzon.com.br/upgrade");
        antes.trackEvent("upgrade_click", { plan: "pro" });
        expect(JSON.parse(sessionStorage.getItem("vyz_ga_fila")!)).toEqual([["event", "upgrade_click", { plan: "pro" }]]);

        // Página nova: módulo recarregado, dataLayer vazio.
        window.dataLayer = [];
        const depois = await abrir("https://vyzon.com.br/configuracoes/faturamento?assinatura=ok");
        depois.initAnalytics();
        carregarScript();
        expect(eventos()).toEqual(["upgrade_click"]);
    });

    it("initAnalytics duas vezes não duplica o script nem o config", async () => {
        const a = await abrir("https://vyzon.com.br/");
        a.initAnalytics();
        a.initAnalytics();
        expect(document.querySelectorAll("#ga-script")).toHaveLength(1);
        expect(enviados().filter((c) => c[0] === "config")).toHaveLength(1);
    });

    it("script bloqueado: para de guardar", async () => {
        const a = await abrir("https://vyzon.com.br/");
        a.trackEvent("register_start");
        a.initAnalytics();
        script()!.onerror!(new Event("error"));
        a.trackEvent("register_complete");
        expect(a._medicao()).toEqual({ estado: "desligado", fila: [] });
        expect(sessionStorage.getItem("vyz_ga_fila")).toBeNull();
    });

    it("canal e consciência entram na frente da fila", async () => {
        sessionStorage.setItem("vyzon_attribution", JSON.stringify({ utm_source: "ig", utm_medium: "paid_social", traffic_source: "social", awareness_hypothesis: "problem_aware" }));
        const a = await abrir("https://vyzon.com.br/");
        a.trackEvent("landing_page_view");
        a.initAnalytics();
        carregarScript();
        const depoisDoConfig = enviados().slice(enviados().findIndex((c) => c[0] === "config") + 1);
        expect(depoisDoConfig[0]).toEqual(["set", "user_properties", { awareness_hypothesis: "problem_aware", traffic_source: "social" }]);
        expect(eventos()).toEqual(["landing_page_view", "awareness_detected"]);
    });
});

describe("compra", () => {
    const compra = { value: 97, transactionId: "sub_123", plan: "pro" };

    it("antes do script: fica na fila e já libera a troca de página", async () => {
        const a = await abrir("https://vyzon.com.br/configuracoes/faturamento?assinatura=ok");
        await a.trackPurchase(compra);
        const fila = a._medicao().fila;
        expect(fila.map((c) => c[1])).toEqual(["purchase", "conversion"]);
        expect(fila[0][2]).toMatchObject({ transaction_id: "sub_123", value: 97, currency: "BRL" });
        expect(fila[1][2]).toMatchObject({ send_to: "AW-18055201052/1oljCLaqtJMcEJyCsqFD", transaction_id: "sub_123", value: 97 });
        // Só o que cabe em JSON vai pra fila (ela mora no sessionStorage).
        expect(JSON.parse(sessionStorage.getItem("vyz_ga_fila")!)).toHaveLength(2);
    });

    it("com o script de pé: espera o GA4 confirmar o envio", async () => {
        const a = await abrir("https://vyzon.com.br/configuracoes/faturamento?assinatura=ok");
        a.initAnalytics();
        carregarScript();
        let pronto = false;
        const espera = a.trackPurchase(compra).then(() => { pronto = true; });
        await Promise.resolve();
        expect(pronto).toBe(false);
        const enviado = enviados().find((c) => c[1] === "purchase")![2] as { event_callback: () => void; items: unknown[] };
        expect(enviado.items).toEqual([{ item_id: "pro", item_name: "Vyzon", price: 97, quantity: 1 }]);
        enviado.event_callback();
        await espera;
        expect(pronto).toBe(true);
    });

    it("sem confirmação do GA4, libera depois do teto", async () => {
        vi.useFakeTimers();
        try {
            const a = await abrir("https://vyzon.com.br/configuracoes/faturamento?assinatura=ok");
            a.initAnalytics();
            carregarScript();
            let pronto = false;
            void a.trackPurchase(compra).then(() => { pronto = true; });
            await vi.advanceTimersByTimeAsync(1100);
            expect(pronto).toBe(false);
            await vi.advanceTimersByTimeAsync(200);
            expect(pronto).toBe(true);
        } finally {
            vi.useRealTimers();
        }
    });
});

describe("tráfego interno", () => {
    const config = () => enviados().find((c) => c[0] === "config")![2];

    it("visitante comum não leva traffic_type", async () => {
        const a = await abrir("https://vyzon.com.br/");
        a.initAnalytics();
        expect(config()).toEqual({ send_page_view: true });
    });

    it("?interno=1 marca o navegador e vale nas páginas seguintes; ?interno=0 desmarca", async () => {
        let a = await abrir("https://vyzon.com.br/?interno=1");
        a.initAnalytics();
        expect(config()).toEqual({ send_page_view: true, traffic_type: "internal" });

        script()?.remove();
        window.dataLayer = [];
        a = await abrir("https://vyzon.com.br/blog");
        expect(a.ehInterno()).toBe(true);
        a.initAnalytics();
        expect(config()).toMatchObject({ traffic_type: "internal" });

        a = await abrir("https://vyzon.com.br/?interno=0");
        expect(a.ehInterno()).toBe(false);
    });

    it("marcarInterno (super admin logado) avisa o GA4 uma vez só por página", async () => {
        const a = await abrir("https://vyzon.com.br/orcamentos");
        a.initAnalytics();
        carregarScript();
        a.marcarInterno();
        a.marcarInterno();
        expect(enviados().filter((c) => c[0] === "set" && (c[1] as { traffic_type?: string }).traffic_type === "internal")).toHaveLength(1);
        expect(a.ehInterno()).toBe(true);
    });
});
