// ─────────────────────────────────────────────────────────────────────────────
// useEvaEntityState — deriva o `state` da EvaEntity a partir da operação, com
// PRECEDÊNCIA explícita pra a EVA nunca piscar entre estados (epiléptica).
//
// Mesma lógica do resto da tela: urgência vence tudo. A EVA não pode parecer
// "calma processando" enquanto tem incêndio.
//
// Prioridade (o de cima vence):
//   1. alert    → criticalCount > 0           (urgência sempre ganha)
//   2. done     → dayComplete && sem crítico   (SÓ por alguns segundos, depois idle)
//   3. thinking → isThinking (refetch/chat)    (só quando NÃO há crítico)
//   4. idle     → padrão
//
// NÃO está plugado ainda. Pra ativar, ver o passo-a-passo no fim do arquivo.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import type { EvaEntityState } from "./EvaEntity";

export interface EvaStateInputs {
    /** nº de ações críticas pendentes (mesma fonte do badge "urgentes"). */
    criticalCount: number;
    /** refetch em curso OU chat da EVA respondendo. */
    isThinking: boolean;
    /** havia ações hoje e todas foram resolvidas. */
    dayComplete: boolean;
    /** quanto tempo o "done" celebra antes de assentar no idle. Default 4s.
     *  A vitória é um MOMENTO, não um estado permanente — senão o verde vira o
     *  novo normal e não comunica mais nada. */
    doneCelebrationMs?: number;
}

export function useEvaEntityState({
    criticalCount,
    isThinking,
    dayComplete,
    doneCelebrationMs = 4000,
}: EvaStateInputs): EvaEntityState {
    const [celebrating, setCelebrating] = useState(false);
    const wasComplete = useRef(false);

    // "done" dispara só na BORDA (acabou de concluir), dura alguns segundos e cai.
    useEffect(() => {
        const complete = dayComplete && criticalCount === 0;
        if (complete && !wasComplete.current) {
            wasComplete.current = true;
            setCelebrating(true);
            const t = window.setTimeout(() => setCelebrating(false), doneCelebrationMs);
            return () => window.clearTimeout(t);
        }
        if (!complete && wasComplete.current) {
            // surgiu pendência nova / crítico — reseta pra poder celebrar de novo depois
            wasComplete.current = false;
            setCelebrating(false);
        }
    }, [dayComplete, criticalCount, doneCelebrationMs]);

    if (criticalCount > 0) return "alert"; // 1. urgência sempre ganha
    if (celebrating) return "done"; // 2. vitória é um momento
    if (isThinking) return "thinking"; // 3. só quando não há crítico
    return "idle"; // 4. padrão
}

// ── Como ativar (depois de aprovar o ritmo em /eva-entity-test) ──────────────
//
// 1) Em src/pages/Inicio.tsx, dentro do componente Inicio (já tem criticalCount
//    e dayComplete; isThinking = refetch + chat respondendo):
//
//      const evaState = useEvaEntityState({
//        criticalCount,
//        isThinking: refreshing || cc.isFetching,   // + chat respondendo (ver nota)
//        dayComplete,
//      });
//
// 2) Passar `evaState` pro DecisionWorkspace (nova prop, ex: evaState) e dele
//    pro EvaPanel, e no header trocar:
//        <EvaEntity size={28} state="idle" />  →  <EvaEntity size={28} state={evaState} />
//
// NOTA sobre o thinking do chat: o "respondendo" vive dentro do EvaChat
// (assistant.state === "loading"), local. Pra o header reagir ao chat, ou
// levantar esse estado pro Inicio, ou começar só com refetch (refreshing /
// cc.isFetching) e somar o chat numa 2ª passada. Refetch já cobre a maior parte.
