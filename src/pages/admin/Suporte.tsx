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
  const { data: listData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["support-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-support-inbox", {
        body: { action: "list", limit: 50 },
      });
      if (error) throw error;
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
          <a href="https://vyzon.com.br" style="color:#10b981;text-decoration:none;">vyzon.com.br</a>
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
    <div className="min-h-screen" style={{ background: "#06080a" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: "rgba(255,255,255,0.95)", fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
            >
              Suporte
            </h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              Emails recebidos em suporte@vyzon.com.br
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Inbox layout */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
            minHeight: "70vh",
          }}
        >
          {/* Email list */}
          <div
            className="border-r"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 px-6 text-center">
                <Inbox className="h-12 w-12 mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Nenhum email ainda
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Os emails enviados para suporte@vyzon.com.br aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
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
                        isSelected ? "bg-emerald-500/10" : "hover:bg-white/[0.03]"
                      }`}
                      style={{
                        borderLeft: isSelected ? "2px solid #10b981" : "2px solid transparent",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                          style={{
                            background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.15))",
                            color: "#6ee7b7",
                          }}
                        >
                          {getInitials(email.from)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-sm font-medium truncate"
                              style={{ color: "rgba(255,255,255,0.9)" }}
                            >
                              {name}
                            </span>
                            <span className="text-[10px] flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                              {formatDate(email.created_at)}
                            </span>
                          </div>
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{ color: "rgba(255,255,255,0.55)" }}
                          >
                            {email.subject || "(sem assunto)"}
                          </p>
                          <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
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
                <MailOpen className="h-14 w-14 mb-4" style={{ color: "rgba(255,255,255,0.15)" }} />
                <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Selecione um email para ler
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
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
                <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden flex items-center gap-1 text-xs mb-3"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    <ArrowLeft className="h-3 w-3" /> Voltar
                  </button>
                  <h2
                    className="text-lg font-bold mb-3"
                    style={{ color: "rgba(255,255,255,0.95)", fontFamily: "var(--font-heading)" }}
                  >
                    {emailDetail.subject || "(sem assunto)"}
                  </h2>
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                      style={{
                        background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(6,182,212,0.15))",
                        color: "#6ee7b7",
                      }}
                    >
                      {getInitials(emailDetail.from)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.9)" }}>
                          {getFromName(emailDetail.from).name}
                        </span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          &lt;{getFromName(emailDetail.from).email}&gt;
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
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
                      className="prose prose-invert max-w-none text-sm"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                      dangerouslySetInnerHTML={{ __html: emailDetail.html }}
                    />
                  ) : emailDetail.text ? (
                    <pre
                      className="whitespace-pre-wrap text-sm font-sans"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {emailDetail.text}
                    </pre>
                  ) : (
                    <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.4)" }}>
                      (Email sem conteúdo)
                    </p>
                  )}

                  {emailDetail.attachments && emailDetail.attachments.length > 0 && (
                    <div className="mt-6 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {emailDetail.attachments.length} anexo(s)
                      </p>
                      {emailDetail.attachments.map((att: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-lg text-xs"
                          style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)" }}
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
                      className="border-t overflow-hidden"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <div className="px-6 py-4">
                        <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Respondendo para <strong style={{ color: "rgba(255,255,255,0.8)" }}>{getFromName(emailDetail.from).email}</strong>
                        </p>
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Digite sua resposta..."
                          rows={6}
                          className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 focus-visible:ring-1 focus-visible:ring-emerald-500/50 resize-none"
                        />
                        <div className="flex items-center justify-end gap-2 mt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyOpen(false);
                              setReplyText("");
                            }}
                            className="text-white/60 hover:text-white hover:bg-white/5"
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
