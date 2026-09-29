// Régua de dias do orçamento, usada na tela Orçamentos e na fila "Agora".
import { EXPIRE_DAYS, plural } from "@/lib/quoteText";

// Um tracinho por dia até os 30 em que o orçamento morre: o dono vê quanto
// falta, não uma barra abstrata.
export function DayTicks({ days, className = "hidden sm:flex" }: { days: number; className?: string }) {
  const filled = Math.min(days, EXPIRE_DAYS);
  const tone = filled >= 21 ? "bg-amber-600" : filled >= 8 ? "bg-[var(--vyz-text-muted)]" : "bg-[var(--vyz-text-soft)]";
  return (
    <div
      role="img"
      aria-label={`${plural(filled, "dia", "dias")} de ${EXPIRE_DAYS}. Com ${EXPIRE_DAYS} dias sem o cliente escrever, o orçamento é dado como morto.`}
      title={`${filled} de ${EXPIRE_DAYS} dias`}
      className={`gap-[2px] ${className}`}
    >
      {Array.from({ length: EXPIRE_DAYS }, (_, i) => (
        <span key={i} className={`h-2.5 w-[3px] rounded-[1px] ${i < filled ? tone : "bg-[var(--vyz-border)]"}`} />
      ))}
    </div>
  );
}
