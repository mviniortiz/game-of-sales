// Lembretes: o sino da lateral. Agrupa em Atrasados, Hoje e Próximos, mostra
// o cliente primeiro (é o que a pessoa procura) e o horário em português.
// Concluir some da lista na hora, com Desfazer; Adiar joga pra amanhã às 9h.
import { useMemo, useState } from "react";
import { Bell, Check, Clock } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useReminders, useReminderMutations, type Reminder } from "@/hooks/useReminders";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { amanhaNove, grupoDo, quandoTexto, type GrupoLembrete } from "@/lib/lembretes";
import "./lembretes.css";

const GRUPOS: { id: GrupoLembrete; titulo: string }[] = [
    { id: "atrasado", titulo: "Atrasados" },
    { id: "hoje", titulo: "Hoje" },
    { id: "proximo", titulo: "Próximos" },
];

export function ReminderBell() {
    const { user, companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const empresa = activeCompanyId || companyId;
    const navigate = useNavigate();
    const [aberto, setAberto] = useState(false);
    // Some da lista assim que a pessoa marca, sem esperar o banco.
    const [escondidos, setEscondidos] = useState<Set<string>>(new Set());

    const { data: lembretes = [] } = useReminders(user?.id, empresa);
    const { completeReminder, snoozeReminder, reopenReminder } = useReminderMutations(user?.id, empresa);

    const agora = new Date();
    const visiveis = lembretes.filter((r) => !escondidos.has(r.id));
    const porGrupo = useMemo(() => {
        const g: Record<GrupoLembrete, Reminder[]> = { atrasado: [], hoje: [], proximo: [] };
        for (const r of visiveis) g[grupoDo(r.remind_at)].push(r);
        return g;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lembretes, escondidos]);

    const atrasados = porGrupo.atrasado.length;
    const pendentes = atrasados + porGrupo.hoje.length;

    const esconder = (id: string, sim: boolean) =>
        setEscondidos((s) => {
            const n = new Set(s);
            if (sim) n.add(id);
            else n.delete(id);
            return n;
        });

    const concluir = (r: Reminder) => {
        esconder(r.id, true);
        completeReminder.mutate(r.id, {
            onError: () => {
                esconder(r.id, false);
                toast.error("Não deu para concluir. Tente de novo.");
            },
        });
        toast.success("Lembrete concluído", {
            action: {
                label: "Desfazer",
                onClick: () => {
                    esconder(r.id, false);
                    reopenReminder.mutate(r.id);
                },
            },
        });
    };

    const adiar = (r: Reminder) => {
        esconder(r.id, true);
        snoozeReminder.mutate(
            { id: r.id, remindAt: amanhaNove().toISOString() },
            {
                onSettled: () => esconder(r.id, false),
                onError: () => toast.error("Não deu para adiar. Tente de novo."),
            },
        );
        toast.success("Adiado para amanhã às 9h");
    };

    const resumo =
        visiveis.length === 0
            ? "Nada pendente"
            : [
                  atrasados && `${atrasados} ${atrasados === 1 ? "atrasado" : "atrasados"}`,
                  porGrupo.hoje.length && `${porGrupo.hoje.length} hoje`,
                  porGrupo.proximo.length && `${porGrupo.proximo.length} ${porGrupo.proximo.length === 1 ? "próximo" : "próximos"}`,
              ]
                  .filter(Boolean)
                  .join(" · ");

    return (
        <Popover open={aberto} onOpenChange={setAberto}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="vz-lateral__icone vz-lemb-gatilho"
                    aria-label={pendentes ? `Lembretes: ${pendentes} para agora` : "Lembretes"}
                    title="Lembretes"
                >
                    <Bell size={18} weight={pendentes ? "fill" : "regular"} aria-hidden />
                    {pendentes > 0 && (
                        <span className="vz-lemb-conta" data-atrasado={atrasados > 0 || undefined} aria-hidden>
                            {pendentes > 9 ? "9+" : pendentes}
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent align="start" side="right" sideOffset={10} className="vz-lemb w-[340px] p-0">
                <div className="vz-lemb__cab">
                    <p className="vz-lemb__titulo">Lembretes</p>
                    <p className="vz-lemb__resumo">{resumo}</p>
                </div>

                {visiveis.length === 0 ? (
                    <div className="vz-lemb__vazio">
                        <Check size={20} weight="bold" aria-hidden />
                        <p>Nada para lembrar agora.</p>
                        <span>Crie lembretes na ficha do cliente.</span>
                    </div>
                ) : (
                    <div className="vz-lemb__lista">
                        {GRUPOS.filter((g) => porGrupo[g.id].length > 0).map((g) => (
                            <section key={g.id} className="vz-lemb__grupo" data-grupo={g.id}>
                                <p className="vz-lemb__grupo-titulo">{g.titulo}</p>
                                <ul>
                                    {porGrupo[g.id].map((r) => (
                                        <li key={r.id} className="vz-lemb__item">
                                            <button
                                                type="button"
                                                className="vz-lemb__check"
                                                aria-label={`Concluir: ${r.title}`}
                                                onClick={() => concluir(r)}
                                            >
                                                <Check size={11} weight="bold" aria-hidden />
                                            </button>
                                            <button
                                                type="button"
                                                className="vz-lemb__corpo"
                                                onClick={() => {
                                                    setAberto(false);
                                                    navigate(`/deals/${r.deal_id}`);
                                                }}
                                            >
                                                <span className="vz-lemb__cliente">{r.deal_title || r.title}</span>
                                                {r.deal_title && <span className="vz-lemb__oque">{r.title}</span>}
                                            </button>
                                            <span className="vz-lemb__quando">{quandoTexto(r.remind_at, agora)}</span>
                                            <button
                                                type="button"
                                                className="vz-lemb__adiar"
                                                aria-label={`Adiar para amanhã às 9h: ${r.title}`}
                                                title="Adiar para amanhã às 9h"
                                                onClick={() => adiar(r)}
                                            >
                                                <Clock size={15} aria-hidden />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
