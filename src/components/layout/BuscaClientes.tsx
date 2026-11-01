// Buscar cliente: o ⌘K do app. Procura nos negócios da empresa pelo nome do cliente
// ou do negócio e abre a ficha.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { brl } from "@/lib/quoteText";

type Resultado = { id: string; title: string | null; customer_name: string | null; value: number | null };

// Vírgula e parênteses têm sentido no filtro `or` do PostgREST.
const limpar = (termo: string) => termo.replace(/[%,()]/g, " ").trim();

export function BuscaClientes({ aberta, aoMudar }: { aberta: boolean; aoMudar: (aberta: boolean) => void }) {
    const navigate = useNavigate();
    const { companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const empresa = activeCompanyId || companyId;
    const [termo, setTermo] = useState("");
    const busca = limpar(termo);

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

    const { data, isFetching } = useQuery({
        queryKey: ["busca-clientes", empresa, busca],
        enabled: aberta && !!empresa && busca.length >= 2,
        staleTime: 30_000,
        queryFn: async () => {
            const { data: linhas, error } = await supabase
                .from("deals")
                .select("id, title, customer_name, value")
                .eq("company_id", empresa!)
                .or(`customer_name.ilike.%${busca}%,title.ilike.%${busca}%`)
                .order("updated_at", { ascending: false })
                .limit(8);
            if (error) throw error;
            return (linhas ?? []) as Resultado[];
        },
    });

    const abrir = (id: string) => {
        aoMudar(false);
        navigate(`/deals/${id}`);
    };

    return (
        <CommandDialog open={aberta} onOpenChange={aoMudar}>
            <CommandInput placeholder="Buscar cliente" value={termo} onValueChange={setTermo} />
            <CommandList>
                {busca.length >= 2 && !isFetching && (data ?? []).length === 0 && <CommandEmpty>Nenhum cliente com esse nome.</CommandEmpty>}
                {(data ?? []).length > 0 && (
                    <CommandGroup heading="Clientes">
                        {data!.map((r) => (
                            <CommandItem key={r.id} value={r.id} onSelect={() => abrir(r.id)} className="flex items-center justify-between gap-3">
                                <span className="truncate font-medium">{r.customer_name || r.title || "Sem nome"}</span>
                                {r.value ? <span className="shrink-0 tabular-nums text-muted-foreground">{brl(r.value)}</span> : null}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}
