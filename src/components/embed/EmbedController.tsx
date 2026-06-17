import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// LP.8 (v2) — controlador da demo embutida. Roda DENTRO do iframe (app real) e
// recebe comandos da landing (parent) por postMessage, restritos à MESMA origem
// e a uma allowlist (navegar/destacar). Mostra o cursor fantasma da EVA se
// movendo até o item da sidebar e "clicando", + selo "Live". Sem executar nada
// arbitrário: só react-router navigate pra rotas conhecidas.
const NAV_URL: Record<string, string> = {
    inicio: "/inicio",
    pipeline: "/pipeline",
    "eva-studio": "/eva-studio",
    inbox: "/inbox",
    metas: "/metas",
    ranking: "/ranking",
    configuracoes: "/configuracoes",
};

// rótulos pro "flash" de feedback no mobile (sidebar colapsada, sem alvo p/ cursor)
const SCREEN_FLASH: Record<string, string> = {
    inicio: "Central de Comando",
    pipeline: "Pipeline",
    "eva-studio": "Configurar agente",
    inbox: "Inbox",
    metas: "Metas",
    ranking: "Ranking",
    lead: "Detalhe do lead",
};

export function EmbedController() {
    const navigate = useNavigate();
    const [pos, setPos] = useState({ x: -120, y: -120 });
    const [visible, setVisible] = useState(false);
    const [clicking, setClicking] = useState(false);
    const [flash, setFlash] = useState<{ label: string; n: number } | null>(null);
    const timers = useRef<number[]>([]);
    const flashN = useRef(0);
    const flashTimer = useRef<number | null>(null);

    const clearTimers = () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; };

    useEffect(() => {
        const moveTo = (selector: string): boolean => {
            const el = document.querySelector(selector) as HTMLElement | null;
            if (!el) return false;
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return false;
            // precisa estar VISÍVEL na viewport — no mobile a sidebar fica
            // off-canvas (rect não-zero, porém fora da tela) → cai no flash
            const onScreen = r.right > 4 && r.bottom > 4 && r.left < window.innerWidth - 4 && r.top < window.innerHeight - 4;
            if (!onScreen) return false;
            setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
            setVisible(true);
            return true;
        };

        // feedback de "abrindo" pra quando não há alvo de cursor (mobile)
        const showFlash = (label: string) => {
            flashN.current += 1;
            setFlash({ label, n: flashN.current });
            if (flashTimer.current) clearTimeout(flashTimer.current);
            flashTimer.current = window.setTimeout(() => setFlash(null), 1900);
        };

        const onMsg = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            const d = e.data;
            if (!d || d.source !== "vyzon-demo" || d.action !== "goto" || !d.screen) return;
            // enquanto está na rota de auto-login, ignora (o reload vai pro /inicio)
            if (window.location.pathname.startsWith("/embed-demo")) return;

            // "lead" = abrir o detalhe de uma oportunidade (/deals/:id). Usa o
            // 1º card visível (cursor "clica" nele) ou busca o 1º deal no banco.
            if (d.screen === "lead") {
                clearTimers();
                const openDeal = (id: string) => {
                    const has = moveTo("[data-demo-deal]");
                    if (!has) showFlash(SCREEN_FLASH.lead);
                    timers.current.push(window.setTimeout(() => {
                        if (has) { setClicking(true); timers.current.push(window.setTimeout(() => setClicking(false), 240)); }
                        navigate(`/deals/${id}`);
                    }, has ? 760 : 0));
                };
                const domId = (document.querySelector("[data-demo-deal]") as HTMLElement | null)?.getAttribute("data-demo-deal");
                if (domId) openDeal(domId);
                else supabase.from("deals").select("id").limit(1).maybeSingle().then(({ data }) => { if (data?.id) openDeal(String(data.id)); });
                return;
            }

            const url = NAV_URL[d.screen as string];
            if (!url) return;
            clearTimers();
            const hasTarget = moveTo(`[data-demo-nav="${url}"]`);
            if (hasTarget) {
                timers.current.push(window.setTimeout(() => {
                    setClicking(true);
                    timers.current.push(window.setTimeout(() => setClicking(false), 240));
                    navigate(url);
                }, 760));
            } else {
                showFlash(SCREEN_FLASH[d.screen as string] || (d.screen as string));
                navigate(url);
            }
        };

        window.addEventListener("message", onMsg);
        try { window.parent?.postMessage({ source: "vyzon-demo", event: "ready", path: window.location.pathname }, window.location.origin); } catch { /* noop */ }
        return () => { window.removeEventListener("message", onMsg); clearTimers(); if (flashTimer.current) clearTimeout(flashTimer.current); };
    }, [navigate]);

    return (
        <>
            {/* selo Live */}
            <div
                style={{ position: "fixed", top: 14, right: 16, zIndex: 2147483600, display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(13,20,33,0.10)", boxShadow: "0 6px 18px -8px rgba(13,20,33,0.3)", fontSize: 11.5, fontWeight: 600, color: "#0B1220", pointerEvents: "none", backdropFilter: "blur(4px)" }}
                aria-hidden="true"
            >
                <span style={{ width: 7, height: 7, borderRadius: 999, background: "#e5484d", boxShadow: "0 0 0 0 rgba(229,72,77,0.5)", animation: "vzLivePulse 1.6s ease-out infinite" }} />
                Live
            </div>

            {/* cursor fantasma da EVA */}
            <div
                style={{ position: "fixed", left: 0, top: 0, transform: `translate(${pos.x}px, ${pos.y}px)`, transition: "transform 0.72s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease", zIndex: 2147483600, pointerEvents: "none", opacity: visible ? 1 : 0, willChange: "transform" }}
                aria-hidden="true"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 2px 4px rgba(13,20,33,0.35))" }}>
                    <path d="M5 2.5 L19.5 11 L12.5 12.3 L9.2 19 Z" fill="#0B1220" stroke="#ffffff" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                <span
                    style={{ position: "absolute", left: 2, top: 2, width: 18, height: 18, borderRadius: 999, border: "2px solid #2563EB", transform: clicking ? "scale(1.9)" : "scale(0.3)", opacity: clicking ? 0.85 : 0, transition: "transform 0.24s ease, opacity 0.24s ease" }}
                />
            </div>

            {/* flash de "abrindo" — feedback quando não há cursor (mobile) */}
            {flash && (
                <div key={"g" + flash.n} style={{ position: "fixed", inset: 0, zIndex: 2147483598, pointerEvents: "none", animation: "vzFlashGlow 1.3s ease both" }} aria-hidden="true" />
            )}
            {flash && (
                <div
                    key={flash.n}
                    style={{ position: "fixed", top: 14, left: "50%", zIndex: 2147483600, pointerEvents: "none", display: "flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 999, background: "rgba(11,18,32,0.92)", color: "#fff", fontSize: 12.5, fontWeight: 600, boxShadow: "0 10px 28px -10px rgba(13,20,33,0.55)", backdropFilter: "blur(4px)", animation: "vzFlash 1.9s ease both" }}
                    aria-hidden="true"
                >
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: "#00E37A" }} />
                    EVA · {flash.label}
                </div>
            )}

            <style>{`
                @keyframes vzLivePulse { 0% { box-shadow: 0 0 0 0 rgba(229,72,77,0.5); } 70% { box-shadow: 0 0 0 6px rgba(229,72,77,0); } 100% { box-shadow: 0 0 0 0 rgba(229,72,77,0); } }
                @keyframes vzFlash { 0% { opacity: 0; transform: translate(-50%, -10px); } 14% { opacity: 1; transform: translate(-50%, 0); } 82% { opacity: 1; transform: translate(-50%, 0); } 100% { opacity: 0; transform: translate(-50%, -6px); } }
                @keyframes vzFlashGlow { 0% { box-shadow: inset 0 0 0 0 rgba(21,86,192,0); } 32% { box-shadow: inset 0 0 70px 0 rgba(21,86,192,0.16); } 100% { box-shadow: inset 0 0 0 0 rgba(21,86,192,0); } }
            `}</style>
        </>
    );
}
