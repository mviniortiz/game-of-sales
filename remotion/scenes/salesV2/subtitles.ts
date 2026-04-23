// Subtitle cues — sincronizados com os voiceover tracks.
// Cada cue tem from/to em frames (30fps) e o texto exibido.
// Quebras visuais seguem regra de ~40 chars/linha, 2-3s de exibição.

export interface SubtitleCue {
    from: number;
    to: number;
    text: string;
}

export const SUBTITLE_CUES: SubtitleCue[] = [
    // Hook (0-120) — voice starts ~10
    { from: 12, to: 62, text: "Toda segunda, a mesma história." },
    { from: 64, to: 118, text: "Planilha desatualizada.\nGrupo cobrando número." },

    // Transition (120-180) — silêncio, sem legenda

    // Pulse (180-360) — voice starts ~200
    { from: 202, to: 262, text: "No Vyzon, a conversa do WhatsApp" },
    { from: 264, to: 355, text: "vira oportunidade. Automático." },

    // PipelineRanking (360-570) — voice starts ~380
    { from: 382, to: 462, text: "Pipeline que se move sozinho." },
    { from: 464, to: 565, text: "Ranking ao vivo pra todo o time." },

    // Eva (570-750) — voice starts ~590
    { from: 592, to: 652, text: "Precisa de resposta?" },
    { from: 654, to: 745, text: "A Eva analisa seus dados\nem segundos." },

    // Dashboard (750-990) — voice starts ~770
    { from: 772, to: 852, text: "Resultado?" },
    { from: 854, to: 985, text: "Meta batida,\nvisível pra todos, todo dia." },

    // CTA (990-1200) — voice starts ~1010
    { from: 1012, to: 1072, text: "Em 5 minutos no ar." },
    { from: 1074, to: 1195, text: "14 dias de trial.\nSó cobra depois." },
];
