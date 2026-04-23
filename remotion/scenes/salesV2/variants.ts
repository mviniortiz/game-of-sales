// =====================================================
// VARIANT CONFIGS — scripts, legendas e overlays por ICP
// =====================================================
// Cada variante = ICP diferente + arco narrativo diferente + voz diferente.
// Visual base das cenas é o mesmo; o que muda é voice + subtitles + overlays.
//
// Voiceover scripts ficam em scripts/generate-voiceover.mjs (source of truth
// pra geração). Aqui ficam só as CUES de exibição (subtitles + overlays).

export type VariantName = "brian" | "adam" | "bella" | "matilda";

export interface SubtitleCue {
    from: number;
    to: number;
    text: string;
}

export type OverlayStyle = "metric" | "step" | "pov" | "badge";
export type OverlayPosition = "top-left" | "top-right" | "top-center" | "bottom-center";

export interface OverlayCue {
    from: number;
    to: number;
    label: string;
    value?: string;
    position: OverlayPosition;
    style: OverlayStyle;
    accent?: "brand" | "red" | "gold" | "blue" | "violet";
}

export interface VariantConfig {
    id: VariantName;
    icp: string;
    angle: string;
    subtitles: SubtitleCue[];
    overlays: OverlayCue[];
}

// =====================================================
// BRIAN — Problem → Solution (base corporate)
// =====================================================
const brianConfig: VariantConfig = {
    id: "brian",
    icp: "Sales manager / diretor comercial",
    angle: "Problem → Solution universal",
    subtitles: [
        { from: 12, to: 62, text: "Toda segunda, a mesma história." },
        { from: 64, to: 118, text: "Planilha desatualizada.\nGrupo cobrando número." },
        { from: 202, to: 262, text: "No Vyzon, a conversa do WhatsApp" },
        { from: 264, to: 355, text: "vira oportunidade. Automático." },
        { from: 382, to: 462, text: "Pipeline que se move sozinho." },
        { from: 464, to: 565, text: "Ranking ao vivo pra todo o time." },
        { from: 592, to: 652, text: "Precisa de resposta?" },
        { from: 654, to: 745, text: "A Eva analisa seus dados\nem segundos." },
        { from: 772, to: 852, text: "Resultado?" },
        { from: 854, to: 985, text: "Meta batida,\nvisível pra todos, todo dia." },
        { from: 1012, to: 1072, text: "Em 5 minutos no ar." },
        { from: 1074, to: 1195, text: "14 dias de trial.\nSó cobra depois." },
    ],
    overlays: [],
};

// =====================================================
// ADAM — ROI / autoridade (CFO mindset)
// =====================================================
const adamConfig: VariantConfig = {
    id: "adam",
    icp: "Dono de empresa, CEO, gestor sênior B2B",
    angle: "ROI direto — números que doem",
    subtitles: [
        { from: 10, to: 55, text: "Seu time comercial perde 3 horas\npor dia com planilha." },
        { from: 58, to: 118, text: "Isso custa R$ 12 mil por mês." },
        { from: 200, to: 275, text: "Aqui, cada conversa vira oportunidade." },
        { from: 278, to: 355, text: "Sem trabalho manual." },
        { from: 380, to: 475, text: "Pipeline atualiza sozinho." },
        { from: 478, to: 565, text: "Ranking ao vivo. Time engajado." },
        { from: 590, to: 680, text: "Dado e direção em segundos." },
        { from: 683, to: 745, text: "Sem espera por relatório." },
        { from: 770, to: 870, text: "Resultado? +27% acima da meta." },
        { from: 873, to: 985, text: "Visível pra todos, todo dia." },
        { from: 1010, to: 1090, text: "14 dias pra provar." },
        { from: 1093, to: 1195, text: "Se não valer, não cobra nada." },
    ],
    overlays: [
        // Hook — dano $
        { from: 30, to: 118, label: "Custo escondido", value: "-R$ 12k/mês", position: "top-right", style: "metric", accent: "red" },
        // Pulse — economia tempo
        { from: 210, to: 355, label: "Tempo recuperado", value: "3h/dia", position: "top-right", style: "metric", accent: "brand" },
        // Pipeline — engajamento
        { from: 400, to: 565, label: "Adoção do time", value: "92%", position: "top-right", style: "metric", accent: "brand" },
        // Eva — velocidade
        { from: 600, to: 745, label: "Insight em", value: "< 10s", position: "top-right", style: "metric", accent: "violet" },
        // Dashboard — ROI
        { from: 790, to: 985, label: "Meta", value: "+27%", position: "top-right", style: "metric", accent: "brand" },
        // CTA — garantia
        { from: 1020, to: 1195, label: "Garantia", value: "14 dias", position: "top-center", style: "badge", accent: "brand" },
    ],
};

