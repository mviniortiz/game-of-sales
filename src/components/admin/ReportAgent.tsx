import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReportAgent, ReportMessage } from "@/hooks/useReportAgent";
import { EvaChartRenderer } from "@/components/admin/EvaChart";
import { Badge } from "@/components/ui/badge";
import { EvaAvatar } from "@/components/icons/EvaAvatar";
import {
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ArrowUpDown,
  Copy,
  Check,
  ArrowDown,
  Users,
  Target,
  DollarSign,
  Package,
  Zap,
  ChevronRight,
} from "lucide-react";

// ─── Suggestions ───────────────────────────────────────────────────

const SUGGESTIONS = [
  { text: "Quem mais vendeu este mês?", icon: Users },
  { text: "Qual o faturamento do mês atual?", icon: DollarSign },
  { text: "Compare este mês com o anterior", icon: ArrowUpDown },
  { text: "Quais vendedores estão abaixo da meta?", icon: Target },
  { text: "Qual produto vende mais?", icon: Package },
  { text: "Como está a saúde do time?", icon: TrendingUp },
];

const typeConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  insight: { icon: <Sparkles className="h-3 w-3" />, label: "Insight", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  ranking: { icon: <TrendingUp className="h-3 w-3" />, label: "Ranking", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  comparison: { icon: <ArrowUpDown className="h-3 w-3" />, label: "Comparativo", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  alert: { icon: <AlertTriangle className="h-3 w-3" />, label: "Alerta", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  general: { icon: <BarChart3 className="h-3 w-3" />, label: "Análise", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
};

// ─── Markdown renderer ─────────────────────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (!trimmed) {
      elements.push(<div key={i} className="h-1.5" />);
      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={i} className="text-xs font-semibold text-foreground uppercase tracking-wider mt-3 mb-1">
          {parseBold(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={i} className="flex gap-2.5 pl-0.5 py-0.5">
          <span className="text-violet-400/60 mt-[3px] shrink-0 text-[8px]">●</span>
          <span className="text-[13px] leading-relaxed">{parseBold(trimmed.slice(2))}</span>
        </div>
      );
      return;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={i} className="flex gap-2.5 pl-0.5 py-0.5">
          <span className="text-muted-foreground/60 mt-0.5 shrink-0 text-xs tabular-nums font-medium w-4 text-right">
            {numberedMatch[1]}.
          </span>
          <span className="text-[13px] leading-relaxed">{parseBold(numberedMatch[2])}</span>
        </div>
      );
      return;
    }

    elements.push(
      <p key={i} className="text-[13px] leading-relaxed">{parseBold(trimmed)}</p>
    );
  });

  return elements;
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ─── Copy button ───────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/80 text-muted-foreground/50 hover:text-muted-foreground"
      title="Copiar resposta"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ─── Thinking animation ────────────────────────────────────────────

function EvaThinking() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start pl-1"
    >
      <EvaAvatar size={36} thinking />
    </motion.div>
  );
}

// ─── Typing effect hook ────────────────────────────────────────────

function useTypingEffect(fullText: string, shouldAnimate: boolean, onTick?: () => void) {
  const [displayedText, setDisplayedText] = useState(shouldAnimate ? "" : fullText);
  const [isTyping, setIsTyping] = useState(shouldAnimate);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!shouldAnimate || animatedRef.current) {
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    let idx = 0;
    let scrollTick = 0;
    setIsTyping(true);
    setDisplayedText("");

    const interval = setInterval(() => {
      const charsPerTick = Math.random() > 0.7 ? 4 : 2;
      idx = Math.min(idx + charsPerTick, fullText.length);
      setDisplayedText(fullText.slice(0, idx));

      // Auto-scroll every ~10 ticks to avoid excessive calls
      scrollTick++;
      if (scrollTick % 10 === 0) onTick?.();

      if (idx >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
        animatedRef.current = true;
        onTick?.();
      }
    }, 18);

    return () => clearInterval(interval);
  }, [fullText, shouldAnimate]);

  return { displayedText, isTyping };
}

// ─── Message bubble ────────────────────────────────────────────────

