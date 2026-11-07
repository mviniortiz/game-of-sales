// CONTA.1 (06/11/2026): conta de luz que a Lume leu nesta conversa.
// Fica logo abaixo da proposta no painel. A leitura é interna, então já vale
// para a Lume; o dono confirma, corrige ou descarta aqui. Nada vai pro cliente.
import { useId, useState, type ReactNode } from "react";
import { useContaLuz } from "@/hooks/useContaLuz";
import { CLASSES, numeroDigitado, resumoConta, type CamposConta, type ClasseConta, type ContaLuz } from "@/lib/contaLuz";

const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";
const BTN_SOLID = `inline-flex h-9 md:h-7 items-center rounded-full bg-[var(--vyz-btn-solid)] px-4 md:px-3 text-[13px] md:text-[11.5px] font-semibold text-[var(--vyz-btn-on)] transition-opacity duration-150 ${EASE} hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]`;
const BTN_GHOST = `inline-flex h-9 md:h-7 items-center rounded-full border border-[var(--ibx-line)] bg-[var(--vyz-surface-1)] px-4 md:px-3 text-[13px] md:text-[11.5px] font-semibold text-[var(--vyz-text-strong)] transition-colors duration-150 ${EASE} hover:bg-[var(--ibx-sunken)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]`;
const LINK = "ml-auto -my-2.5 py-2.5 md:m-0 md:p-0 text-[12.5px] md:text-[11.5px] font-medium text-[var(--vyz-text-muted)] underline-offset-2 hover:text-[var(--vyz-text-primary)] hover:underline focus-visible:outline-none focus-visible:underline disabled:opacity-50";
// 16px no celular: abaixo disso o iOS dá zoom no campo.
const INPUT = "h-10 md:h-8 w-full rounded-[8px] border border-[var(--ibx-line)] bg-[var(--vyz-surface-1)] px-2.5 text-[16px] md:text-[12.5px] text-[var(--vyz-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]";

export function ContaLuzCard({ conversationId }: { conversationId: string }) {
    const { conta, revisar } = useContaLuz(conversationId);
    const [editando, setEditando] = useState(false);
    if (!conta) return null;

    const revisada = conta.status === "confirmada" || conta.status === "corrigida";
    return (
        <div className="mx-4 mt-3 rounded-[10px] border border-[var(--ibx-line)] bg-[var(--vyz-surface-1)] px-3 py-2.5">
            <p className="flex items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--vyz-text-muted)]">
                Conta de luz
                <span className="text-[10.5px] font-medium normal-case tracking-normal">
                    {revisada ? (conta.status === "corrigida" ? "corrigida por você" : "confirmada") : `a Lume leu ${conta.fonte === "pdf" ? "o PDF" : "a foto"}`}
                </span>
            </p>

            {editando ? (
                <CorrigirConta
                    conta={conta}
                    salvando={revisar.isPending}
                    onCancelar={() => setEditando(false)}
                    onSalvar={(campos) => revisar.mutate({ id: conta.id, status: "corrigida", campos }, { onSuccess: () => setEditando(false) })}
                />
            ) : (
                <>
                    <p className="mt-1 text-[12.5px] leading-snug text-[var(--vyz-text-strong)]">{resumoConta(conta) || "Sem dados lidos"}</p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                        {!revisada && (
                            <button type="button" disabled={revisar.isPending} onClick={() => revisar.mutate({ id: conta.id, status: "confirmada" })} className={BTN_SOLID}>
                                Confirmar
                            </button>
                        )}
                        <button type="button" disabled={revisar.isPending} onClick={() => setEditando(true)} className={BTN_GHOST}>
                            Corrigir
                        </button>
                        {!revisada && (
                            <button type="button" disabled={revisar.isPending} onClick={() => revisar.mutate({ id: conta.id, status: "descartada" })} className={LINK}>
                                Não é conta de luz
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function CorrigirConta({
    conta,
    salvando,
    onSalvar,
    onCancelar,
}: {
    conta: ContaLuz;
    salvando: boolean;
    onSalvar: (c: CamposConta) => void;
    onCancelar: () => void;
}) {
    const id = useId();
    const [consumo, setConsumo] = useState(conta.consumo_kwh?.toLocaleString("pt-BR") ?? "");
    const [valor, setValor] = useState(conta.valor_reais?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) ?? "");
    const [distribuidora, setDistribuidora] = useState(conta.distribuidora ?? "");
    const [cidade, setCidade] = useState(conta.cidade ?? "");
    const [uf, setUf] = useState(conta.uf ?? "");
    const [classe, setClasse] = useState<ClasseConta | "">(conta.classe ?? "");

    const campos: CamposConta = {
        consumo_kwh: numeroDigitado(consumo),
        valor_reais: numeroDigitado(valor),
        distribuidora: distribuidora.trim() || null,
        cidade: cidade.trim() || null,
        uf: /^[A-Za-z]{2}$/.test(uf.trim()) ? uf.trim().toUpperCase() : null,
        classe: classe || null,
    };
    const vazio = campos.consumo_kwh === null && campos.valor_reais === null;

    const campo = (rotulo: string, input: ReactNode, sufixo: string) => (
        <label htmlFor={`${id}-${sufixo}`} className="block text-[11px] font-medium text-[var(--vyz-text-muted)]">
            {rotulo}
            <span className="mt-0.5 block">{input}</span>
        </label>
    );

    return (
        <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
                e.preventDefault();
                if (!vazio) onSalvar(campos);
            }}
        >
            <div className="grid grid-cols-2 gap-2">
                {campo("Consumo (kWh/mês)", <input id={`${id}-kwh`} inputMode="decimal" value={consumo} onChange={(e) => setConsumo(e.target.value)} className={INPUT} />, "kwh")}
                {campo("Valor da conta (R$)", <input id={`${id}-valor`} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={INPUT} />, "valor")}
                {campo("Distribuidora", <input id={`${id}-dist`} value={distribuidora} onChange={(e) => setDistribuidora(e.target.value)} className={INPUT} />, "dist")}
                {campo(
                    "Tipo",
                    <select id={`${id}-classe`} value={classe} onChange={(e) => setClasse(e.target.value as ClasseConta | "")} className={INPUT}>
                        <option value="">Não sei</option>
                        {CLASSES.map((c) => (
                            <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
                        ))}
                    </select>,
                    "classe",
                )}
            </div>
            <div className="grid grid-cols-[1fr_4.5rem] gap-2">
                {campo("Cidade", <input id={`${id}-cidade`} value={cidade} onChange={(e) => setCidade(e.target.value)} className={INPUT} />, "cidade")}
                {campo("UF", <input id={`${id}-uf`} maxLength={2} value={uf} onChange={(e) => setUf(e.target.value)} className={`${INPUT} uppercase`} />, "uf")}
            </div>
            {vazio && <p className="text-[11.5px] text-[var(--vyz-text-muted)]">Preencha pelo menos o consumo ou o valor.</p>}
            <div className="flex items-center gap-1.5 pt-0.5">
                <button type="submit" disabled={salvando || vazio} className={BTN_SOLID}>
                    Salvar
                </button>
                <button type="button" disabled={salvando} onClick={onCancelar} className={BTN_GHOST}>
                    Cancelar
                </button>
            </div>
        </form>
    );
}
