#!/usr/bin/env node
// Passo 2 do reel com rosto: decide o que fica.
//   1. Fala = envelope de 10 ms acima do limiar (automático: piso de ruído + 14 dB,
//      ou silencio.limiar_db). Silêncio menor que silencio.min (0,35 s) não corta:
//      é respiração. Cada trecho de fala ganha folga antes e depois.
//   2. Cortes manuais (cortar: [[de, ate], ...] em segundos do bruto) tiram o erro
//      e a frase regravada; a tabela de palavras impressa ajuda a achar os tempos.
//   3. Nenhum corte cai no meio de uma palavra (palavras.json).
// Saída: cortes.json, rosto-dados.js (clipes, palavras no tempo editado, faixa)
// e os <video> do index.html entre <!-- clipes:inicio --> e <!-- clipes:fim -->.
// Uso: node scripts/rosto/corta.mjs films/<slug>/rosto.json
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decode, rmsEnvelope, gainToDb } from "../lib/audio.mjs";
import { carregar } from "../lib/roteiro.mjs";

const r = carregar(process.argv[2]);
const cfg = { min: 0.35, folga_antes: 0.1, folga_depois: 0.16, ...(r.silencio || {}) };
const [x] = decode(join(r._dir, "renders", `${r.slug}-bruto.wav`), { channels: 1 });
const SRm = 48000, dur = x.length / SRm, W = 0.01;
const env = Array.from(rmsEnvelope(x, W, SRm), (v) => gainToDb(v));
const ordenado = [...env].sort((a, b) => a - b);
const piso = ordenado[Math.floor(ordenado.length * 0.1)];
const limiar = cfg.limiar_db ?? Math.min(-30, piso + 14);

// 1. trechos de fala
let fala = [], ini = null;
env.forEach((db, i) => { if (db > limiar && ini == null) ini = i; if (db <= limiar && ini != null) { fala.push([ini * W, i * W]); ini = null; } });
if (ini != null) fala.push([ini * W, dur]);
fala = fala.filter(([a, b]) => b - a >= 0.06);                         // estalo não é fala
const juntos = [];
for (const t of fala) { const u = juntos[juntos.length - 1]; if (u && t[0] - u[1] < cfg.min) u[1] = t[1]; else juntos.push([...t]); }
let manter = juntos.map(([a, b]) => [Math.max(0, a - cfg.folga_antes), Math.min(dur, b + cfg.folga_depois)]);

// 3. palavras inteiras
const palArq = join(r._dir, r.palavras || "palavras.json");
const palavras = existsSync(palArq) ? JSON.parse(readFileSync(palArq, "utf8")) : [];
const cortar = (r.cortar || []).map(([a, b]) => [+a, +b]);
const dentroCorte = (p) => cortar.some(([a, b]) => p.s >= a - 0.02 && p.e <= b + 0.02);
for (const p of palavras) {
    if (dentroCorte(p)) continue;
    const seg = manter.find(([a, b]) => p.e > a && p.s < b);
    if (seg) { seg[0] = Math.min(seg[0], p.s - 0.04); seg[1] = Math.max(seg[1], p.e + 0.06); }
    else manter.push([p.s - 0.06, p.e + 0.1]);                           // palavra baixa que o limiar perdeu
}
manter.sort((a, b) => a[0] - b[0]);
const m2 = [];
for (const t of manter) { const u = m2[m2.length - 1]; if (u && t[0] <= u[1] + 0.02) u[1] = Math.max(u[1], t[1]); else m2.push([Math.max(0, t[0]), Math.min(dur, t[1])]); }

// 2. cortes manuais
let segs = m2;
for (const [ca, cb] of cortar) {
    segs = segs.flatMap(([a, b]) => (cb <= a || ca >= b ? [[a, b]] : [[a, Math.min(b, ca)], [Math.max(a, cb), b]])).filter(([a, b]) => b - a > 0.05);
}
// tempo editado
let em = 0;
const clipes = segs.map(([a, b]) => { const c = { de: +a.toFixed(3), ate: +b.toFixed(3), em: +em.toFixed(3), dur: +(b - a).toFixed(3) }; em += b - a; return c; });
const duracao = +em.toFixed(3);
const noEditado = (t) => { const c = clipes.find((k) => t >= k.de - 1e-6 && t <= k.ate + 1e-6); return c ? +(c.em + t - c.de).toFixed(3) : null; };
// troca: grafia certa na legenda quando o scribe erra o nome ("Marcos" → "Markus")
const troca = r.troca || {};
const grafia = (w) => { const m = w.match(/^(.*?)([.,;:?!]*)$/); return (troca[m[1]] ?? m[1]) + m[2]; };
const pal = palavras.filter((p) => !dentroCorte(p)).map((p) => ({ w: grafia(p.w), t0: noEditado(p.s), t1: noEditado(p.e) })).filter((p) => p.t0 != null && p.t1 != null);

writeFileSync(join(r._dir, "cortes.json"), JSON.stringify({ limiar_db: +limiar.toFixed(1), piso_db: +piso.toFixed(1), duracao_bruto: +dur.toFixed(3), duracao, clipes }, null, 1));
const faixa = { de: 0, ate: 4, ...(r.faixa || {}) };
writeFileSync(join(r._dir, "rosto-dados.js"), "// Gerado por scripts/rosto/corta.mjs a partir de rosto.json, palavras.json e do áudio. Não editar à mão.\nwindow.ROSTO = " + JSON.stringify({ duracao, faixa, palavras: pal, legenda: r.legenda || {} }, null, 1) + ";\n");

// <video> por trecho mantido, todos do mesmo proxy, mudos (o áudio sai do mix)
const idx = join(r._dir, "index.html");
let html = readFileSync(idx, "utf8");
const videos = clipes.map((c, i) => `  <video id="v${i + 1}" src="midia/bruto.mp4" muted playsinline data-start="${c.em}" data-duration="${c.dur}" data-media-start="${c.de}" data-track-index="0"></video>`).join("\n");
html = html.replace(/<!-- clipes:inicio -->[\s\S]*?<!-- clipes:fim -->/, `<!-- clipes:inicio -->\n${videos}\n  <!-- clipes:fim -->`);
html = html.replace(/(id="root"[^>]*data-duration=")[^"]*"/, `$1${duracao}"`);
writeFileSync(idx, html);

console.log(`limiar ${limiar.toFixed(1)} dBFS (piso ${piso.toFixed(1)}) · bruto ${dur.toFixed(2)} s → editado ${duracao.toFixed(2)} s (${(dur - duracao).toFixed(2)} s fora) · ${clipes.length} trechos`);
for (const c of clipes) console.log(`  ${c.de.toFixed(2).padStart(6)}–${c.ate.toFixed(2).padEnd(6)} → ${c.em.toFixed(2)}`);
if (palavras.length) {
    console.log(`${pal.length} de ${palavras.length} palavras na legenda. Palavras com tempo do bruto (para escolher cortes manuais):`);
    let linha = "";
    for (const p of palavras) { const s = `${p.s.toFixed(2)} ${p.w}${dentroCorte(p) ? "✂" : ""}  `; if ((linha + s).length > 110) { console.log("  " + linha); linha = ""; } linha += s; }
    if (linha) console.log("  " + linha);
} else console.log("sem palavras.json: legenda vazia (rode importa-palavras.mjs)");
