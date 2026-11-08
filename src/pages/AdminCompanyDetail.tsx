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
import { ArrowLeft, FileMagnifyingGlass, SignIn } from "@phosphor-icons/react";
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
    const [aba, setAba] = useState<"dados" | "equipe">("dados");

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
    const fundadoraAtiva = fundadora && !fundadora.revogada_em;
    // Raio-X da conversa de 20 minutos: lê o WhatsApp conectado da empresa e
    // abre o relatório numa aba nova, pronto pra mostrar na tela.
    const raioX = async () => {
        if (!empresa) return;
        const tab = window.open("about:blank", "_blank");
        const id = toast.loading(`Lendo as conversas de ${empresa.name}…`);
        const { data, error } = await supabase.functions.invoke("raio-x-build", { body: { company_id: empresa.id } });
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
    const entrar = () => {
        if (!empresa) return;
        switchCompany(empresa.id);
        toast.success(`Agora você está em ${empresa.name}.`);
        navigate("/inicio");
    };

    return (
        <div className="vp-tela">
            <div className="va-folha va-entra">
                <button type="button" className="va-voltar" onClick={voltar}>
                    <ArrowLeft size={14} aria-hidden /> Empresas
                </button>

                {isLoading && <div className="va-vazio">Carregando a empresa…</div>}
                {!isLoading && !empresa && <div className="va-vazio">Essa empresa não existe mais.</div>}

                {empresa && (
                    <>
                        <div className="mt-2 flex items-center gap-3">
                            <span className="va-avatar va-avatar--grande" aria-hidden>
                                {empresa.logo_url ? <img src={empresa.logo_url} alt="" /> : iniciais(empresa.name)}
                            </span>
                            <h1 className="va-pagina__titulo min-w-0 truncate">{empresa.name}</h1>
                        </div>

                        {/* Resumo em uma linha, como no detalhe do Astryx */}
                        <p className="va-resumo mt-3">
                            {fundadoraAtiva ? (
                                <span className="va-chip" data-tom="sol">Fundadora nº {fundadora.numero}</span>
                            ) : empresa.subscription_status === "active" ? (
                                <span className="va-chip" data-tom="bom">Pago</span>
                            ) : (
                                <span className="va-chip">Sem plano</span>
                            )}
                            <span>Plano {empresa.plan === "pro" ? "Vyzon" : "Free"}</span>
                            <span>
                                {pessoas.length} {pessoas.length === 1 ? "pessoa" : "pessoas"}
                            </span>
                            <span>Criada em {new Date(empresa.created_at).toLocaleDateString("pt-BR")}</span>
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-[520px]">
                            <button type="button" className="va-btn va-btn--leve" onClick={entrar}>
                                <SignIn size={14} aria-hidden /> Entrar na empresa
                            </button>
                            <button type="button" className="va-btn va-btn--leve" onClick={() => void raioX()}>
                                <FileMagnifyingGlass size={14} aria-hidden /> Gerar Raio-X
                            </button>
                        </div>

                        <div role="tablist" aria-label="Seções da empresa" className="va-abas">
                            <button type="button" role="tab" aria-selected={aba === "dados"} onClick={() => setAba("dados")}>
                                Assinatura e dados
                            </button>
                            <button type="button" role="tab" aria-selected={aba === "equipe"} onClick={() => setAba("equipe")}>
                                Equipe<em>{pessoas.length}</em>
                            </button>
                        </div>

                        {aba === "dados" ? (
                            <form
                                key="dados"
                                className="va-entra grid max-w-[560px] gap-6"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (mudou) salvar.mutate();
                                }}
                            >
                                <section className="va-secao">
                                    <h2 className="va-secao__titulo">Situação</h2>
                                    <div role="radiogroup" aria-label="Situação" className="va-escolhas justify-self-start">
                                        {[
                                            { v: "active", r: "Pago" },
                                            { v: "inactive", r: "Sem plano" },
                                        ].map((o) => (
                                            <button key={o.v} type="button" role="radio" aria-checked={situacao === o.v} onClick={() => setSituacao(o.v)}>
                                                {o.r}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="va-ajuda">
                                        Só Pago libera o plano. Quem assina no cartão o Stripe marca sozinho; aqui é para quem paga por fora.
                                        {fundadora &&
                                            (fundadora.revogada_em
                                                ? ` Foi a fundadora nº ${fundadora.numero} (vaga revogada).`
                                                : ` Fundadora nº ${fundadora.numero}, liberada ao conectar o WhatsApp. Sem plano corta o acesso, mas a vaga continua ocupada até ser revogada.`)}
                                    </p>
                                </section>

                                <section className="va-secao">
                                    <h2 className="va-secao__titulo">Plano</h2>
                                    <div role="radiogroup" aria-label="Plano" className="va-escolhas justify-self-start">
                                        {[
                                            { v: "free", r: "Free" },
                                            { v: "pro", r: "Vyzon (R$ 97)" },
                                        ].map((o) => (
                                            <button key={o.v} type="button" role="radio" aria-checked={plano === o.v} onClick={() => setPlano(o.v)}>
                                                {o.r}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="va-secao">
                                    <h2 className="va-secao__titulo">Dados</h2>
                                    <label className="va-campo">
                                        <span>Nome</span>
                                        <input value={nome} onChange={(e) => setNome(e.target.value)} />
                                    </label>
                                    <div className="va-campo">
                                        <span>Logo</span>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="va-avatar" aria-hidden>
                                                {empresa.logo_url ? <img src={empresa.logo_url} alt="" /> : iniciais(empresa.name)}
                                            </span>
                                            <label className="va-btn va-btn--borda cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-[var(--vyz-accent)]">
                                                <input type="file" accept="image/*" className="sr-only" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />
                                                Escolher imagem
                                            </label>
                                            <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--va-cinza)]">{logo ? logo.name : "PNG ou JPG"}</span>
                                            <button type="button" className="va-btn va-btn--leve" disabled={!logo || enviarLogo.isPending} onClick={() => enviarLogo.mutate()}>
                                                {enviarLogo.isPending ? "Enviando…" : "Enviar logo"}
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                <div className="flex items-center justify-end gap-3 border-t border-[var(--va-fio)] pt-4">
                                    {mudou && <span className="mr-auto text-[12px] text-[var(--va-cinza)]">Alterações não salvas</span>}
                                    <button type="submit" className="va-btn" disabled={!mudou || salvar.isPending || !nome.trim()}>
                                        {salvar.isPending ? "Salvando…" : "Salvar"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <section
                                key="equipe"
                                className="va-tabela va-entra"
                                aria-label="Equipe"
                                style={{ "--va-cols": "minmax(0,1.4fr) minmax(0,1fr)", "--va-cols-cel": "minmax(0,1fr)" } as React.CSSProperties}
                            >
                                <div className="va-tabela__cab" aria-hidden>
                                    <span>Pessoa</span>
                                    <span>Último acesso</span>
                                </div>
                                {pessoas.length === 0 && <div className="va-vazio">Ninguém na equipe ainda.</div>}
                                {pessoas.map((p, i) => (
                                    <div key={p.id} className="va-linha va-entra-linha" style={{ "--i": i } as React.CSSProperties}>
                                        <span className="va-celula">
                                            <span className="va-avatar" data-redondo aria-hidden>
                                                {p.avatar_url ? <img src={p.avatar_url} alt="" /> : iniciais(p.nome)}
                                            </span>
                                            <span className="va-meio">
                                                <b>{p.nome || "Sem nome"}</b>
                                                <span>{p.email}</span>
                                            </span>
                                        </span>
                                        <span
                                            className="va-texto va-texto--cinza"
                                            data-some-no-cel
                                            title={p.last_sign_in_at ? new Date(p.last_sign_in_at).toLocaleString("pt-BR") : "Nunca entrou"}
                                        >
                                            {p.last_sign_in_at ? formatDistanceToNow(new Date(p.last_sign_in_at), { addSuffix: true, locale: ptBR }) : "Nunca entrou"}
                                        </span>
                                    </div>
                                ))}
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminCompanyDetail;
