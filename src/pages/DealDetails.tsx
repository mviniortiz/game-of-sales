import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Save,
  Trophy,
  XCircle,
  Check,
  DollarSign,
  User,
  Mail,
  Phone,
  Calendar,
  Plus,
  Send,
  Clock,
  ArrowRight,
  Sparkles,
  FileText,
  History,
  Loader2,
  ChevronRight,
  MessageSquare,
  PhoneCall,
  RefreshCw,
} from "lucide-react";
import { LostDealModal } from "@/components/crm/LostDealModal";
import { syncWonDealToSale } from "@/utils/salesSync";

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: "lead", title: "Lead", shortTitle: "Lead", color: "bg-gray-500" },
  { id: "qualification", title: "Qualificação", shortTitle: "Qualif.", color: "bg-blue-500" },
  { id: "proposal", title: "Proposta", shortTitle: "Prop.", color: "bg-indigo-500" },
  { id: "negotiation", title: "Negociação", shortTitle: "Negoc.", color: "bg-amber-500" },
  { id: "closed_won", title: "Ganho", shortTitle: "Ganho", color: "bg-emerald-500" },
  { id: "closed_lost", title: "Perdido", shortTitle: "Perdido", color: "bg-rose-500" },
];

interface DealActivity {
  id: string;
  activity_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    nome: string;
    avatar_url: string | null;
  };
}

interface DealNote {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    nome: string;
    avatar_url: string | null;
  };
}

