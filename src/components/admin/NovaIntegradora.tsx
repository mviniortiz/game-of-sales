// "Nova integradora" (só super admin): empresa + login da dona + convite por
// e-mail + vaga das 10 grátis, num envio só (edge admin-nova-integradora).
// Substitui o "Nova empresa", que criava a empresa sem ninguém dentro.
import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { lerVaga } from "@/lib/fundadora";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import "./admin.css";

type Resposta = { ok: true; company_id: string; numero: number | null; aviso: string | null };

const VAZIO = { empresa: "", email: "", nome: "", whats: "" };

export function NovaIntegradora({ aberto, onFechar, onCriada }: { aberto: boolean; onFechar: () => void; onCriada: () => void }) {
    const [f, setF] = useState(VAZIO);
    const [gratis, setGratis] = useState<boolean | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [pronto, setPronto] = useState<(Resposta & { email: string; empresa: string }) | null>(null);

    const { data: vaga } = useQuery({
        queryKey: ["vagas-fundadora"],
        enabled: aberto,
        queryFn: async () => lerVaga((await supabase.rpc("minha_vaga_fundadora" as never)).data),
    });
    const restam = vaga?.vagas_restantes ?? 0;
    // Com vaga sobrando, o normal hoje é entrar como uma das grátis.
    const vaiGratis = gratis ?? restam > 0;

    const criar = useMutation({
        mutationFn: async (): Promise<Resposta> => {
            const { data, error } = await supabase.functions.invoke("admin-nova-integradora", {
                body: { ...f, fundadora: vaiGratis && restam > 0 },
            });
            // Erro da edge chega em error.context (Response); a mensagem útil está no corpo.
            if (error) {
                const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
                throw new Error(corpo?.error || "Não deu para criar agora.");
            }
            if (!data?.ok) throw new Error(data?.error || "Não deu para criar agora.");
            return data as Resposta;
        },
        onSuccess: (r) => {
            setPronto({ ...r, email: f.email.trim().toLowerCase(), empresa: f.empresa.trim() });
            onCriada();
        },
        onError: (e: Error) => setErro(e.message),
    });

    const fechar = () => {
        if (criar.isPending) return;
        onFechar();
        // Limpa depois da animação de saída do diálogo.
        window.setTimeout(() => {
            setF(VAZIO);
            setGratis(null);
            setErro(null);
            setPronto(null);
            criar.reset();
        }, 200);
    };

    const enviar = (ev: FormEvent) => {
        ev.preventDefault();
        setErro(null);
        if (!f.empresa.trim() || !f.email.trim()) return;
        criar.mutate();
    };

    const campo = (k: keyof typeof VAZIO) => ({
        value: f[k],
        onChange: (ev: React.ChangeEvent<HTMLInputElement>) => setF((v) => ({ ...v, [k]: ev.target.value })),
    });

    return (
        <Dialog open={aberto} onOpenChange={(o) => !o && fechar()}>
            <DialogContent className="va-vars sm:max-w-[440px]">
                {pronto ? (
                    <div className="va-nova__pronto" role="status">
                        <CheckCircle size={28} weight="fill" className="va-nova__ok" aria-hidden />
                        <DialogHeader>
                            <DialogTitle>{pronto.empresa} criada</DialogTitle>
                            <DialogDescription>
                                Convite enviado para {pronto.email}. Ela define a senha pelo link e já entra.
                            </DialogDescription>
                        </DialogHeader>
                        {pronto.numero && <span className="va-chip" data-tom="sol">Fundadora nº {pronto.numero}</span>}
                        {pronto.aviso && <p className="va-nova__aviso">{pronto.aviso}</p>}
                        <p className="va-ajuda">
                            O link vale por 1 hora. Se vencer, ela pede outro em vyzon.com.br/recuperar-senha.
                        </p>
                        <button type="button" className="va-btn va-btn--grande mt-2 w-full" onClick={fechar}>
                            Fechar
                        </button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Nova integradora</DialogTitle>
                            <DialogDescription>Cria a empresa e o login da dona, e manda o e-mail para ela definir a senha.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={enviar} noValidate>
                            <div className="grid gap-3">
                                <label className="va-campo">
                                    <span>Empresa</span>
                                    <input {...campo("empresa")} placeholder="Ex.: Solar Sul Energia" autoFocus required />
                                </label>
                                <label className="va-campo">
                                    <span>E-mail da dona</span>
                                    <input {...campo("email")} type="email" inputMode="email" autoComplete="off" placeholder="nome@empresa.com.br" required />
                                </label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="va-campo">
                                        <span>Nome dela</span>
                                        <input {...campo("nome")} placeholder="Opcional" />
                                    </label>
                                    <label className="va-campo">
                                        <span>WhatsApp</span>
                                        <input {...campo("whats")} type="tel" inputMode="tel" placeholder="(48) 99999-9999" />
                                    </label>
                                </div>
                                <div className="va-campo">
                                    <span id="nova-plano">Plano</span>
                                    <div className="va-escolhas" role="radiogroup" aria-labelledby="nova-plano">
                                        <button type="button" role="radio" aria-checked={vaiGratis && restam > 0} disabled={restam <= 0} onClick={() => setGratis(true)}>
                                            Uma das 10 grátis
                                        </button>
                                        <button type="button" role="radio" aria-checked={!vaiGratis || restam <= 0} onClick={() => setGratis(false)}>
                                            Sem plano
                                        </button>
                                    </div>
                                    <span className="va-ajuda">
                                        {restam > 0
                                            ? `${restam === 1 ? "Resta 1 vaga" : `Restam ${restam} vagas`}. Grátis pra sempre, Lume liberada.`
                                            : "As 10 vagas grátis já foram usadas. Ela entra só com o Raio-X."}
                                    </span>
                                </div>
                            </div>
                            {erro && (
                                <p className="va-nova__erro" role="alert">
                                    {erro}
                                </p>
                            )}
                            <button
                                type="submit"
                                className="va-btn va-btn--grande mt-4 w-full"
                                disabled={!f.empresa.trim() || !f.email.trim() || criar.isPending}
                            >
                                {criar.isPending ? "Criando…" : "Criar e enviar convite"}
                            </button>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
