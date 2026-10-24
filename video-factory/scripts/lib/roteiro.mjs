// Roteiro do filme (films/<slug>/roteiro.json) é a fonte única de tempo:
// o mix posiciona cada frase e efeito por ele, e as legendas da tela também.
// Toda âncora é uma batida da trilha: t = FASE + beat · BATIDA + offset.
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";

export function carregar(arquivo) {
    const r = JSON.parse(readFileSync(arquivo, "utf8"));
    r._dir = dirname(resolve(arquivo));
    const home = process.env.HOME;
    const abs = (p) => (p.startsWith("~/") ? join(home, p.slice(2)) : resolve(r._dir, p));
    r.trilha.arquivo = abs(r.trilha.arquivo);
    r.vozDir = abs(r.vozDir);
    r.sfxDir = abs(r.sfxDir);
    const durs = join(r.vozDir, "duracoes.json");
    r._duracoes = existsSync(durs) ? JSON.parse(readFileSync(durs, "utf8")) : {};
    return r;
}

export const tempo = (r, beat, offset = 0) => +(r.trilha.fase + beat * (60 / r.trilha.bpm) + offset).toFixed(4);

/** Posiciona as frases: cada uma entra na sua batida; se a anterior ainda fala,
 *  empurra +80 ms depois do fim dela. Nunca acelera a voz. */
export function posicionarFalas(r) {
    let fimAnterior = -Infinity;
    return r.falas.map((f) => {
        const d = r._duracoes[f.arquivo];
        if (!d) throw new Error(`sem duração aparada para ${f.arquivo} (rode apara-frases.mjs)`);
        const ancora = tempo(r, f.beat, f.offset ?? 0);
        const inicio = Math.max(ancora, fimAnterior + 0.08);
        const empurrao = +(inicio - ancora).toFixed(3);
        fimAnterior = inicio + d.dur;
        // palavras vêm da transcrição da tomada original; o arquivo aparado começa em d.inicio_cortado
        const desloc = inicio - d.inicio_cortado;
        const legenda = (f.legenda || []).map(([t, texto]) => [+(desloc + t).toFixed(3), texto]);
        const fimFala = f.fim_palavras != null ? +(desloc + f.fim_palavras).toFixed(3) : +(inicio + d.dur).toFixed(3);
        return { ...f, ancora, inicio: +inicio.toFixed(3), fim: +fimAnterior.toFixed(3), empurrao, dur: d.dur, legenda, fimFala };
    });
}
