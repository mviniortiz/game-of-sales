import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, MailOpen, Send, RefreshCw, Inbox, User, ArrowLeft, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReceivedEmail {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  message_id?: string;
  cc?: string[];
  reply_to?: string[];
  attachments?: any[];
}

interface EmailDetail extends ReceivedEmail {
  html?: string;
  text?: string;
  headers?: Record<string, string>;
}

const Suporte = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  // List emails
  const { data: listData, isLoading, refetch, isFetching, error: listError } = useQuery({
    queryKey: ["support-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-support-inbox", {
        body: { action: "list", limit: 50 },
      });
      if (error) {
        let msg = "Erro ao listar emails";
        try {
          if (error.context && typeof error.context.json === "function") {
            const body = await error.context.json();
            if (body?.error) msg = body.error;
          }
        } catch {}
        throw new Error(msg);
      }
      console.log("[support-inbox] Resend response:", data);
      if (data?.error) {
        throw new Error(`Resend API: ${data.error}${data.status ? ` (${data.status})` : ""}`);
      }
      return data as { data: ReceivedEmail[]; has_more: boolean };
    },
    refetchInterval: 30_000, // poll every 30s
  });

  // Get single email
  const { data: emailDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["support-inbox", selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data, error } = await supabase.functions.invoke("admin-support-inbox", {
        body: { action: "get", id: selectedId },
      });
      if (error) throw error;
      return data as EmailDetail;
    },
    enabled: !!selectedId,
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!emailDetail) throw new Error("No email selected");
      const body = replyText.replace(/\n/g, "<br>");
      const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;line-height:1.6;">
        ${body}
        <br><br>
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
        <div style="color:#666;font-size:13px;">
          <strong>Vyzon Suporte</strong><br>
          <a href="https://vyzon.com.br" style="color:#00E37A;text-decoration:none;">vyzon.com.br</a>
        </div>
      </div>`;

      const { error } = await supabase.functions.invoke("admin-support-inbox", {
        body: {
          action: "reply",
          to: emailDetail.from,
          subject: emailDetail.subject.startsWith("Re:") ? emailDetail.subject : `Re: ${emailDetail.subject}`,
          html,
          inReplyTo: emailDetail.message_id,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resposta enviada com sucesso!");
      setReplyText("");
      setReplyOpen(false);
      queryClient.invalidateQueries({ queryKey: ["support-inbox"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao enviar resposta");
    },
  });

  const emails = listData?.data || [];
  const selectedEmail = emails.find((e) => e.id === selectedId);

  const formatDate = (iso: string) => {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
    } catch {
      return iso;
    }
  };

  const getInitials = (from: string) => {
    const match = from.match(/^"?([^"<]+)"?\s*</);
    const name = match ? match[1].trim() : from.split("@")[0];
    return name
      .split(" ")
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
  };

  const getFromName = (from: string) => {
    const match = from.match(/^"?([^"<]+)"?\s*<(.+)>$/);
    return match ? { name: match[1].trim(), email: match[2] } : { name: from, email: from };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
            >
              Suporte
            </h1>
            <p className="text-sm mt-1 text-muted-foreground">
              Emails recebidos em suporte@vyzon.com.br
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-border bg-muted/50 hover:bg-muted text-foreground/80"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Inbox layout */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 rounded-2xl overflow-hidden bg-card border border-border"
          style={{ minHeight: "70vh" }}
        >
          {/* Email list */}
          <div className="border-r border-border">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : listError ? (
              <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
                <div className="text-rose-500 dark:text-rose-400 text-sm font-medium mb-2">Erro ao carregar</div>
                <p className="text-xs text-muted-foreground">
                  {(listError as Error).message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-4 border-border bg-muted/50 hover:bg-muted text-foreground/80"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
                <Inbox className="h-12 w-12 mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground/80">
                  Nenhum email ainda
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Os emails enviados para suporte@vyzon.com.br aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {emails.map((email) => {
                  const { name, email: fromEmail } = getFromName(email.from);
                  const isSelected = email.id === selectedId;
                  return (
                    <button
                      key={email.id}
                      onClick={() => {
                        setSelectedId(email.id);
                        setReplyOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        isSelected ? "bg-emerald-500/10" : "hover:bg-muted/60"
                      }`}
                      style={{
                        borderLeft: isSelected ? "2px solid #00E37A" : "2px solid transparent",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
                          style={{
                            background: "linear-gradient(135deg, rgba(0,227,122,0.2), rgba(6,182,212,0.15))",
                          }}
                        >
                          {getInitials(email.from)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate text-foreground">
                              {name}
                            </span>
                            <span className="text-[10px] flex-shrink-0 text-muted-foreground">
                              {formatDate(email.created_at)}
                            </span>
                          </div>
                          <p className="text-xs truncate mt-0.5 text-muted-foreground">
                            {email.subject || "(sem assunto)"}
                          </p>
                          <p className="text-[11px] truncate mt-0.5 text-muted-foreground/70">
                            {fromEmail}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Email detail */}
          <div className="relative">
            {!selectedId ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-6 text-center">
                <MailOpen className="h-14 w-14 mb-4 text-muted-foreground/40" />
                <p className="text-base font-medium text-foreground/70">
                  Selecione um email para ler
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  Lista atualiza automaticamente a cada 30 segundos
                </p>
              </div>
            ) : loadingDetail ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              </div>
            ) : emailDetail ? (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="px-6 py-5 border-b border-border">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden flex items-center gap-1 text-xs mb-3 text-muted-foreground"
                  >
                    <ArrowLeft className="h-3 w-3" /> Voltar
                  </button>
                  <h2
                    className="text-lg font-bold mb-3 text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {emailDetail.subject || "(sem assunto)"}
                  </h2>
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                      style={{
                        background: "linear-gradient(135deg, rgba(0,227,122,0.2), rgba(6,182,212,0.15))",
                      }}
                    >
                      {getInitials(emailDetail.from)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {getFromName(emailDetail.from).name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          &lt;{getFromName(emailDetail.from).email}&gt;
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground">
                        para {emailDetail.to.join(", ")} · {formatDate(emailDetail.created_at)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setReplyOpen((v) => !v)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Reply className="h-3.5 w-3.5 mr-1.5" />
                      Responder
                    </Button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto px-6 py-5">
                  {emailDetail.html ? (
                    <div
                      className="prose dark:prose-invert max-w-none text-sm text-foreground/85"
                      dangerouslySetInnerHTML={{ __html: emailDetail.html }}
                    />
                  ) : emailDetail.text ? (
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground/85">
                      {emailDetail.text}
                    </pre>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      (Email sem conteúdo)
                    </p>
                  )}

                  {emailDetail.attachments && emailDetail.attachments.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-border">
                      <p className="text-xs mb-2 text-muted-foreground">
                        {emailDetail.attachments.length} anexo(s)
                      </p>
                      {emailDetail.attachments.map((att: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg text-xs bg-muted text-foreground/70"
                        >
                          {att.filename} ({att.content_type})
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply composer */}
                <AnimatePresence>
                  {replyOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border overflow-hidden"
                    >
                      <div className="px-6 py-4">
                        <p className="text-xs mb-2 text-muted-foreground">
                          Respondendo para <strong className="text-foreground/80">{getFromName(emailDetail.from).email}</strong>
                        </p>
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Digite sua resposta..."
                          rows={6}
                          className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-emerald-500/50 resize-none"
                        />
                        <div className="flex items-center justify-end gap-2 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyOpen(false);
                              setReplyText("");
                            }}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => replyMutation.mutate()}
                            disabled={!replyText.trim() || replyMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {replyMutation.isPending ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Enviar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Suporte;
