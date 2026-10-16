import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarIcon, CheckCircle2, Phone, Mail, MessageSquare, FileText, Loader2 } from "lucide-react";
import { addDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TASK_TYPES = [
    { id: "tarefa", label: "Tarefa", icon: CheckCircle2 },
    { id: "ligacao", label: "Ligar", icon: Phone },
    { id: "reuniao", label: "Reunião", icon: MessageSquare },
    { id: "proposta", label: "Proposta", icon: FileText },
    { id: "email", label: "E-mail", icon: Mail },
] as const;

const PRAZOS = [
    { label: "Hoje", dias: 0 },
    { label: "Amanhã", dias: 1 },
    { label: "Em 2 dias", dias: 2 },
];

const CAMPO = "h-10 rounded-[10px] border-[var(--ibx-line)] bg-[var(--ibx-card)] text-base md:text-sm focus-visible:ring-[var(--vyz-accent)]/30";
const PILL = "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] font-medium border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]";
const PILL_ON = "border-[var(--vyz-text-primary)] bg-[var(--vyz-text-primary)] text-[var(--vyz-btn-on)]";
const PILL_OFF = "border-[var(--ibx-line)] bg-[var(--ibx-card)] text-[var(--vyz-text-strong)] hover:border-[var(--ibx-line-strong)]";

interface NovaTarefaModalProps {
    open: boolean;
    onClose: () => void;
    dealId: string;
    dealTitle?: string;
    onSuccess?: () => void;
}

/** Tarefa do card. Grava em follow_up_reminders, a mesma fila que o sino de
 *  lembretes lê: a tarefa avisa o responsável na hora marcada. */
export const NovaTarefaModal = ({ open, onClose, dealId, dealTitle, onSuccess }: NovaTarefaModalProps) => {
    const { user, companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const queryClient = useQueryClient();
    const effectiveCompanyId = activeCompanyId || companyId;

    const [assunto, setAssunto] = useState("");
    const [descricao, setDescricao] = useState("");
    const [tipo, setTipo] = useState<string>("tarefa");
    const [responsavelId, setResponsavelId] = useState("");
    const [dia, setDia] = useState<Date>(new Date());
    const [horario, setHorario] = useState("09:00");

    useEffect(() => {
        if (open && !responsavelId && user?.id) setResponsavelId(user.id);
    }, [open, responsavelId, user?.id]);

    const { data: equipe } = useQuery({
        queryKey: ["team-members", effectiveCompanyId],
        queryFn: async () => {
            const { data, error } = await supabase.from("profiles").select("id, nome, email").eq("company_id", effectiveCompanyId).order("nome");
            if (error) throw error;
            return data;
        },
        enabled: !!effectiveCompanyId && open,
    });

    const reset = () => {
        setAssunto("");
        setDescricao("");
        setTipo("tarefa");
        setResponsavelId(user?.id ?? "");
        setDia(new Date());
        setHorario("09:00");
    };

    const criar = useMutation({
        mutationFn: async () => {
            const [h, m] = horario.split(":").map(Number);
            const quando = new Date(dia);
            quando.setHours(h || 0, m || 0, 0, 0);
            const { error } = await (supabase as any).from("follow_up_reminders").insert({
                deal_id: dealId,
                company_id: effectiveCompanyId,
                user_id: responsavelId,
                created_by: user?.id ?? null,
                title: assunto.trim(),
                description: descricao.trim() || null,
                task_type: tipo,
                remind_at: quando.toISOString(),
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal-tasks", dealId] });
            queryClient.invalidateQueries({ queryKey: ["reminders"] });
            queryClient.invalidateQueries({ queryKey: ["reminders-upcoming"] });
            toast.success("Tarefa criada");
            reset();
            onSuccess?.();
            onClose();
        },
        onError: (error: Error) => toast.error(`Não deu para criar a tarefa: ${error.message}`),
    });

    const enviar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assunto.trim()) { toast.error("Escreva o que precisa ser feito"); return; }
        if (!responsavelId || !effectiveCompanyId) { toast.error("Escolha o responsável"); return; }
        criar.mutate();
    };

    const hoje = new Date();
    const prazoAtivo = PRAZOS.find((p) => isSameDay(addDays(hoje, p.dias), dia));

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="max-w-[95vw] sm:max-w-[480px] rounded-[18px] border border-[var(--ibx-line)] bg-[var(--ibx-card)] p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-1 text-left">
                    <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">Nova tarefa</DialogTitle>
                    <DialogDescription className="text-[12.5px] text-[var(--vyz-text-muted)]">
                        {dealTitle ? `Para ${dealTitle}` : "Para esta oportunidade"}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={enviar} className="px-5 pb-5 pt-3 space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="tarefa-assunto" className="text-[12.5px] font-medium text-[var(--vyz-text-strong)]">O que precisa ser feito</Label>
                        <Input id="tarefa-assunto" autoFocus value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: mandar a simulação do financiamento" className={CAMPO} />
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-[12.5px] font-medium text-[var(--vyz-text-strong)]">Tipo</p>
                        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo da tarefa">
                            {TASK_TYPES.map((t) => {
                                const Icon = t.icon;
                                const on = tipo === t.id;
                                return (
                                    <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => setTipo(t.id)} className={`${PILL} ${on ? PILL_ON : PILL_OFF}`}>
                                        <Icon className="h-3.5 w-3.5" aria-hidden /> {t.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-[12.5px] font-medium text-[var(--vyz-text-strong)]">Prazo</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {PRAZOS.map((p) => (
                                <button key={p.label} type="button" onClick={() => setDia(addDays(hoje, p.dias))} className={`${PILL} ${prazoAtivo?.dias === p.dias ? PILL_ON : PILL_OFF}`}>
                                    {p.label}
                                </button>
                            ))}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button type="button" className={`${PILL} ${!prazoAtivo ? PILL_ON : PILL_OFF}`}>
                                        <CalendarIcon className="h-3.5 w-3.5" aria-hidden />
                                        {prazoAtivo ? "Outra data" : format(dia, "dd 'de' MMM", { locale: ptBR })}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={dia} onSelect={(d) => d && setDia(d)} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <Input type="time" aria-label="Horário" value={horario} onChange={(e) => setHorario(e.target.value)} className={`${CAMPO} h-8 w-[104px] rounded-full px-3`} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[12.5px] font-medium text-[var(--vyz-text-strong)]">Responsável</Label>
                        <Select value={responsavelId} onValueChange={setResponsavelId}>
                            <SelectTrigger className={CAMPO}><SelectValue placeholder="Escolha quem faz" /></SelectTrigger>
                            <SelectContent>
                                {equipe?.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>{m.id === user?.id ? `${m.nome || m.email} (você)` : m.nome || m.email}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="tarefa-detalhes" className="text-[12.5px] font-medium text-[var(--vyz-text-strong)]">
                            Detalhes <span className="font-normal text-[var(--vyz-text-muted)]">(opcional)</span>
                        </Label>
                        <Textarea id="tarefa-detalhes" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} className={`${CAMPO} h-auto resize-none py-2`} />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={onClose} className="h-10 px-4 rounded-full text-[13px] font-semibold border border-[var(--ibx-line)] text-[var(--vyz-text-primary)] hover:bg-[var(--ibx-paper)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)]">
                            Cancelar
                        </button>
                        <button type="submit" disabled={criar.isPending} className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full text-[13px] font-semibold bg-[var(--vyz-btn-solid)] text-[var(--vyz-btn-on)] hover:opacity-90 disabled:opacity-60 transition-[opacity,transform] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vyz-accent)] focus-visible:ring-offset-2">
                            {criar.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                            Criar tarefa
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
