#!/usr/bin/env node
// Gera films/<slug>/legendas.js a partir do roteiro.json: a faixa de legenda da
// tela usa exatamente os tempos em que o mix põe cada frase.
// Uso: node scripts/gera-legendas.mjs films/<slug>/roteiro.json
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { carregar, posicionarFalas } from "./lib/roteiro.mjs";
const r = carregar(process.argv[2]);
const falas = posicionarFalas(r);
const blocos = [];
for (const f of falas) {
    if (f.semLegenda) continue;
    f.legenda.forEach(([t, texto], i) => {
        const prox = f.legenda[i + 1]?.[0] ?? f.fimFala + 0.25;
        blocos.push({ de: t, ate: +prox.toFixed(3), texto });
    });
}
writeFileSync(join(r._dir, "legendas.js"), "// Gerado por scripts/gera-legendas.mjs a partir de roteiro.json. Não editar à mão.\nwindow.LEGENDAS = " + JSON.stringify(blocos, null, 1) + ";\n");
for (const f of falas) console.log(`${f.id.padEnd(4)} âncora ${f.ancora.toFixed(2)}  entra ${f.inicio.toFixed(2)}  sai ${f.fim.toFixed(2)}${f.empurrao > 0 ? `  EMPURRÃO ${f.empurrao}s` : ""}${f.empurrao > 0.5 ? "  <- encurte o texto ou antecipe a âncora" : ""}`);
console.log(`${blocos.length} blocos de legenda`);
