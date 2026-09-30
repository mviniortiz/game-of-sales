// Regras de copy dos posts (CLAUDE.md, regra 4 + checklist anti-"cara de IA"
// do style guide do product film). Erro bloqueia a publicação; aviso só avisa.

const FORBIDDEN = [
    // CLAUDE.md, regra 4
    'crm gamificado',
    'automatize suas vendas',
    'robô que vende sozinho',
    // promessa de autonomia (a saída pro lead é sempre aprovada por humano)
    'vende sozinho',
    'vende sozinha',
    'responde por você',
    'responde sozinha',
    'envia sozinha',
    'sem intervenção humana',
    '100% automático',
    '100% automática',
    // style guide, seção 10
    'revolucione',
    'turbine',
    'potencialize',
    'o futuro de',
];

// ©, ® e ™ entram em Extended_Pictographic mas não são emoji na prática.
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;

export function lintCopy(text) {
    const errors = [];
    const warnings = [];
    if (!text || !text.trim()) return { errors: ['texto vazio'], warnings };

    if (text.includes('—')) errors.push('travessão (—) não entra em copy; troque por vírgula, ponto ou dois-pontos');
    if (/\s–\s/.test(text)) warnings.push('meia-risca ( – ) solta no meio da frase lê como travessão');
    const emoji = text.match(EMOJI);
    if (emoji) errors.push(`emoji não entra em copy (achado: ${emoji[0]})`);

    const lower = text.toLowerCase();
    for (const phrase of FORBIDDEN) {
        if (lower.includes(phrase)) errors.push(`expressão proibida: "${phrase}"`);
    }
    return { errors, warnings };
}

// Contagem ponderada do X (mesma regra do twitter-text v3): URL vale 23,
// caracteres fora das faixas latinas/pontuação valem 2. Limite: 280.
export const X_MAX = 280;
const URL_RE = /https?:\/\/\S+/g;

export function xLength(text) {
    const normalized = text.normalize('NFC');
    const urls = normalized.match(URL_RE) || [];
    let total = urls.length * 23;
    for (const ch of normalized.replace(URL_RE, '')) {
        const cp = ch.codePointAt(0);
        const light = cp <= 4351
            || (cp >= 8192 && cp <= 8205)
            || (cp >= 8208 && cp <= 8223)
            || (cp >= 8242 && cp <= 8247);
        total += light ? 1 : 2;
    }
    return total;
}

export const IG_CAPTION_MAX = 2200;
export const IG_HASHTAG_MAX = 30;

export function countHashtags(text) {
    return (text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) || []).length;
}
