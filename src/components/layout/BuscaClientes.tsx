// Buscar cliente: o ⌘K do app. A lista de negócios da empresa vem uma vez ao abrir
// (são dezenas, no máximo centenas) e cada tecla filtra na memória, sem esperar o
// banco. Acha por nome do cliente, nome do negócio ou telefone, sem ligar pra acento.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { brl } from "@/lib/quoteText";
import { formatPhone } from "@/lib/formatPhone";
import { buscarClientes, nomeDo, trechoAchado, type ClienteBusca } from "@/lib/buscaClientes";
import "./buscaClientes.css";

function Nome({ texto, consulta }: { texto: string; consulta: string }) {
    const t = trechoAchado(texto, consulta);
    if (!t) return <>{texto}</>;
    return (
        <>
            {texto.slice(0, t[0])}
            <mark>{texto.slice(t[0], t[1])}</mark>
            {texto.slice(t[1])}
        </>
    );
}

export function BuscaClientes({ aberta, aoMudar }: { aberta: boolean; aoMudar: (aberta: boolean) => void }) {
    const navigate = useNavigate();
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const empresa = activeCompanyId || companyId;
    const [termo, setTermo] = useState("");

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                aoMudar(!aberta);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [aberta, aoMudar]);

    useEffect(() => {
        if (!aberta) setTermo("");
    }, [aberta]);

    const { data: lista, isLoading } = useQuery({
        queryKey: ["busca-clientes-indice", empresa],
        enabled: aberta && !!empresa,
        staleTime: 60_000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("deals")
                .select("id, title, customer_name, customer_phone, value, updated_at")
                .eq("company_id", empresa!)
                .order("updated_at", { ascending: false })
                .limit(2000);
            if (error) throw error;
            return (data ?? []) as ClienteBusca[];
        },
    });

    const achados = useMemo(() => buscarClientes(lista ?? [], termo), [lista, termo]);
    const vazio = !!termo.trim() && !isLoading && achados.length === 0;

    const abrir = (id: string) => {
        aoMudar(false);
        navigate(`/deals/${id}`);
    };

    return (
        <CommandDialog
            open={aberta}
            onOpenChange={aoMudar}
            commandProps={{ shouldFilter: false, loop: true }}
            contentClassName="vz-buscac max-w-[560px]"
        >
            <CommandInput placeholder="Nome, negócio ou telefone" value={termo} onValueChange={setTermo} />
            <CommandList className="vz-buscac__lista">
                {isLoading && <p className="vz-buscac__aviso">Carregando clientes…</p>}
                {vazio && <CommandEmpty>Nenhum cliente com “{termo.trim()}”.</CommandEmpty>}
                {!isLoading && (lista ?? []).length === 0 && !termo.trim() && (
                    <p className="vz-buscac__aviso">Nenhum cliente ainda. Eles aparecem aqui quando entram no funil.</p>
                )}
                {achados.length > 0 && (
                    <CommandGroup heading={termo.trim() ? "Clientes" : "Recentes"}>
                        {achados.map((r) => {
                            const nome = nomeDo(r);
                            const detalhe = [
                                r.title && r.title !== nome ? r.title : null,
                                r.customer_phone ? formatPhone(r.customer_phone) : null,
                            ]
                                .filter(Boolean)
                                .join(" · ");
                            return (
                                <CommandItem key={r.id} value={r.id} onSelect={() => abrir(r.id)} className="vz-buscac__item">
                                    <span className="vz-buscac__inicial" aria-hidden>
                                        {nome.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="vz-buscac__meio">
                                        <span className="vz-buscac__nome">
                                            <Nome texto={nome} consulta={termo} />
                                        </span>
                                        {detalhe && <span className="vz-buscac__detalhe">{detalhe}</span>}
                                    </span>
                                    {r.value ? <span className="vz-buscac__valor">{brl(r.value)}</span> : null}
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                )}
            </CommandList>
            <div className="vz-buscac__rodape" aria-hidden>
                <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
                <span><kbd>Enter</kbd> abrir</span>
                <span><kbd>Esc</kbd> fechar</span>
            </div>
        </CommandDialog>
    );
}
