// Empresas (só super admin): quem paga, quem é fundadora, quem sumiu. Clicar na
// linha abre a ficha (plano, situação, logo, equipe); "Entrar" troca para a
// empresa; o menu tem Raio-X e excluir.
// A situação vem de subscription_status (Pago = 'active'), igual ao resto do
// produto. A coluna antiga lia um campo "status" que não existe, e marcava
// todas como "Ativo"; "Produtos" saiu junto com a aba de produtos.
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DotsThree, FileMagnifyingGlass, MagnifyingGlass, Plus, SignIn, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import "./admin.css";

interface Empresa {
    id: string;
    name: string;
    plan: string | null;
    logo_url: string | null;
    subscription_status: string | null;
    created_at: string;
    user_count: number;
    last_sign_in_at: string | null;
    fundadora: number | null;
}

type Filtro = "todas" | "pagas" | "sem" | "paradas";
const SEMANA = 7 * 86_400_000;
const parada = (e: Empresa) => !e.last_sign_in_at || Date.now() - new Date(e.last_sign_in_at).getTime() > SEMANA;
const paga = (e: Empresa) => e.subscription_status === "active";
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function AdminCompanies() {
    const { isSuperAdmin, switchCompany } = useTenant();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const logoBucket = (import.meta.env?.VITE_SUPABASE_LOGO_BUCKET as string | undefined) || "logos";

    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState<Filtro>("todas");
    const [criando, setCriando] = useState(false);
    const [nome, setNome] = useState("");
    const [logo, setLogo] = useState<File | null>(null);
    const [excluindo, setExcluindo] = useState<Empresa | null>(null);

    const { data: empresas = [], isLoading } = useQuery({
        queryKey: ["admin-companies-with-counts"],
        enabled: isSuperAdmin,
        queryFn: async (): Promise<Empresa[]> => {
            const [{ data: cs, error }, { data: ps }, { data: fs }] = await Promise.all([
                supabase.from("companies").select("id, name, plan, logo_url, subscription_status, created_at").order("name"),
                supabase.from("profiles").select("company_id, last_sign_in_at"),
                // Tabela fora dos tipos gerados.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (supabase as any).from("fundadoras").select("company_id, numero, revogada_em"),
            ]);
            if (error) throw error;
            const pessoas = new Map<string, number>();
            const ultimo = new Map<string, string>();
            for (const p of ps ?? []) {
                if (!p.company_id) continue;
                pessoas.set(p.company_id, (pessoas.get(p.company_id) ?? 0) + 1);
                const prev = ultimo.get(p.company_id);
                if (p.last_sign_in_at && (!prev || p.last_sign_in_at > prev)) ultimo.set(p.company_id, p.last_sign_in_at);
            }
            const fundadoras = new Map<string, number>();
            for (const f of (fs ?? []) as { company_id: string; numero: number; revogada_em: string | null }[]) {
                if (!f.revogada_em) fundadoras.set(f.company_id, f.numero);
            }
            return (cs ?? []).map((c) => ({
                ...c,
                user_count: pessoas.get(c.id) ?? 0,
                last_sign_in_at: ultimo.get(c.id) ?? null,
                fundadora: fundadoras.get(c.id) ?? null,
            }));
        },
    });

    const contagem = useMemo(
        () => ({
            todas: empresas.length,
            pagas: empresas.filter(paga).length,
            sem: empresas.filter((e) => !paga(e)).length,
            paradas: empresas.filter(parada).length,
        }),
        [empresas],
    );

    const lista = useMemo(() => {
        const t = sem(busca.trim());
        return empresas.filter(
            (e) =>
                (!t || sem(e.name || "").includes(t)) &&
                (filtro === "todas" || (filtro === "pagas" && paga(e)) || (filtro === "sem" && !paga(e)) || (filtro === "paradas" && parada(e))),
        );
    }, [empresas, busca, filtro]);

    const criar = useMutation({
        mutationFn: async () => {
            let logo_url: string | null = null;
            if (logo) {
                const path = `company-logos/${crypto.randomUUID()}.${logo.name.split(".").pop()}`;
                const { error: up } = await supabase.storage.from(logoBucket).upload(path, logo, { upsert: true });
                if (up) throw up;
                logo_url = supabase.storage.from(logoBucket).getPublicUrl(path).data.publicUrl;
            }
            const { error } = await supabase.from("companies").insert({ name: nome.trim(), plan: "free", logo_url });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Empresa criada.");
            setNome("");
            setLogo(null);
            setCriando(false);
            qc.invalidateQueries({ queryKey: ["admin-companies-with-counts"] });
        },
        onError: (e: Error) => toast.error(e.message || "Não deu para criar a empresa."),
    });

    const excluir = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.rpc("delete_company_cascade", { target_company_id: id });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Empresa excluída.");
            setExcluindo(null);
            qc.invalidateQueries({ queryKey: ["admin-companies-with-counts"] });
        },
        onError: (e: Error) => toast.error(e.message || "Não deu para excluir."),
    });

    const entrar = (e: Empresa) => {
        switchCompany(e.id);
        toast.success(`Agora você está em ${e.name}.`);
    };

    // Raio-X da conversa de 20 minutos: lê o WhatsApp conectado da empresa e
    // abre o relatório numa aba nova, pronto pra mostrar na tela.
    const raioX = async (e: Empresa) => {
        const tab = window.open("about:blank", "_blank");
        const id = toast.loading(`Lendo as conversas de ${e.name}…`);
        const { data, error } = await supabase.functions.invoke("raio-x-build", { body: { company_id: e.id } });
        if (error || !data?.token) {
            tab?.close();
            toast.error("Não deu para gerar o Raio-X", { id, description: data?.error ?? error?.message });
            return;
        }
        toast.success("Raio-X pronto", { id });
        const url = `/relatorio/${data.token}`;
        if (tab) tab.location.href = url;
        else window.location.href = url;
    };

    if (!isSuperAdmin) return <div className="vp-vazio">Só o time do Vyzon vê as empresas.</div>;

    const FILTROS: { id: Filtro; rotulo: string }[] = [
        { id: "todas", rotulo: "Todas" },
        { id: "pagas", rotulo: "Pagas" },
        { id: "sem", rotulo: "Sem plano" },
        { id: "paradas", rotulo: "Sem entrar há 7 dias" },
    ];

    return (
        <div className="va">
            <div className="va-topo">
                <label className="va-busca">
                    <MagnifyingGlass size={16} aria-hidden />
                    <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empresa" aria-label="Buscar empresa" />
                </label>
                <button type="button" className="vp-botao vp-botao--quieto vp-botao--chico" onClick={() => setCriando(true)}>
                    <Plus size={14} weight="bold" aria-hidden /> Nova empresa
                </button>
            </div>

            <div role="radiogroup" aria-label="Filtrar empresas" className="vp-segmento self-start">
                {FILTROS.map((f) => (
                    <button key={f.id} type="button" role="radio" aria-checked={filtro === f.id} onClick={() => setFiltro(f.id)}>
                        {f.rotulo}
                        <em>{contagem[f.id]}</em>
                    </button>
                ))}
            </div>

            <section className="va-lista" aria-label="Empresas">
                {isLoading && <div className="va-vazio">Carregando empresas…</div>}
                {!isLoading && lista.length === 0 && (
                    <div className="va-vazio">
                        <b>Nenhuma empresa aqui</b>
                        {busca ? "Tente outro nome." : "Mude o filtro para ver as outras."}
                    </div>
                )}
                {lista.map((e, i) => (
                    <div
                        key={e.id}
                        role="link"
                        tabIndex={0}
                        data-clicavel
                        className="va-linha va-entra-linha"
                        style={{ "--i": i } as React.CSSProperties}
                        onClick={() => navigate(`/admin/companies/${e.id}`)}
                        onKeyDown={(ev) => ev.key === "Enter" && navigate(`/admin/companies/${e.id}`)}
                        aria-label={`Abrir a ficha de ${e.name}`}
                    >
                        <span className="va-avatar" aria-hidden>
                            {e.logo_url ? <img src={e.logo_url} alt="" /> : (e.name || "?").slice(0, 2).toUpperCase()}
                        </span>
                        <span className="va-meio">
                            <b>{e.name || "Sem nome"}</b>
                            <span>
                                <span className="sm:hidden">{e.fundadora ? `Fundadora nº ${e.fundadora}` : paga(e) ? "Pago" : "Sem plano"} · </span>
                                {e.user_count} {e.user_count === 1 ? "pessoa" : "pessoas"} · criada em {new Date(e.created_at).toLocaleDateString("pt-BR")}
                            </span>
                        </span>
                        <span
                            className="va-lado"
                            data-some-no-cel
                            title={e.last_sign_in_at ? new Date(e.last_sign_in_at).toLocaleString("pt-BR") : "Ninguém entrou ainda"}
                        >
                            {e.last_sign_in_at ? `entrou ${formatDistanceToNow(new Date(e.last_sign_in_at), { addSuffix: true, locale: ptBR })}` : "nunca entrou"}
                        </span>
                        <span className="max-sm:hidden">
                            {e.fundadora ? (
                                <span className="va-chip" data-tom="sol">Fundadora nº {e.fundadora}</span>
                            ) : paga(e) ? (
                                <span className="va-chip" data-tom="bom">Pago</span>
                            ) : (
                                <span className="va-chip">Sem plano</span>
                            )}
                        </span>
                        <button
                            type="button"
                            className="vp-botao vp-botao--quieto vp-botao--chico"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                entrar(e);
                            }}
                        >
                            <SignIn size={14} aria-hidden /> <span className="max-sm:hidden">Entrar</span>
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="vp-icone vp-icone--chico"
                                    aria-label={`Mais ações para ${e.name}`}
                                    onClick={(ev) => ev.stopPropagation()}
                                    onKeyDown={(ev) => ev.stopPropagation()}
                                >
                                    <DotsThree size={20} weight="bold" aria-hidden />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(ev) => ev.stopPropagation()}>
                                <DropdownMenuItem onSelect={() => void raioX(e)}>
                                    <FileMagnifyingGlass size={16} className="mr-2" aria-hidden />
                                    Gerar Raio-X
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setExcluindo(e)} className="text-[var(--vyz-danger)] focus:text-[var(--vyz-danger)]">
                                    <Trash size={16} className="mr-2" aria-hidden />
                                    Excluir empresa
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </section>

            <Dialog open={criando} onOpenChange={setCriando}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Nova empresa</DialogTitle>
                        <DialogDescription>Ela entra sem plano. Para liberar, abra a ficha e marque Pago.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(ev) => {
                            ev.preventDefault();
                            if (nome.trim()) criar.mutate();
                        }}
                    >
                        <label className="vp-campo">
                            <span className="vp-rotulo">Nome</span>
                            <input value={nome} onChange={(ev) => setNome(ev.target.value)} placeholder="Ex.: Solar Sul Energia" autoFocus />
                        </label>
                        <label className="vp-campo">
                            <span className="vp-rotulo">Logo (opcional)</span>
                            <input type="file" accept="image/*" onChange={(ev) => setLogo(ev.target.files?.[0] ?? null)} className="pt-2 text-[14px]" />
                        </label>
                        <button type="submit" className="vp-botao mt-1 w-full disabled:opacity-50" disabled={!nome.trim() || criar.isPending}>
                            {criar.isPending ? "Criando…" : "Criar empresa"}
                        </button>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir {excluindo?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apaga a empresa e os dados dela no Vyzon. Não tem como desfazer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={excluir.isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(ev) => {
                                ev.preventDefault();
                                if (excluindo) excluir.mutate(excluindo.id);
                            }}
                            disabled={excluir.isPending}
                            className="bg-[var(--vyz-danger)] hover:bg-[var(--vyz-danger)] hover:opacity-90"
                        >
                            {excluir.isPending ? "Excluindo…" : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
