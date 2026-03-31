// ─── WhatsApp Module Constants & Helpers ─────────────────────────────────

export const PIPELINE_STAGES = [
    { id: "lead", title: "Lead", color: "text-gray-400", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30" },
    { id: "qualification", title: "Qualificação", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
    { id: "proposal", title: "Proposta", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
    { id: "negotiation", title: "Negociação", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30" },
    { id: "closed_won", title: "Ganho", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30" },
    { id: "closed_lost", title: "Perdido", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30" },
];

export const getStageInfo = (stageId: string) =>
    PIPELINE_STAGES.find(s => s.id === stageId) || PIPELINE_STAGES[0];

export const tempColor = (temp: string) => {
    if (temp === "quente") return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    if (temp === "frio") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
};

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export interface CrmDeal {
    id: string;
    title: string;
    value: number;
    stage: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    notes: string | null;
    is_hot: boolean | null;
    probability: number;
    created_at: string;
    user_id: string;
}
