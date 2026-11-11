// ProspeccaoCard — "Prospecção de hoje" no /inicio.
//
// Só aparece para quem tem prospecção ligada. Mostra, do número conectado agora,
// o lote do dia, quem respondeu, o que a Lume entendeu e o próximo passo de cada
// uma. Não aprova nada aqui: a decisão é no grupo da prospecção no WhatsApp
// (aprovar no app deixava tudo parado). Falha da leitura vira aviso, não tela morta.
import { ordenarItens, type ProspeccaoHoje } from "@/lib/prospeccaoPasso";

const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const DIA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

function quando(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toDateString() === new Date().toDateString() ? HORA.format(d) : DIA.format(d);
}

function formatarNumero(n?: string | null): string {
    const m = String(n || "").match(/^55(\d{2})(\d{4,5})(\d{4})$/);
    return m ? `(${m[1]}) ${m[2]}-${m[3]}` : String(n || "");
}

const LEITURA: Record<string, string> = {
    interesse: "interesse",
    duvida: "abriu a porta",
    automatico: "robô",
    sem_interesse: "sem interesse",
    fora_do_perfil: "fora do perfil",
};

function linhaDoLote(d: ProspeccaoHoje): string | null {
    const l = d.lote;
    if (!l) return null;
    if (l.status === "pendente") {
        return `Lote de hoje com ${l.total} ${l.total === 1 ? "integradora" : "integradoras"} esperando sua aprovação: ${l.code} 1 no grupo`;
    }
    if (l.status === "aprovado") return `Lote de hoje aprovado: ${d.enviados_hoje ?? 0} de ${l.total} já saíram`;
    if (l.status === "recusado") return "Lote de hoje recusado. Nada frio sai hoje";
    return "O lote de hoje expirou sem aprovação";
}

export function ProspeccaoCard({ data, loading, error }: { data?: ProspeccaoHoje; loading: boolean; error?: string | null }) {
    if (error) {
        return (
            <section aria-labelledby="prospeccao-hoje" className="vp-cartao flex min-w-0 flex-col gap-2">
                <h2 id="prospeccao-hoje" className="vp-rotulo">Prospecção de hoje</h2>
                <p role="status" className="text-[13px] text-[var(--vyz-text-muted)]">Não consegui carregar a prospecção agora. O resto da tela segue valendo.</p>
            </section>
        );
    }
    // Carregando não reserva lugar: quase toda conta não tem prospecção ligada, e o
    // bloco de 120px que sumia em seguida puxava "Pedem você" pra cima e pra baixo.
    // O Início segura a lista até isto responder (ver Inicio.tsx).
    if (loading) return null;
    if (!data?.ativo) return null;

    const itens = ordenarItens(data.itens ?? []);
    const agir = itens.filter((i) => i.passo.agir).length;
    const lote = linhaDoLote(data);

    return (
        <section aria-labelledby="prospeccao-hoje" className="vp-cartao flex min-w-0 flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
                <h2 id="prospeccao-hoje" className="vp-rotulo">Prospecção de hoje</h2>
                {data.numero && (
                    <span className="shrink-0 text-[12px] tabular-nums text-[var(--vyz-text-muted)]">número {formatarNumero(data.numero)}</span>
                )}
            </div>

            <div className="rounded-[12px] bg-[var(--vyz-surface-2)] px-4 py-3">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--vyz-text-primary)]">
                    <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${agir > 0 || data.lote?.status === "pendente" ? "bg-[var(--vyz-accent)]" : "bg-[var(--vyz-border-strong)]"}`} />
                    {agir === 0
                        ? "Nenhuma integradora esperando você agora"
                        : agir === 1 ? "1 integradora esperando você" : `${agir} integradoras esperando você`}
                </p>
                <ul className="mt-1.5 flex flex-col gap-1 pl-[15px] text-[13px] text-[var(--vyz-text)]">
                    {data.pausado_ate && <li>Pausada até {DIA.format(new Date(data.pausado_ate))} {HORA.format(new Date(data.pausado_ate))}</li>}
                    {lote && <li>{lote}</li>}
                    {!data.lote && <li>{data.enviados_hoje ? `${data.enviados_hoje} enviadas hoje` : "O lote de hoje chega no grupo às 9h, em dia útil"}</li>}
                    {(data.seguimentos ?? 0) > 0 && (
                        <li>
                            {data.seguimentos} sem resposta ainda
                            {data.proximo_seguimento ? `, o próximo seguimento sai ${DIA.format(new Date(data.proximo_seguimento))}` : ""}
                        </li>
                    )}
                </ul>
            </div>

            {itens.length > 0 ? (
                <ol className="flex flex-col">
                    {itens.map((i) => (
                        <li key={i.id} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-[var(--vyz-border)] py-2.5">
                            <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${i.passo.agir ? "bg-[var(--vyz-accent)]" : "bg-[var(--vyz-border-strong)]"}`} />
                            <div className="min-w-0">
                                <p className="truncate text-[14px] font-medium text-[var(--vyz-text-primary)]">
                                    {i.agency_name || "Integradora"}
                                    {i.city && <span className="font-normal text-[var(--vyz-text-muted)]"> · {i.city}</span>}
                                    {i.reply_kind && LEITURA[i.reply_kind] && (
                                        <span className="font-normal text-[var(--vyz-text-muted)]"> · {LEITURA[i.reply_kind]}</span>
                                    )}
                                </p>
                                {i.last_reply && <p className="mt-0.5 line-clamp-2 text-[13px] text-[var(--vyz-text-muted)]">“{i.last_reply}”</p>}
                                <p className={`mt-1 text-[13px] ${i.passo.agir ? "font-medium text-[var(--vyz-text-primary)]" : "text-[var(--vyz-text-muted)]"}`}>{i.passo.texto}</p>
                            </div>
                            <span className="text-[12px] tabular-nums text-[var(--vyz-text-muted)]">{quando(i.replied_at)}</span>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="text-[13px] text-[var(--vyz-text-muted)]">Ninguém respondeu ainda por este número. Quando responderem, aparece aqui com o próximo passo.</p>
            )}
        </section>
    );
}