// =====================================================
// BELLA — Micro-education / tutorial (passo a passo)
// =====================================================
const bellaConfig: VariantConfig = {
    id: "bella",
    icp: "Gestor PME, dono loja local, infoprodutor iniciante",
    angle: "Tutorial de 40 segundos",
    subtitles: [
        { from: 10, to: 65, text: "Como organizar as vendas\nsem planilha?" },
        { from: 68, to: 118, text: "Assim:" },
        { from: 200, to: 275, text: "A conversa do WhatsApp" },
        { from: 278, to: 355, text: "vira card automático." },
        { from: 380, to: 470, text: "Arrasta o card." },
        { from: 473, to: 565, text: "O ranking do time atualiza sozinho." },
        { from: 590, to: 675, text: "Pergunta pra Eva." },
        { from: 678, to: 745, text: "Ela responde com dado." },
        { from: 770, to: 870, text: "Acompanha a meta, todo dia." },
        { from: 873, to: 985, text: "Todo mundo do time vê igual." },
        { from: 1010, to: 1100, text: "E foi isso." },
        { from: 1103, to: 1195, text: "5 minutos no ar.\n14 dias pra testar." },
    ],
    overlays: [
        { from: 8, to: 118, label: "Passo 1", value: "O problema", position: "top-left", style: "step", accent: "brand" },
        { from: 200, to: 355, label: "Passo 2", value: "WhatsApp vira card", position: "top-left", style: "step", accent: "brand" },
        { from: 380, to: 565, label: "Passo 3", value: "Pipeline + ranking", position: "top-left", style: "step", accent: "brand" },
        { from: 590, to: 745, label: "Passo 4", value: "Eva responde", position: "top-left", style: "step", accent: "brand" },
        { from: 770, to: 985, label: "Passo 5", value: "Meta visível", position: "top-left", style: "step", accent: "brand" },
        { from: 1010, to: 1195, label: "Pronto", value: "5 min no ar", position: "top-left", style: "step", accent: "brand" },
    ],
};

// =====================================================
// MATILDA — POV / before-after (autêntico UGC)
// =====================================================
const matildaConfig: VariantConfig = {
    id: "matilda",
    icp: "Infoprodutor, dono de negócio digital, gestor millennial",
    angle: "Before/After em primeira pessoa",
    subtitles: [
        { from: 10, to: 65, text: "Essa era minha segunda-feira." },
        { from: 68, to: 118, text: "Planilha. Grupo. Caos." },
        { from: 200, to: 280, text: "Juro que eu achava" },
        { from: 283, to: 355, text: "que planilha dava conta." },
        { from: 380, to: 470, text: "Daí o pipeline se mexeu sozinho." },
        { from: 473, to: 565, text: "Meu time subiu no ranking.\nLiteral." },
        { from: 590, to: 680, text: "A Eva lê meus dados pra mim." },
        { from: 683, to: 745, text: "Eu só pergunto." },
        { from: 770, to: 870, text: "Hoje bato meta" },
        { from: 873, to: 985, text: "e ainda sobra tempo." },
        { from: 1010, to: 1090, text: "Testa grátis." },
        { from: 1093, to: 1195, text: "Depois me agradece." },
    ],
    overlays: [
        { from: 10, to: 118, label: "antes", position: "top-left", style: "pov", accent: "red" },
        { from: 200, to: 355, label: "depois", position: "top-left", style: "pov", accent: "brand" },
        { from: 380, to: 985, label: "depois", position: "top-left", style: "pov", accent: "brand" },
        { from: 1010, to: 1195, label: "agora", position: "top-left", style: "pov", accent: "brand" },
    ],
};

export const VARIANTS: Record<VariantName, VariantConfig> = {
    brian: brianConfig,
    adam: adamConfig,
    bella: bellaConfig,
    matilda: matildaConfig,
};
