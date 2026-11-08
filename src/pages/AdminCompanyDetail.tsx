// Ficha da empresa (super admin), aberta pela aba Empresas de Resultados.
// Aqui fica a marcação manual de Pago para quem paga por fora (o Stripe marca
// sozinho quem assina no cartão), o nome, a logo e quem está na equipe.
// Os produtos saíram daqui junto com a aba de produtos (07/10/2026); os dados
// continuam no banco.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, SignIn } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import "@/components/admin/admin.css";

interface Company {
    id: string;
    name: string;
    plan: string | null;
    logo_url: string | null;
    subscription_status: string | null;
    created_at: string;
}

interface Pessoa {
    id: string;
    nome: string | null;
    email: string | null;
    avatar_url: string | null;
    last_sign_in_at: string | null;
}

const iniciais = (s: string | null | undefined) => (s || "?").trim().slice(0, 2).toUpperCase();

export const AdminCompanyDetail = () => {
    const { companyId } = useParams<{ companyId: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { isAdmin } = useAuth();
    const { switchCompany } = useTenant();
    const logoBucket = (import.meta.env?.VITE_SUPABASE_LOGO_BUCKET as string | undefined) || "logos";

    const [nome, setNome] = useState("");
    const [plano, setPlano] = useState("free");
    const [situacao, setSituacao] = useState("inactive");
    const [logo, setLogo] = useState<File | null>(null);

    const { data: empresa, isLoading } = useQuery({
        queryKey: ["company-detail", companyId],
        enabled: !!companyId && isAdmin,
        queryFn: async () => {
            const { data, error } = await supabase.from("companies").select("*").eq("id", companyId!).maybeSingle();
            if (error) throw error;
            return data as Company | null;
        },
    });

    // Vaga das primeiras integradoras (conceder_fundadora, ao conectar o WhatsApp).
    // Só leitura: revogar é no SQL (ver a migration 20261104_fundadoras_sozinhas).
    const { data: fundadora } = useQuery({
        queryKey: ["fundadora", companyId],
        enabled: !!companyId && isAdmin,
        queryFn: async () => {
            // Tabela nova, fora dos tipos gerados.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase as any)
                .from("fundadoras")
                .select("numero, concedida_em, revogada_em")
                .eq("company_id", companyId)
                .maybeSingle();
            return (data as { numero: number; concedida_em: string; revogada_em: string | null } | null) ?? null;
        },
    });

    const { data: pessoas = [] } = useQuery({
        queryKey: ["company-users", companyId],
        enabled: !!companyId && isAdmin,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, nome, email, avatar_url, last_sign_in_at")
                .eq("company_id", companyId!)
                .order("nome");
            if (error) throw error;
            return (data ?? []) as Pessoa[];
        },
    });

    useEffect(() => {
        if (!empresa) return;
        setNome(empresa.name || "");
        setPlano(empresa.plan || "free");
        setSituacao(empresa.subscription_status === "active" ? "active" : "inactive");
    }, [empresa]);

    const mudou =
        !!empresa &&
        (nome.trim() !== (empresa.name || "") ||
            plano !== (empresa.plan || "free") ||
            situacao !== (empresa.subscription_status === "active" ? "active" : "inactive"));

    const invalidar = () => {
        qc.invalidateQueries({ queryKey: ["company-detail", companyId] });
        qc.invalidateQueries({ queryKey: ["admin-companies-with-counts"] });
    };

    const salvar = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from("companies")
                .update({ name: nome.trim(), plan: plano, subscription_status: situacao })
                .eq("id", companyId!);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Empresa atualizada.");
            invalidar();
        },
        onError: (e: Error) => toast.error(e.message || "Não deu para salvar."),
    });

    const enviarLogo = useMutation({
        mutationFn: async () => {
            if (!logo) throw new Error("Escolha uma imagem.");
            const path = `company-logos/${companyId}-${crypto.randomUUID()}.${logo.name.split(".").pop()}`;
            const { error: up } = await supabase.storage.from(logoBucket).upload(path, logo, { upsert: true });
            if (up) throw up;
            const url = supabase.storage.from(logoBucket).getPublicUrl(path).data.publicUrl;
            const { error } = await supabase.from("companies").update({ logo_url: url }).eq("id", companyId!);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Logo atualizada.");
            setLogo(null);
            invalidar();
        },
        onError: (e: Error) => toast.error(e.message || "Não deu para enviar a logo."),
    });

    if (!isAdmin) return <div className="vp-vazio">Só administradores acessam.</div>;

    const voltar = () => navigate("/admin?aba=empresas");

    return (
        <div className="vp-tela va va-entra">
            <button type="button" className="vp-botao vp-botao--quieto vp-botao--chico justify-self-start" onClick={voltar}>
                <ArrowLeft size={14} aria-hidden /> Empresas
            </button>

            {isLoading && <div className="vp-vazio">Carregando a empresa…</div>}
            {!isLoading && !empresa && <div className="vp-vazio">Essa empresa não existe mais.</div>}

            {empresa && (
                <>
                    <header className="vp-cabeca !mb-0 !items-center">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="va-avatar !h-14 !w-14 !rounded-2xl !text-[17px]" aria-hidden>
                                {empresa.logo_url ? <img src={empresa.logo_url} alt="" /> : iniciais(empresa.name)}
                            </span>
                            <div className="min-w-0">
                                <h1 className="vp-titulo truncate">{empresa.name}</h1>
                                <p className="vp-sub !mt-1 flex flex-wrap items-center gap-2">
                                    {fundadora && !fundadora.revogada_em ? (
                                        <span className="va-chip" data-tom="sol">Fundadora nº {fundadora.numero}</span>
                                    ) : empresa.subscription_status === "active" ? (
                                        <span className="va-chip" data-tom="bom">Pago</span>
                                    ) : (
                                        <span className="va-chip">Sem plano</span>
                                    )}
                                    <span>
                                        Criada em {new Date(empresa.created_at).toLocaleDateString("pt-BR")} · {pessoas.length}{" "}
                                        {pessoas.length === 1 ? "pessoa" : "pessoas"}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="vp-botao vp-botao--chico"
                            onClick={() => {
                                switchCompany(empresa.id);
                                toast.success(`Agora você está em ${empresa.name}.`);
                                navigate("/inicio");
                            }}
                        >
                            <SignIn size={14} aria-hidden /> Entrar na empresa
                        </button>
                    </header>

                    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <form
                            className="vp-cartao grid gap-5"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (mudou) salvar.mutate();
                            }}
                        >
                            <div className="grid gap-2">
                                <p className="vp-rotulo">Situação</p>
                                <div role="radiogroup" aria-label="Situação" className="vp-segmento self-start">
                                    {[
                                        { v: "active", r: "Pago" },
                                        { v: "inactive", r: "Sem plano" },
                                    ].map((o) => (
                                        <button key={o.v} type="button" role="radio" aria-checked={situacao === o.v} onClick={() => setSituacao(o.v)}>
                                            {o.r}
                                        </button>
                                    ))}
                                </div>
                                <p className="vp-campo__ajuda">
                                    Só Pago libera o plano. Quem assina no cartão o Stripe marca sozinho; aqui é para quem paga por fora.
                                    {fundadora &&
                                        (fundadora.revogada_em
                                            ? ` Foi a fundadora nº ${fundadora.numero} (vaga revogada).`
                                            : ` Fundadora nº ${fundadora.numero}, liberada ao conectar o WhatsApp. Sem plano corta o acesso, mas a vaga continua ocupada até ser revogada.`)}
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <p className="vp-rotulo">Plano</p>
                                <div role="radiogroup" aria-label="Plano" className="vp-segmento self-start">
                                    {[
                                        { v: "free", r: "Free" },
                                        { v: "pro", r: "Vyzon (R$ 97)" },
                                    ].map((o) => (
                                        <button key={o.v} type="button" role="radio" aria-checked={plano === o.v} onClick={() => setPlano(o.v)}>
                                            {o.r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="vp-campo !mb-0">
                                <span className="vp-rotulo">Nome</span>
                                <input value={nome} onChange={(e) => setNome(e.target.value)} />
                            </label>

                            <div className="flex items-center justify-end gap-2 border-t border-[var(--vyz-border-subtle)] pt-4">
                                {mudou && <span className="mr-auto text-[13px] text-[var(--vyz-text-muted)]">Alterações não salvas</span>}
                                <button type="submit" className="vp-botao disabled:opacity-50" disabled={!mudou || salvar.isPending || !nome.trim()}>
                                    {salvar.isPending ? "Salvando…" : "Salvar"}
                                </button>
                            </div>
                        </form>

                        <div className="grid gap-4">
                            <section className="vp-cartao grid gap-3">
                                <p className="vp-rotulo">Logo</p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="va-avatar !h-12 !w-12" aria-hidden>
                                        {empresa.logo_url ? <img src={empresa.logo_url} alt="" /> : iniciais(empresa.name)}
                                    </span>
                                    <label className="vp-botao vp-botao--quieto vp-botao--chico cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-[var(--vyz-accent)]">
                                        <input type="file" accept="image/*" className="sr-only" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
                                        Escolher imagem
                                    </label>
                                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--vyz-text-muted)]">{logo ? logo.name : "PNG ou JPG"}</span>
                                    <button
                                        type="button"
                                        className="vp-botao vp-botao--quieto vp-botao--chico disabled:opacity-50"
                                        disabled={!logo || enviarLogo.isPending}
                                        onClick={() => enviarLogo.mutate()}
                                    >
                                        {enviarLogo.isPending ? "Enviando…" : "Enviar logo"}
                                    </button>
                                </div>
                            </section>

                            <section className="va-lista" aria-label="Equipe">
                                <p className="va-lista__cab">
                                    Equipe <span>{pessoas.length}</span>
                                </p>
                                {pessoas.length === 0 && <div className="va-vazio">Ninguém na equipe ainda.</div>}
                                {pessoas.map((p, i) => (
                                    <div key={p.id} className="va-linha va-entra-linha" style={{ "--i": i } as React.CSSProperties}>
                                        <span className="va-avatar" data-redondo aria-hidden>
                                            {p.avatar_url ? <img src={p.avatar_url} alt="" /> : iniciais(p.nome)}
                                        </span>
                                        <span className="va-meio">
                                            <b>{p.nome || "Sem nome"}</b>
                                            <span>{p.email}</span>
                                        </span>
                                        <span className="va-lado" title={p.last_sign_in_at ? new Date(p.last_sign_in_at).toLocaleString("pt-BR") : "Nunca entrou"}>
                                            {p.last_sign_in_at
                                                ? formatDistanceToNow(new Date(p.last_sign_in_at), { addSuffix: true, locale: ptBR })
                                                : "nunca entrou"}
                                        </span>
                                    </div>
                                ))}
                            </section>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminCompanyDetail;
