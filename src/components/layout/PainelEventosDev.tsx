// Painel de eventos do analytics, só no localhost (o AppLayout só monta em DEV,
// então o Vite tira do build). Mostra cada trackApp na hora e se o lote chegou
// ao banco. Serve para validar evento novo sem abrir GA4 nem SQL.
import { useEffect, useState } from "react";
import { onTrackApp, type EventoEspiado } from "@/lib/appAnalytics";

const ROTULO: Record<EventoEspiado["envio"], string> = {
    na_fila: "na fila",
    gravado: "gravado",
    falhou: "não gravou",
    demo: "demo, não grava",
};
const COR: Record<EventoEspiado["envio"], string> = {
    na_fila: "var(--vyz-text-muted)",
    gravado: "var(--vyz-success)",
    falhou: "var(--vyz-danger)",
    demo: "var(--vyz-text-muted)",
};

export default function PainelEventosDev() {
    const [eventos, setEventos] = useState<EventoEspiado[]>([]);
    const [aberto, setAberto] = useState(true);

    useEffect(
        () =>
            onTrackApp((e) =>
                setEventos((lista) => {
                    const i = lista.findIndex((x) => x.id === e.id);
                    if (i >= 0) return lista.map((x) => (x.id === e.id ? e : x));
                    return [e, ...lista].slice(0, 40);
                }),
            ),
        [],
    );

    const ultimoErro = eventos.find((e) => e.envio === "falhou")?.erro;

    return (
        <div
            role="log"
            aria-label="Eventos do analytics (só no localhost)"
            style={{
                position: "fixed",
                left: 12,
                bottom: 12,
                zIndex: 60,
                width: aberto ? 340 : "auto",
                maxHeight: "48vh",
                display: "flex",
                flexDirection: "column",
                background: "var(--vyz-surface-1)",
                color: "var(--vyz-text-primary)",
                border: "1px solid var(--vyz-border)",
                borderRadius: 10,
                boxShadow: "0 1px 2px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.10)",
                font: "12px/1.4 ui-sans-serif, system-ui, sans-serif",
            }}
        >
            <button
                type="button"
                onClick={() => setAberto((v) => !v)}
                aria-expanded={aberto}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    background: "none",
                    border: 0,
                    borderBottom: aberto ? "1px solid var(--vyz-border)" : 0,
                    font: "inherit",
                    fontWeight: 600,
                    color: "inherit",
                    cursor: "pointer",
                    textAlign: "left",
                }}
            >
                Analytics ao vivo
                <span style={{ fontWeight: 400, color: "var(--vyz-text-muted)" }}>
                    {eventos.length} evento{eventos.length === 1 ? "" : "s"}
                </span>
                <span style={{ marginLeft: "auto", fontWeight: 400, color: "var(--vyz-text-muted)" }}>
                    {aberto ? "esconder" : "mostrar"}
                </span>
            </button>
            {aberto && (
                <ol style={{ listStyle: "none", margin: 0, padding: 0, overflowY: "auto" }}>
                    {eventos.length === 0 && (
                        <li style={{ padding: "10px", color: "var(--vyz-text-muted)" }}>
                            Clique pelas telas. Cada ação registrada aparece aqui.
                        </li>
                    )}
                    {eventos.map((e) => {
                        const props = Object.entries(e.props);
                        return (
                            <li key={e.id} style={{ padding: "7px 10px", borderTop: "1px solid var(--vyz-border)" }}>
                                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                                    <code style={{ fontWeight: 600 }}>{e.event}</code>
                                    <span style={{ marginLeft: "auto", color: COR[e.envio], whiteSpace: "nowrap" }}>{ROTULO[e.envio]}</span>
                                </div>
                                <div style={{ color: "var(--vyz-text-muted)" }}>
                                    {e.tela}
                                    {e.aba ? ` / ${e.aba}` : ""}
                                    {props.length > 0 && " · " + props.map(([k, v]) => `${k}: ${String(v)}`).join(", ")}
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
            {aberto && ultimoErro && (
                <p style={{ margin: 0, padding: "7px 10px", borderTop: "1px solid var(--vyz-border)", color: COR.falhou }}>
                    Banco: {ultimoErro}
                </p>
            )}
        </div>
    );
}
