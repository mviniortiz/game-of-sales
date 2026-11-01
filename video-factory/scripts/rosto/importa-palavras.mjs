#!/usr/bin/env node
// Normaliza a transcrição da ElevenLabs (scribe) para palavras.json:
// [{ "w": "Muito", "s": 0.12, "e": 0.38 }, ...] em segundos do bruto.
// Aceita o JSON da API/conector ({ words: [{ text, type, start, end }] } ou a
// própria lista), o JSON do Export da página Speech to Text
// ({ segments: [{ words: [{ text, start_time, end_time }] }] }, com os espaços
// vindo como palavras) e SRT/VTT; no SRT o tempo de cada palavra é repartido
// dentro do bloco pelo tamanho da palavra.
// Uso: node scripts/rosto/importa-palavras.mjs <entrada.json|.srt|.vtt> <palavras.json>
import { readFileSync, writeFileSync } from "node:fs";
const [ent, sai] = process.argv.slice(2);
if (!ent || !sai) { console.error("uso: importa-palavras.mjs <entrada> <palavras.json>"); process.exit(1); }
const txt = readFileSync(ent, "utf8");
let palavras = [];
const tempo = (h) => { const m = h.trim().replace(",", ".").split(":").map(Number); return m.length === 3 ? m[0] * 3600 + m[1] * 60 + m[2] : m[0] * 60 + m[1]; };
if (/^\s*[[{]/.test(txt)) {
    const j = JSON.parse(txt);
    const lista = Array.isArray(j) ? j : j.words || j.transcripts?.[0]?.words || (j.segments || []).flatMap((sg) => sg.words || []);
    palavras = lista
        .filter((p) => (p.type ?? "word") === "word" && String(p.text).trim() && !/^\(.*\)$|^\[.*\]$/.test(String(p.text).trim()))
        .map((p) => ({ w: String(p.text).trim(), s: +(+(p.start ?? p.start_time)).toFixed(3), e: +(+(p.end ?? p.end_time)).toFixed(3) }));
} else {
    const blocos = txt.replace(/\r/g, "").split(/\n\n+/);
    for (const b of blocos) {
        const linhas = b.split("\n").filter(Boolean);
        const i = linhas.findIndex((l) => l.includes("-->"));
        if (i < 0) continue;
        const [a, z] = linhas[i].split("-->").map((x) => tempo(x.trim().split(" ")[0]));
        const ws = linhas.slice(i + 1).join(" ").replace(/<[^>]+>/g, "").replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(Boolean);
        const total = ws.reduce((n, w) => n + w.length + 1, 0); let t = a;
        for (const w of ws) { const d = ((z - a) * (w.length + 1)) / total; palavras.push({ w, s: +t.toFixed(3), e: +(t + d * 0.9).toFixed(3) }); t += d; }
    }
}
if (!palavras.length) throw new Error("nenhuma palavra encontrada");
writeFileSync(sai, JSON.stringify(palavras, null, 0).replace(/\},\{/g, "},\n{") + "\n");
console.log(`${palavras.length} palavras · ${palavras[0].s.toFixed(2)}–${palavras[palavras.length - 1].e.toFixed(2)} s → ${sai}`);
console.log(palavras.map((p) => p.w).join(" "));
