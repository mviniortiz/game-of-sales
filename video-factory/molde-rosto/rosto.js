// Molde "rosto": monta a timeline da faixa e da legenda a partir de window.ROSTO
// (gerado por scripts/rosto/corta.mjs). Os <video> já estão no HTML, um por
// trecho mantido; o HyperFrames cuida deles. Tudo aqui é seek-safe: estados no
// tempo 0 e trocas de classe por attr (GSAP 3 não troca className).
(function () {
    const R = window.ROSTO;
    const { $, antes } = VF;
    const tl = VF.montar();
    VF.tempo(tl, R.duracao);

    // Faixa: já inteira no quadro 0 (é o gancho) e some em R.faixa.ate
    $("#faixa .tarja").textContent = R.faixa.texto || "";
    tl.fromTo("#faixa", { y: 0 }, { y: -6, duration: R.faixa.ate - R.faixa.de, ease: "drift" }, R.faixa.de);
    tl.to("#faixa", { autoAlpha: 0, y: "-=24", duration: 0.25, ease: "throw" }, R.faixa.ate - 0.25);

    // Legenda: quebra em grupos de até N palavras; quebra antes se houver pausa
    // ou pontuação. Cada palavra entra quando é dita e acende enquanto dura.
    const max = R.legenda.max_palavras || 3, pausa = R.legenda.pausa_quebra || 0.32;
    const grupos = []; let g = [];
    R.palavras.forEach((p, i) => {
        const ant = R.palavras[i - 1];
        if (g.length && (g.length >= max || p.t0 - ant.t1 > pausa || /[.?!:;,]$/.test(ant.w))) { grupos.push(g); g = []; }
        g.push(p);
    });
    if (g.length) grupos.push(g);
    const caixa = $("#legenda-rosto");
    grupos.forEach((ws, gi) => {
        const el = document.createElement("p"); el.className = "grupo";
        const spans = ws.map((p) => { const s = document.createElement("span"); s.className = "pal"; s.textContent = p.w.replace(/[.,;:]+$/, ""); el.appendChild(s); el.appendChild(document.createTextNode(" ")); return s; });
        caixa.appendChild(el);
        const ini = ws[0].t0, prox = grupos[gi + 1]?.[0].t0;
        const fim = Math.min(prox ?? Infinity, ws[ws.length - 1].t1 + 0.35);
        tl.set(el, { visibility: "visible" }, ini);
        tl.set(el, { visibility: "hidden" }, fim);
        spans.forEach((s, k) => {
            const p = ws[k], fimPal = ws[k + 1]?.t0 ?? Math.min(fim, p.t1 + 0.12);
            antes(tl, s, { autoAlpha: 0 });
            tl.fromTo(s, { autoAlpha: 0, scale: 0.86, y: 10 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.12, ease: "snap", immediateRender: false }, p.t0);
            tl.set(s, { attr: { class: "pal ativa" } }, p.t0);
            tl.set(s, { attr: { class: "pal" } }, fimPal);
        });
    });
    tl.to("#tc", { opacity: 1, duration: 0.01 }, R.duracao - 0.01); // fixa a duração da timeline
    VF.registrar("root", tl);
})();
