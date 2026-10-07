import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

// Regras espelhadas de supabase/functions/_shared/whatsappApproval.ts
// (MAX_DRAFT_AGE_HOURS, MAX_NOTIFY_PER_COMPANY_PER_DAY, SEND_WORDS, REJECT_WORDS e o
// mínimo de 12 caracteres para o texto que substitui o rascunho).
const DRAFT_HOURS = 48;
const PER_DAY = 5;

const formatPhone = (jid: string) => {
  const d = jid.split("@")[0].replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("55")) return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12 && d.startsWith("55")) return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return `+${d}`;
};

/** Para onde vão os rascunhos da EVA e como responder. Só leitura: o número é descoberto sozinho. */
export default function Aprovacao() {
  const { companyId } = useAuth();
  const { activeCompanyId } = useTenant();
  const company = activeCompanyId || companyId;

  const q = useQuery({
    queryKey: ["config-aprovacao", company],
    enabled: !!company,
    queryFn: async () => {
      const [conn, pending] = await Promise.all([
        supabase
          .from("channel_connections")
          .select("status, metadata")
          .eq("company_id", company!)
          .eq("provider", "evolution")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("agent_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("company_id", company!)
          .eq("status", "pending"),
      ]);
      const meta = (conn.data?.metadata ?? {}) as { owner_jid?: string };
      return {
        connected: conn.data?.status === "active",
        owner: meta.owner_jid ? formatPhone(meta.owner_jid) : null,
        pending: pending.count ?? 0,
      };
    },
  });

  const card = "rounded-[14px] border border-[var(--vyz-border)] bg-[var(--vyz-surface-1)] p-5";

  return (
    <div className="space-y-4">
      <section className={card} aria-labelledby="aprov-numero">
        <h2 id="aprov-numero" className="text-[13px] font-medium text-[var(--vyz-text-muted)]">Os rascunhos chegam no número</h2>
        {q.isLoading ? (
          <div className="mt-2 h-7 w-56 rounded-md bg-[var(--vyz-surface-2)] animate-pulse motion-reduce:animate-none" />
        ) : q.data?.owner ? (
          <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-[-0.02em] text-[var(--vyz-text-primary)]">{q.data.owner}</p>
        ) : (
          <p className="mt-1 text-[14px] text-[var(--vyz-text)]">
            {q.data?.connected
              ? "Ainda não identificado. O número aparece aqui sozinho depois da próxima mensagem enviada pelo WhatsApp conectado."
              : "Nenhum WhatsApp conectado."}{" "}
            {!q.data?.connected && (
              <Link to="/inbox?connect=1" className="font-medium text-[var(--vyz-accent)] underline-offset-2 hover:underline">
                Conectar agora
              </Link>
            )}
          </p>
        )}
        <p className="mt-2 text-[12.5px] text-[var(--vyz-text-muted)]">
          É o próprio número da empresa conectado ao Vyzon. A EVA escreve para ele como uma conversa sua consigo mesmo.
        </p>
        {!!q.data?.pending && (
          <p className="mt-3 inline-flex rounded-full bg-[var(--vyz-accent-soft-10)] px-3 py-1 text-[12.5px] font-medium text-[var(--vyz-accent)]">
            {q.data.pending} {q.data.pending === 1 ? "rascunho esperando" : "rascunhos esperando"} a sua resposta
          </p>
        )}
      </section>

      <section className={card} aria-labelledby="aprov-como">
        <h2 id="aprov-como" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">Como responder</h2>
        <ol className="mt-3 space-y-3 text-[13.5px] text-[var(--vyz-text)]">
          <li className="flex gap-3">
            <Key>1</Key>
            <span>Envia a mensagem para o cliente do jeito que a EVA escreveu. Também vale "ok" ou "sim".</span>
          </li>
          <li className="flex gap-3">
            <Key>2</Key>
            <span>Descarta o rascunho; nada sai para o cliente. Também vale "não" ou "cancela".</span>
          </li>
          <li className="flex gap-3">
            <Key>Aa</Key>
            <span>Uma mensagem sua, com pelo menos 12 caracteres, substitui o rascunho e é o que vai para o cliente.</span>
          </li>
        </ol>
        <p className="mt-4 text-[12.5px] text-[var(--vyz-text-muted)]">
          Cada rascunho traz um código curto; com mais de um esperando, comece a resposta pelo código.
        </p>
      </section>

      <section className={card} aria-labelledby="aprov-regras">
        <h2 id="aprov-regras" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--vyz-text-primary)]">Regras fixas</h2>
        <ul className="mt-3 space-y-2 text-[13.5px] text-[var(--vyz-text)]">
          <li>Nada é enviado ao cliente sem a sua resposta.</li>
          <li>Rascunho sem resposta em {DRAFT_HOURS} horas expira e nunca é enviado.</li>
          <li>No máximo {PER_DAY} rascunhos por dia chegam no seu WhatsApp, para não virar ruído.</li>
        </ul>
      </section>
    </div>
  );
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="grid h-7 min-w-7 shrink-0 place-items-center rounded-[8px] border border-[var(--vyz-border-strong)] bg-[var(--vyz-surface-2)] px-1.5 font-sans text-[12.5px] font-semibold text-[var(--vyz-text-primary)]">
      {children}
    </kbd>
  );
}
