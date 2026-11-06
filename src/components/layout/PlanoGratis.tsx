// Conta sem assinatura (sem teste grátis desde 08/10/2026): o grátis é o Raio-X
// e o placar. A faixa lembra o que falta, só no placar e depois do Raio-X (no
// primeiro minuto ela só atrapalha); o bloqueio cobre as telas em que a Lume
// age (Inbox, funil, Lume Studio...), sempre com o caminho para assinar.
// Fundadora conta como paga: nada disto aparece para ela.
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { EvaBot } from "@/components/eva/EvaBot";
import { useQuoteBoard } from "@/hooks/useQuoteBoard";
import { periodFromParam } from "@/lib/quotePeriod";
import { plural } from "@/lib/quoteText";
import { WhatsAppConnectModal } from "@/components/inbox/WhatsAppConnectModal";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

// Os links de conectar apontam para /inbox?connect=1. Sem assinatura o Inbox não
// abre, então a conexão abre aqui. Do placar, o admin que ainda não fez o Raio-X
// segue sozinho para /raio-x, já com o WhatsApp conectado.
export function ConectarSemPlano() {
    const navigate = useNavigate();
    const location = useLocation();
    const irParaPlacar = () => navigate("/orcamentos", { replace: true });
    const fechar = () => (location.key === "default" ? irParaPlacar() : navigate(-1));

    return (
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
            <EvaBot size={72} state="idle" />
            <h1 className="mt-6 vp-titulo">Conecte seu WhatsApp</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#475569]">É de graça. A Lume lê os últimos 90 dias e monta o seu Raio-X.</p>
            <WhatsAppConnectModal open onClose={fechar} onConnected={irParaPlacar} />
        </div>
    );
}

export function FaixaPlanoGratis() {
    const [params] = useSearchParams();
    // Mesma janela do placar, para a contagem bater com o título dele.
    const parados = useQuoteBoard(periodFromParam(params.get("dias"))).query.data?.totals.parked_count ?? 0;
    return (
        <div className="flex items-center gap-3 border-b border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] px-3 py-2 sm:px-4">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-[var(--vyz-text-muted)]">
                {parados > 0
                    ? `${plural(parados, "orçamento parado", "orçamentos parados")} sem a Lume acompanhando.`
                    : "A Lume ainda não está acompanhando suas propostas."}
                <span className="hidden sm:inline"> Ligada, ela avisa no 2º dia sem resposta e escreve a retomada.</span>
            </p>
            <Link
                to="/upgrade"
                className={`shrink-0 rounded-full text-[13px] font-semibold text-[var(--vyz-text-strong)] underline underline-offset-4 transition-colors duration-150 ${EASE} hover:text-[var(--vyz-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]`}
            >
                Ligar a Lume
            </Link>
        </div>
    );
}

export function TelaDoPlano() {
    return (
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
            <EvaBot size={72} state="idle" />
            <h1 className="mt-6 vp-titulo">Essa parte é do plano Vyzon</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#475569]">
                Com a assinatura, a Lume acompanha cada proposta que sai do seu WhatsApp, avisa no 2º dia sem resposta e te entrega a retomada pronta.
                Você responde 1 e ela sai do seu número.
            </p>
            <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                <Link
                    to="/upgrade"
                    className={`inline-flex h-11 items-center justify-center rounded-full bg-[var(--vyz-accent)] px-6 text-[15px] font-semibold text-white transition-colors duration-150 ${EASE} hover:bg-[var(--vyz-accent-dark)]`}
                >
                    Assinar o Vyzon
                </Link>
                <Link
                    to="/orcamentos"
                    className={`inline-flex h-11 items-center justify-center rounded-full border border-[#D7DEE9] bg-white px-6 text-[15px] font-semibold text-[#1F2A3B] transition-colors duration-150 ${EASE} hover:bg-[#F1F5F9]`}
                >
                    Ver meu placar
                </Link>
            </div>
        </div>
    );
}
