// WhatsappDownCard — sem WhatsApp ligado a EVA não vê nada, então o Início diz
// isso antes de qualquer número. Dois casos: a conta nunca conectou, ou
// conectou e a sessão caiu (aí mostra quando chegou a última conversa, que é o
// que o banco sabe de verdade; a hora exata da queda ninguém registra).
import { Link } from "react-router-dom";
import { isDemoSession } from "@/lib/analytics";

const STEPS: Array<{ when: string; text: string }> = [
    { when: "Assim que conectar", text: "A EVA volta a ler cada conversa que chega no seu WhatsApp." },
    { when: "A cada proposta", text: "O orçamento que você mandar, em PDF ou texto, entra no placar com o valor." },
    { when: "Quando o cliente some", text: "A EVA escreve a retomada e manda no seu WhatsApp. Nada sai sem o seu ok." },
];

function shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function WhatsappDownCard({ neverConnected, lastInboundAt }: { neverConnected: boolean; lastInboundAt: string | null }) {
    // Na demo embutida da landing o card quebra a ilusão de operação madura
    // (a conta demo nunca conecta WhatsApp de verdade).
    if (isDemoSession()) return null;

    return (
        <section
            aria-labelledby="whatsapp-down"
            className="rounded-[16px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-6 sm:p-8"
            style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 16px 40px -24px rgba(15,23,42,0.25)" }}
        >
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-700">
                <span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" />
                {neverConnected ? "WhatsApp não conectado" : "WhatsApp desconectado"}
            </p>
            <h2 id="whatsapp-down" className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--vyz-text-primary)]">
                {neverConnected ? "Conecte seu WhatsApp para a EVA começar" : "Reconecte para a EVA voltar a trabalhar"}
            </h2>
            <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-[var(--vyz-text)]">
                {!neverConnected && lastInboundAt ? `A última conversa chegou em ${shortDate(lastInboundAt)}. ` : ""}
                Leva um minuto: você lê um QR code com o celular, igual ao WhatsApp Web.
            </p>

            <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {STEPS.map((s) => (
                    <li key={s.when} className="flex flex-col gap-1 rounded-[12px] bg-[var(--vyz-surface-2)] p-4">
                        <span className="text-[12px] font-semibold text-[var(--vyz-text-muted)]">{s.when}</span>
                        <span className="text-[14px] leading-snug text-[var(--vyz-text-primary)]">{s.text}</span>
                    </li>
                ))}
            </ol>

            <Link
                to="/inbox?connect=1"
                className="mt-6 inline-flex h-11 items-center rounded-full bg-[#0B1220] px-6 text-[14.5px] font-semibold text-white transition-colors duration-150 hover:bg-[#1F2A3B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2"
            >
                {neverConnected ? "Conectar WhatsApp" : "Reconectar WhatsApp"}
            </Link>
        </section>
    );
}
