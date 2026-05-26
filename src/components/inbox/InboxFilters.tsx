import { cn } from "@/lib/utils";

// Filtros da Inbox Comercial (F4C.1). Tabs visuais light premium.
// MOCK_F4C: filtragem ainda é client-side simples baseada em metadata stub.
// F4C.2+ pode conectar com campo real (deal.stage, conversation.status, etc).

export type InboxFilterKey =
    | "todos"
    | "novos"
    | "qualificando"
    | "prontos"
    | "demo_marcada"
    | "parados";

export const INBOX_FILTERS: Array<{ key: InboxFilterKey; label: string }> = [
    { key: "todos", label: "Todos" },
    { key: "novos", label: "Novos" },
    { key: "qualificando", label: "Qualificando" },
    { key: "prontos", label: "Prontos" },
    { key: "demo_marcada", label: "Demo marcada" },
    { key: "parados", label: "Parados" },
];

interface InboxFiltersProps {
    active: InboxFilterKey;
    counts?: Partial<Record<InboxFilterKey, number>>;
    onChange: (key: InboxFilterKey) => void;
}

export function InboxFilters({ active, counts, onChange }: InboxFiltersProps) {
    return (
        <div
            className="flex items-center gap-1 overflow-x-auto no-scrollbar px-3 py-2.5"
            style={{ borderBottom: "1px solid #D9E2EC" }}
        >
            {INBOX_FILTERS.map(({ key, label }) => {
                const isActive = active === key;
                const count = counts?.[key];
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key)}
                        className={cn(
                            "relative shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] transition-colors duration-150",
                            isActive
                                ? "text-white"
                                : "text-[#475569] hover:bg-[#EEF2F7]"
                        )}
                        style={{
                            background: isActive ? "#2563EB" : "transparent",
                            fontWeight: isActive ? 600 : 500,
                        }}
                    >
                        {label}
                        {typeof count === "number" && count > 0 && (
                            <span
                                className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] tabular-nums leading-none"
                                style={{
                                    background: isActive ? "rgba(255,255,255,0.22)" : "#E2E8F0",
                                    color: isActive ? "#FFFFFF" : "#64748B",
                                    fontWeight: 600,
                                }}
                            >
                                {count > 99 ? "99+" : count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
