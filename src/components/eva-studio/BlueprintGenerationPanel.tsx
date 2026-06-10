// EVA.STUDIO.9 — painel "EVA montando o blueprint".
// Explica o processo (lendo contexto, regras, lacunas) antes de revelar o
// blueprint revisável. NÃO esconde loading nem simula processamento longo:
// é a janela curta (700–1200ms) de reveal. Substitui o conteúdo do card de
// blueprint só enquanto isGeneratingBlueprint estiver ativo.
import { ProgressChecklist } from "./evaMotion";
import { INK, SUB, MUTE, PURPLE } from "./tokens";

const STEPS = [
    "Lendo contexto comercial",
    "Verificando regras aplicadas",
    "Identificando pipeline",
    "Detectando campos importantes",
    "Encontrando lacunas de conhecimento",
    "Preparando blueprint revisável",
];

export function BlueprintGenerationPanel({
    mode = "initial",
    durationMs = 1100,
}: { mode?: "initial" | "regenerate"; durationMs?: number }) {
    const title = mode === "regenerate" ? "EVA regenerando sugestão" : "EVA montando o blueprint";
    return (
        <div className="py-1">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)" }}>
                    <span className="w-2.5 h-2.5 rounded-full eva-gen-pulse" style={{ background: `radial-gradient(circle at 35% 30%, #A78BFA, ${PURPLE})` }} />
                </span>
                <p className="text-[14px] font-bold" style={{ color: INK }}>{title}</p>
            </div>
            <p className="text-[11.5px] mb-4" style={{ color: SUB }}>
                Analisando contexto, regras e lacunas para estruturar sua operação.
            </p>
            <div className="rounded-xl p-4" style={{ background: "#FBFAFF", border: "1px solid rgba(124,58,237,0.16)" }}>
                <ProgressChecklist items={STEPS} running durationMs={durationMs} />
            </div>
            <p className="text-[11px] mt-3" style={{ color: MUTE }}>
                A EVA monta uma sugestão inicial. Você revisa antes de aplicar.
            </p>
            {mode === "regenerate" && (
                <p className="text-[11px] mt-1 font-medium" style={{ color: PURPLE }}>
                    Essa sugestão ainda não foi salva.
                </p>
            )}
        </div>
    );
}

export default BlueprintGenerationPanel;