export default function DealDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editedDeal, setEditedDeal] = useState<any>(null);

  // Fetch deal details
  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch deal activities (table may not exist yet - using 'as any' for type safety)
  const { data: activities = [] } = useQuery({
    queryKey: ["deal-activities", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deal_activities")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching activities:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Fetch user profiles for activities
      const userIds = [...new Set(data.map((a: any) => a.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

      return data.map((activity: any) => ({
        ...activity,
        profiles: profilesMap.get(activity.user_id),
      })) as DealActivity[];
    },
    enabled: !!id,
  });

  // Fetch deal notes (table may not exist yet - using 'as any' for type safety)
  const { data: notes = [] } = useQuery({
    queryKey: ["deal-notes", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("deal_notes")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
        return [];
      }

      if (!data || data.length === 0) return [];

      // Fetch user profiles for notes
      const userIds = [...new Set(data.map((n: any) => n.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

      return data.map((note: any) => ({
        ...note,
        profiles: profilesMap.get(note.user_id),
      })) as DealNote[];
    },
    enabled: !!id,
  });

  // Initialize edited deal when data loads
  useEffect(() => {
    if (deal && !editedDeal) {
      setEditedDeal(deal);
    }
  }, [deal]);

  // Update deal mutation
  const updateDealMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { syncDeal, ...payload } = updates || {};
      const { error } = await supabase
        .from("deals")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      if (payload.stage === "closed_won" && syncDeal) {
        try {
          await syncWonDealToSale(syncDeal, queryClient);
        } catch (syncError) {
          console.error("Erro ao sincronizar venda do deal:", syncError);
          toast.error("Deal ganho, mas a venda não foi sincronizada.");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-activities", id] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal atualizado!");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar deal");
    },
  });

  // Add note mutation (table may not exist yet - using 'as any')
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await (supabase as any).from("deal_notes").insert({
        deal_id: id,
        user_id: user?.id,
        content,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-notes", id] });
      setNewNote("");
      toast.success("Nota adicionada!");
    },
    onError: () => {
      toast.error("Erro ao adicionar nota");
    },
  });

  // Handle stage change
  const handleStageChange = (newStage: string) => {
    if (newStage === "closed_lost") {
      setShowLostModal(true);
    } else {
      if (!deal) return;
      updateDealMutation.mutate({ stage: newStage, syncDeal: deal });
    }
  };

  // Handle lost deal
  const handleLostDeal = async (reason: string) => {
    await updateDealMutation.mutateAsync({
      stage: "closed_lost",
      loss_reason: reason,
    });
    setShowLostModal(false);
  };

  // Handle won deal
  const handleWonDeal = () => {
    if (!deal) return;
    updateDealMutation.mutate({ stage: "closed_won", syncDeal: deal });
  };

  // Handle save
  const handleSave = () => {
    if (!editedDeal) return;
    updateDealMutation.mutate({
      title: editedDeal.title,
      value: editedDeal.value,
      customer_name: editedDeal.customer_name,
      customer_email: editedDeal.customer_email,
      customer_phone: editedDeal.customer_phone,
      probability: editedDeal.probability,
      expected_close_date: editedDeal.expected_close_date,
      notes: editedDeal.notes,
    });
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "created":
        return <Sparkles className="h-4 w-4 text-indigo-400" />;
      case "stage_changed":
        return <ArrowRight className="h-4 w-4 text-blue-400" />;
      case "won":
        return <Trophy className="h-4 w-4 text-emerald-400" />;
      case "lost":
        return <XCircle className="h-4 w-4 text-rose-400" />;
      case "field_updated":
        return <FileText className="h-4 w-4 text-amber-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4 space-y-4">
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="col-span-8 space-y-4">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!deal) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-rose-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Deal não encontrado</h2>
            <Button onClick={() => navigate("/crm")} variant="outline">
              Voltar ao CRM
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.id === deal.stage);

  return (
    <AppLayout>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <div className="border-b border-border bg-card backdrop-blur-sm sticky top-0 z-10 shadow-sm">
          <div className="px-4 sm:px-6 py-3 sm:py-4">
            {/* Back button and title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/crm")}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted transition-all group h-8 px-2 sm:px-3"
                >
                  <ArrowLeft className="h-4 w-4 sm:mr-2 group-hover:-translate-x-1 transition-transform" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-xl font-bold text-foreground truncate">{deal.title}</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {deal.customer_name} • {formatCurrency(deal.value)}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 sm:gap-3">
                {deal.stage !== "closed_won" && deal.stage !== "closed_lost" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLostModal(true)}
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 h-8 px-2 sm:px-4"
                    >
                      <XCircle className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Perdido</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleWonDeal}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-2 sm:px-4 shadow-sm"
                    >
                      <Trophy className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Ganho</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Pipeline Visualizer - Chevron Stepper */}
            <div className="flex items-center overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              {PIPELINE_STAGES.map((stage, index) => {
                const isActive = stage.id === deal.stage;
                const isPast = index < currentStageIndex;
                const isClosed = stage.id === "closed_won" || stage.id === "closed_lost";
                const isFirst = index === 0;
                const isLast = index === PIPELINE_STAGES.length - 1;

                return (
                  <div key={stage.id} className="flex items-center flex-1 min-w-[60px] sm:min-w-0">
                    <button
                      onClick={() => !isClosed && handleStageChange(stage.id)}
                      disabled={isClosed && !isActive}
                      className={`
                        relative flex-1 py-2 sm:py-2.5 px-2 sm:px-4 text-[10px] sm:text-xs font-semibold transition-all
                        ${isFirst ? "rounded-l-lg" : ""}
                        ${isLast ? "rounded-r-lg" : ""}
                        ${isActive
                          ? stage.id === "closed_won"
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                            : stage.id === "closed_lost"
                              ? "bg-rose-600 text-white shadow-md shadow-rose-500/25"
                              : "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                          : isPast
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }
                        ${isClosed && !isActive ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      <span className="flex items-center justify-center gap-1">
                        {isPast && !isActive && <Check className="h-3 w-3 text-indigo-500 hidden sm:block" />}
                        <span className="sm:hidden">{stage.shortTitle}</span>
                        <span className="hidden sm:inline">{stage.title}</span>
                      </span>
                    </button>
                    {!isLast && (
                      <ChevronRight className={`h-4 sm:h-5 w-4 sm:w-5 -mx-0.5 sm:-mx-1 z-10 flex-shrink-0 ${
                        isPast || isActive ? "text-indigo-500" : "text-muted-foreground/60"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            {/* Left Column - Deal Data */}
            <div className="lg:col-span-4 space-y-4">
              {/* Deal Info Card */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Informações</h3>
                  {!isEditing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-indigo-600 hover:text-indigo-700 h-7 px-2 text-xs"
                    >
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          setEditedDeal(deal);
                        }}
                        className="text-muted-foreground h-7 px-2 text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateDealMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-500 h-7 px-2 text-white shadow-sm"
                      >
                        {updateDealMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Value Hero - Most Important */}
                  <div className="bg-muted rounded-lg p-3 border border-border">
                    {isEditing ? (
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor</Label>
                        <Input
                          type="number"
                          value={editedDeal?.value || 0}
                          onChange={(e) =>
                            setEditedDeal({ ...editedDeal, value: parseFloat(e.target.value) })
                          }
                          className="mt-1 bg-white dark:bg-secondary border-gray-300 dark:border-border text-emerald-600 dark:text-emerald-200 text-xl font-bold"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                          </div>
                          <span className="text-xs text-muted-foreground uppercase">Valor do Deal</span>
                        </div>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-300">
                          {formatCurrency(deal.value)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Título</Label>
                    {isEditing ? (
                      <Input
                        value={editedDeal?.title || ""}
                        onChange={(e) =>
                          setEditedDeal({ ...editedDeal, title: e.target.value })
                        }
                        className="mt-1 h-9 bg-white dark:bg-secondary border-gray-300 dark:border-border text-sm"
                      />
                    ) : (
                      <p className="text-foreground font-medium text-sm mt-0.5">{deal.title}</p>
                    )}
                  </div>

                  {/* Customer Name */}
                  <div>
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Cliente
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editedDeal?.customer_name || ""}
                        onChange={(e) =>
                          setEditedDeal({ ...editedDeal, customer_name: e.target.value })
                        }
                        className="mt-1 h-9 bg-white dark:bg-secondary border-gray-300 dark:border-border text-sm"
                      />
                    ) : (
                      <p className="text-foreground text-sm mt-0.5">{deal.customer_name}</p>
                    )}
                  </div>

                  {/* Email & Phone - Compact Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {isEditing ? (
                        <Input
                          type="email"
                          value={editedDeal?.customer_email || ""}
                          onChange={(e) =>
                            setEditedDeal({ ...editedDeal, customer_email: e.target.value })
                          }
                          placeholder="Email"
                          className="h-7 bg-white dark:bg-secondary border-gray-300 dark:border-border text-xs"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs truncate">
                          {deal.customer_email || "Não informado"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {isEditing ? (
                        <Input
                          value={editedDeal?.customer_phone || ""}
                          onChange={(e) =>
                            setEditedDeal({ ...editedDeal, customer_phone: e.target.value })
                          }
                          placeholder="Telefone"
                          className="h-7 bg-white dark:bg-secondary border-gray-300 dark:border-border text-xs"
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs truncate">
                          {deal.customer_phone || "Não informado"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expected Close Date */}
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-[10px] text-muted-foreground uppercase">Previsão:</span>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editedDeal?.expected_close_date || ""}
                        onChange={(e) =>
                          setEditedDeal({ ...editedDeal, expected_close_date: e.target.value })
                        }
                        className="h-7 bg-white dark:bg-secondary border-gray-300 dark:border-border text-xs flex-1"
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {deal.expected_close_date
                          ? format(new Date(deal.expected_close_date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          : "Não definida"}
                      </span>
                    )}
                  </div>

                  {/* Probability */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[10px] text-slate-500 uppercase tracking-wider">
                        Probabilidade
                      </Label>
                      <span className={`text-sm font-bold ${
                        deal.probability >= 80 ? "text-emerald-400" : "text-indigo-400"
                      }`}>
                        {deal.probability}%
                      </span>
                    </div>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editedDeal?.probability || 50}
                        onChange={(e) =>
                          setEditedDeal({
                            ...editedDeal,
                            probability: parseInt(e.target.value),
                          })
                        }
                        className="h-9 bg-slate-950 border-slate-700 text-sm"
                      />
                    ) : (
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            deal.probability >= 80
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                              : "bg-gradient-to-r from-indigo-600 to-indigo-400"
                          }`}
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Created/Updated Info */}
              <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-4">
                <div className="text-xs text-slate-500 space-y-1">
                  <p>
                    Criado em{" "}
                    {format(new Date(deal.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                  <p>
                    Atualizado em{" "}
                    {format(new Date(deal.updated_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Timeline & Notes */}
            <div className="lg:col-span-8">
              <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/60 rounded-xl overflow-hidden">
                <Tabs defaultValue="notes" className="w-full">
                  <TabsList className="w-full justify-start border-b border-slate-800/60 bg-transparent rounded-none p-0">
                    <TabsTrigger
                      value="notes"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none px-6 py-3"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Anotações
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none px-6 py-3"
                    >
                      <History className="h-4 w-4 mr-2" />
                      Histórico
                    </TabsTrigger>
                  </TabsList>

                  {/* Notes Tab */}
                  <TabsContent value="notes" className="p-5 space-y-4">
                    {/* Add Note - Comment Box Style */}
                    <div className="relative bg-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
                      <Textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Escreva uma anotação sobre este deal..."
                        className="min-h-[100px] bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm text-slate-200 placeholder:text-slate-500"
                      />
                      <div className="flex items-center justify-end px-3 py-2 border-t border-slate-700/30 bg-slate-800/30">
                        <Button
                          onClick={() => newNote.trim() && addNoteMutation.mutate(newNote)}
                          disabled={!newNote.trim() || addNoteMutation.isPending}
                          size="sm"
                          className="bg-indigo-600 hover:bg-indigo-500 h-8 px-4 gap-2"
                        >
                          {addNoteMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Enviar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                      {notes.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhuma anotação ainda</p>
                          <p className="text-xs text-slate-600 mt-1">Adicione notas sobre o progresso deste deal</p>
                        </div>
                      ) : (
                        notes.map((note) => (
                          <div
                            key={note.id}
                            className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/20 hover:border-slate-600/30 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={note.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-[10px]">
                                  {note.profiles?.nome?.substring(0, 2).toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-medium text-white">
                                    {note.profiles?.nome || "Usuário"}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {format(new Date(note.created_at), "dd/MM 'às' HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                  {note.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  {/* History Tab */}
                  <TabsContent value="history" className="p-5">
                    <div className="relative">
                      {activities.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhuma atividade registrada</p>
                          <p className="text-xs text-slate-600 mt-1">O histórico aparecerá aqui conforme o deal evolui</p>
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Vertical Timeline Line */}
                          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500/50 via-slate-700 to-transparent" />
                          
                          <div className="space-y-0">
                            {activities.map((activity, index) => (
                              <div key={activity.id} className="relative flex gap-4 pb-4">
                                {/* Timeline Node */}
                                <div className="relative z-10 flex flex-col items-center">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                                    activity.activity_type === "won" 
                                      ? "bg-emerald-500/20 border-emerald-500/50" 
                                      : activity.activity_type === "lost"
                                        ? "bg-rose-500/20 border-rose-500/50"
                                        : activity.activity_type === "stage_changed"
                                          ? "bg-blue-500/20 border-blue-500/50"
                                          : activity.activity_type === "created"
                                            ? "bg-indigo-500/20 border-indigo-500/50"
                                            : "bg-slate-800 border-slate-700"
                                  }`}>
                                    {getActivityIcon(activity.activity_type)}
                                  </div>
                                </div>

                                {/* Activity Content */}
                                <div className="flex-1 bg-slate-800/20 rounded-lg p-3 border border-slate-700/20 hover:border-slate-600/30 transition-colors -mt-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm text-white leading-relaxed">{activity.description}</p>
                                    {activity.activity_type === "stage_changed" && activity.new_value && (
                                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] rounded-full font-medium whitespace-nowrap">
                                        → {activity.new_value}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Clock className="h-3 w-3 text-slate-500" />
                                    <span className="text-[10px] text-slate-500">
                                      {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", {
                                        locale: ptBR,
                                      })}
                                    </span>
                                    {activity.profiles && (
                                      <>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-[10px] text-slate-500">
                                          {activity.profiles.nome}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lost Deal Modal */}
      <LostDealModal
        open={showLostModal}
        onClose={() => setShowLostModal(false)}
        onConfirm={handleLostDeal}
        dealTitle={deal.title}
      />
    </AppLayout>
  );
}

