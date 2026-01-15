import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    CalendarIcon,
    Clock,
    CheckCircle2,
    Phone,
    Mail,
    MessageSquare,
    FileText,
    Loader2,
    User,
    Zap,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const TASK_TYPES = [
    { id: "tarefa", label: "Tarefa", icon: CheckCircle2 },
    { id: "ligacao", label: "Ligação", icon: Phone },
    { id: "email", label: "E-mail", icon: Mail },
    { id: "reuniao", label: "Reunião", icon: MessageSquare },
    { id: "proposta", label: "Proposta", icon: FileText },
];

interface NovaTarefaModalProps {
    open: boolean;
    onClose: () => void;
    dealId: string;
    dealTitle?: string;
    onSuccess?: () => void;
}

export const NovaTarefaModal = ({ open, onClose, dealId, dealTitle, onSuccess }: NovaTarefaModalProps) => {
    const { user, companyId } = useAuth();
    const { activeCompanyId } = useTenant();
    const queryClient = useQueryClient();

    const [assunto, setAssunto] = useState("");
    const [descricao, setDescricao] = useState("");
    const [tipoTarefa, setTipoTarefa] = useState("tarefa");
    const [responsavelId, setResponsavelId] = useState("");
    const [dataAgendamento, setDataAgendamento] = useState<Date>(new Date());
    const [horario, setHorario] = useState(format(new Date(), "HH:mm"));
    const [marcarConcluida, setMarcarConcluida] = useState(false);

    const effectiveCompanyId = activeCompanyId || companyId;

    // Fetch team members for responsável
    const { data: teamMembers } = useQuery({
        queryKey: ["team-members", effectiveCompanyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("id, nome, email")
                .eq("company_id", effectiveCompanyId)
                .order("nome");

            if (error) throw error;
            return data;
        },
        enabled: !!effectiveCompanyId && open,
    });

    // Create task mutation
    const createTaskMutation = useMutation({
        mutationFn: async (taskData: any) => {
            const { error } = await supabase.from("deal_tasks" as any).insert(taskData);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deal-tasks", dealId] });
            toast.success("✅ Tarefa criada com sucesso!");
            resetForm();
            onSuccess?.();
            onClose();
        },
        onError: (error: any) => {
            toast.error(`Erro ao criar tarefa: ${error.message}`);
        },
    });

    const resetForm = () => {
        setAssunto("");
        setDescricao("");
        setTipoTarefa("tarefa");
        setResponsavelId("");
        setDataAgendamento(new Date());
        setHorario(format(new Date(), "HH:mm"));
        setMarcarConcluida(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!assunto.trim()) {
            toast.error("Preencha o assunto da tarefa");
            return;
        }

        if (!responsavelId) {
            toast.error("Selecione um responsável");
            return;
        }

        // Combine date and time
        const [hours, minutes] = horario.split(":").map(Number);
        const dueDate = new Date(dataAgendamento);
        dueDate.setHours(hours, minutes, 0, 0);

        createTaskMutation.mutate({
            deal_id: dealId,
            title: assunto,
            description: descricao || null,
            task_type: tipoTarefa,
            assigned_to: responsavelId,
            due_date: dueDate.toISOString(),
            completed: marcarConcluida,
            created_by: user?.id,
            company_id: effectiveCompanyId,
        });
    };

    const SelectedTypeIcon = TASK_TYPES.find(t => t.id === tipoTarefa)?.icon || CheckCircle2;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border border-border">
                <DialogHeader className="pb-4 border-b border-border">
                    <DialogTitle className="flex items-center gap-3 text-foreground">
                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 ring-1 ring-indigo-100 dark:ring-indigo-500/20">
                            <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <span className="text-lg font-semibold">Criar Tarefa</span>
                            <p className="text-[12px] text-muted-foreground font-normal mt-0.5">
                                Agende uma atividade para esta negociação
                            </p>
                        </div>
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Formulário para criar uma nova tarefa
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Negociação (read-only) */}
                    {dealTitle && (
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">Negociação</Label>
                            <div className="h-9 px-3 rounded-md border border-border bg-muted/50 flex items-center text-sm">
                                {dealTitle}
                            </div>
                        </div>
                    )}

                    {/* Assunto */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">
                            Assunto da tarefa <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            value={assunto}
                            onChange={(e) => setAssunto(e.target.value)}
                            placeholder="Ex: Ligar para o cliente"
                            className="h-9"
                            required
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Descrição da tarefa</Label>
                        <Textarea
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Detalhes adicionais..."
                            rows={2}
                            className="resize-none"
                        />
                    </div>

                    {/* Responsável */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Responsável <span className="text-rose-500">*</span>
                        </Label>
                        <Select value={responsavelId} onValueChange={setResponsavelId} required>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Selecione o responsável" />
                            </SelectTrigger>
                            <SelectContent>
                                {teamMembers?.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                        {member.nome}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tipo de Tarefa */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium">
                            Tipo de tarefa <span className="text-rose-500">*</span>
                        </Label>
                        <Select value={tipoTarefa} onValueChange={setTipoTarefa}>
                            <SelectTrigger className="h-9">
                                <SelectValue>
                                    <div className="flex items-center gap-2">
                                        <SelectedTypeIcon className="h-4 w-4" />
                                        {TASK_TYPES.find(t => t.id === tipoTarefa)?.label}
                                    </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {TASK_TYPES.map((type) => {
                                    const TypeIcon = type.icon;
                                    return (
                                        <SelectItem key={type.id} value={type.id}>
                                            <div className="flex items-center gap-2">
                                                <TypeIcon className="h-4 w-4" />
                                                {type.label}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Data e Horário em uma linha */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Data */}
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                Data do agendamento <span className="text-rose-500">*</span>
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal h-9",
                                            !dataAgendamento && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {dataAgendamento
                                            ? format(dataAgendamento, "dd/MM/yyyy", { locale: ptBR })
                                            : "Selecione"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dataAgendamento}
                                        onSelect={(date) => date && setDataAgendamento(date)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Horário */}
                        <div className="space-y-2">
                            <Label className="text-xs font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Horário da tarefa <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                type="time"
                                value={horario}
                                onChange={(e) => setHorario(e.target.value)}
                                className="h-9"
                                required
                            />
                        </div>
                    </div>

                    {/* Marcar como concluída */}
                    <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                            id="marcar-concluida"
                            checked={marcarConcluida}
                            onCheckedChange={(checked) => setMarcarConcluida(checked as boolean)}
                        />
                        <Label
                            htmlFor="marcar-concluida"
                            className="text-sm text-muted-foreground cursor-pointer"
                        >
                            Marcar como concluída ao criar
                        </Label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={createTaskMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
                        >
                            {createTaskMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                "Criar Tarefa"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