function MessageBubble({ message, isLast, onTypingTick }: { message: ReportMessage; isLast: boolean; onTypingTick?: () => void }) {
  const isUser = message.role === "user";
  const config = !isUser && message.type ? typeConfig[message.type] || typeConfig.general : null;
  const shouldAnimate = isLast && !isUser;
  const { displayedText, isTyping } = useTypingEffect(message.content, shouldAnimate, onTypingTick);

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-600/90 px-4 py-2.5 text-[13px] text-white leading-relaxed shadow-sm shadow-violet-900/10">
          {message.content}
        </div>
      </motion.div>
    );
  }

  const textToRender = shouldAnimate ? displayedText : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3 group/msg"
    >
      {/* Eva avatar */}
      <div className="shrink-0 mt-0.5">
        <EvaAvatar size={32} thinking={isTyping} />
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[85%] space-y-2">
        {/* Type badge + "Eva" label */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-violet-400">Eva</span>
          {config && (
            <Badge variant="outline" className={`text-[10px] font-medium gap-1 h-5 ${config.color}`}>
              {config.icon}
              {config.label}
            </Badge>
          )}
        </div>

        {/* Message body */}
        <div className="relative rounded-2xl rounded-tl-sm bg-muted/30 border border-border/30 px-4 py-3.5 text-foreground/90 space-y-1 leading-relaxed">
          {renderMarkdown(textToRender)}
          {isTyping && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              className="inline-block w-[2px] h-3.5 bg-violet-400 ml-0.5 align-middle rounded-full"
            />
          )}
          {!isTyping && (
            <div className="absolute top-2 right-2">
              <CopyButton text={message.content} />
            </div>
          )}
        </div>

        {/* Charts — show after typing completes */}
        {!isTyping && message.charts && message.charts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-2"
          >
            {message.charts.map((chart, i) => (
              <EvaChartRenderer key={i} chart={chart} />
            ))}
          </motion.div>
        )}

        {/* Highlights — show after typing completes */}
        {!isTyping && message.highlights && message.highlights.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-1.5"
          >
            {message.highlights.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/[0.06] border border-violet-500/10 text-[11px] text-muted-foreground font-medium tabular-nums"
              >
                <Zap className="h-2.5 w-2.5 text-violet-400/70" />
                {h}
              </span>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Scroll to bottom ──────────────────────────────────────────────

function ScrollToBottom({ onClick, visible }: { onClick: () => void; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={onClick}
          className="absolute bottom-20 right-4 z-10 flex items-center justify-center h-8 w-8 rounded-full bg-card border border-border/50 shadow-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

// ─── Empty state ───────────────────────────────────────────────────

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      {/* Eva branded icon */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mb-6"
      >
        <EvaAvatar size={56} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-center mb-8"
      >
        <h4 className="text-lg font-semibold text-foreground mb-1">
          Oi! Sou a Eva
        </h4>
        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
          Me pergunte qualquer coisa sobre suas vendas, metas,
          <br />
          vendedores e produtos. Consulto seus dados em tempo real.
        </p>
      </motion.div>

      {/* Suggestion cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl"
      >
        {SUGGESTIONS.map((suggestion, i) => (
          <motion.button
            key={suggestion.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            onClick={() => onSuggestion(suggestion.text)}
            className="group flex items-center gap-3 text-left px-3.5 py-3 rounded-xl border border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-violet-500/[0.04] hover:border-violet-500/20 transition-all"
          >
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted/50 group-hover:bg-violet-500/10 transition-colors shrink-0">
              <suggestion.icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs leading-snug flex-1">{suggestion.text}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-violet-400/50 transition-colors shrink-0" />
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────

export const ReportAgent = () => {
  const { messages, isThinking, remaining, rateLimited, sendQuestion, clearMessages } = useReportAgent();
  const [input, setInput] = useState("");
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isThinking]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distanceFromBottom > 120);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    sendQuestion(input);
    setInput("");
    inputRef.current?.focus();
  };

  const handleSuggestion = (text: string) => {
    sendQuestion(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0 && !isThinking;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 140px)", minHeight: "500px" }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <EvaAvatar size={36} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Eva</h3>
              <Badge variant="outline" className="text-[9px] font-medium bg-violet-500/10 text-violet-400 border-violet-500/20 h-4 px-1.5">
                AI
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isThinking ? "Analisando..." : "Online"}
              {remaining !== null && !isThinking && ` · ${remaining} restantes`}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>

      {/* Chat container */}
      <div className="relative flex-1 rounded-2xl border border-border/40 bg-card/50 overflow-hidden flex flex-col">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {isEmpty ? (
            <EmptyState onSuggestion={handleSuggestion} />
          ) : (
            <AnimatePresence mode="popLayout">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLast={i === messages.length - 1 && msg.role === "assistant"}
                  onTypingTick={scrollToBottom}
                />
              ))}
              {isThinking && <EvaThinking key="thinking" />}
            </AnimatePresence>
          )}
        </div>

        <ScrollToBottom onClick={scrollToBottom} visible={showScrollBtn && !isEmpty} />

        {/* Input */}
        <div className="border-t border-border/30 p-3">
          <div className="flex items-center gap-2 rounded-xl bg-muted/20 border border-border/40 px-3 py-1.5 focus-within:border-violet-500/30 focus-within:bg-muted/30 transition-colors">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={rateLimited ? "Limite diário atingido..." : "Pergunte algo pra Eva..."}
              disabled={rateLimited}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none py-1.5"
              autoComplete="off"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isThinking || rateLimited}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600 text-white transition-all shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
