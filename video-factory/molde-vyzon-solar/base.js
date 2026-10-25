// Molde "Vyzon Solar": batidas, curvas e atalhos de movimento dos product films.
// Regra do HyperFrames: o render avança quadro a quadro, então TODO movimento
// vive na timeline GSAP pausada e registrada em window.__timelines.
// Armadilhas já pagas (style guide §6.1): fromTo em elemento que só aparece
// depois leva immediateRender:false; máscara de linha usa yPercent no GSAP e
// sai em -130; saída de algo já posicionado usa valor relativo ("+=40").
// Armadilha nova (23/10/2026): com immediateRender:false o elemento fica no
// estado do CSS até o tween começar, então aparece ANTES da hora. Todo atalho
// daqui grava o estado inicial no tempo 0 (antes()). O quadro 0 em si não
// roda os set do tempo 0: a 1ª cena (#c1) é visível pelo CSS e o que entra
// depois nela leva a classe .depois.
(function () {
    // House 02 (Lily J, Mixkit 744): 122,99 BPM, primeira batida em 0,017 s.
    // Valores do scripts/audiomap.mjs. O filme começa no segundo 0 da trilha.
    const BPM = 122.99, FASE = 0.017;
    const BEAT = 60 / BPM;
    /** Tempo (s) da batida k do filme. Toda entrada de cena ancora numa batida. */
    const B = (k) => +(FASE + k * BEAT).toFixed(4);

    gsap.registerPlugin(CustomEase);
    // Curvas por massa (style guide §6): um overshoot por filme, só no gesto da virada.
    CustomEase.create("settle", "0.22,1,0.36,1");   // texto e UI
    CustomEase.create("heavy", "0.16,1,0.3,1");     // objetos grandes e câmera
    CustomEase.create("snap", "0.5,0,0.1,1");       // chips, carimbos
    CustomEase.create("throw", "0.55,0,0.85,0.35"); // saídas
    CustomEase.create("drift", "0.45,0,0.55,1");    // ambiente
    CustomEase.create("virada", "0.34,1.45,0.64,1"); // o único overshoot

    const $ = (s, r = document) => (typeof s === "string" ? r.querySelector(s) : s);
    const $$ = (s, r = document) => (typeof s === "string" ? [...r.querySelectorAll(s)] : [s].flat());
    const ir = { immediateRender: false };

    function montar() {
        const tl = gsap.timeline({ paused: true, defaults: { ease: "settle" } });
        // Estado inicial de tudo que entra depois (seek-safe: set na posição 0).
        if (document.querySelector(".cena:not(#c1)")) tl.set(".cena:not(#c1)", { autoAlpha: 0 }, 0);
        if (document.querySelector(".cena:not(#c1) .ln > span")) tl.set(".cena:not(#c1) .ln > span", { yPercent: 115 }, 0);
        return tl;
    }
    /** Grava no tempo 0 o estado de antes da entrada. */
    const antes = (tl, sel, vars) => tl.set(sel, vars, 0);

    const api = {
        B, BEAT, $, $$,
        montar,
        antes,
        /** Liga a cena em t e desliga em t2 (corte seco, sem wipe). */
        cena(tl, sel, t, t2) {
            tl.set(sel, { autoAlpha: 1 }, t);
            if (t2 != null) tl.set(sel, { autoAlpha: 0 }, t2);
        },
        /** Linhas mascaradas sobem de baixo, uma depois da outra. */
        lineIn(tl, sel, t, { stagger = 0.09, dur = 0.7 } = {}) {
            tl.fromTo($$(sel).flatMap((el) => (el.matches(".ln") ? [...el.children] : [el])), { yPercent: 115 },
                { yPercent: 0, duration: dur, stagger, ease: "settle", ...ir }, t);
        },
        lineOut(tl, sel, t, { stagger = 0.05, dur = 0.34 } = {}) {
            tl.to($$(sel).flatMap((el) => (el.matches(".ln") ? [...el.children] : [el])), { yPercent: -130, duration: dur, stagger, ease: "throw" }, t);
        },
        /** Objeto grande entra subindo com peso. */
        entra(tl, sel, t, { y = 90, dur = 0.85, scale = 1, ease = "heavy" } = {}) {
            antes(tl, sel, { autoAlpha: 0, y, scale });
            tl.fromTo(sel, { autoAlpha: 0, y, scale: scale === 1 ? 1 : scale }, { autoAlpha: 1, y: 0, scale: 1, duration: dur, ease, ...ir }, t);
        },
        sai(tl, sel, t, { y = -40, dur = 0.3 } = {}) {
            tl.to(sel, { autoAlpha: 0, y: `+=${y}`, duration: dur, ease: "throw" }, t);
        },
        /** Marca-texto desenhado da esquerda para a direita. */
        marca(tl, sel, t, { dur = 0.6 } = {}) {
            tl.fromTo(sel, { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", duration: dur, ease: "settle", ...ir }, t);
        },
        /** Bolha de conversa nasce do canto (origem no CSS). */
        bolha(tl, sel, t, { dur = 0.42 } = {}) {
            antes(tl, sel, { autoAlpha: 0, scale: 0.9, y: 24 });
            tl.fromTo(sel, { autoAlpha: 0, scale: 0.9, y: 24 }, { autoAlpha: 1, scale: 1, y: 0, duration: dur, ease: "settle", ...ir }, t);
        },
        /** "digitando…" por `dur` segundos: três pontos em onda. */
        digitando(tl, sel, t, dur) {
            const el = $(sel);
            antes(tl, el, { autoAlpha: 0 });
            tl.fromTo(el, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.2, ...ir }, t);
            const dots = [...el.querySelectorAll("i")];
            for (let k = 0; k * 0.36 < dur - 0.2; k++) {
                dots.forEach((d, i) => tl.fromTo(d, { y: 0, opacity: 0.45 }, { y: -10, opacity: 1, duration: 0.16, yoyo: true, repeat: 1, ease: "drift", ...ir }, t + 0.1 + k * 0.36 + i * 0.09));
            }
            tl.to(el, { autoAlpha: 0, duration: 0.12 }, t + dur);
        },
        /** Número contando (seek-safe: onUpdate roda em qualquer seek). */
        contar(tl, sel, de, ate, t, dur, fmt = (v) => Math.round(v).toLocaleString("pt-BR")) {
            const el = $(sel), o = { v: de };
            tl.fromTo(o, { v: de }, { v: ate, duration: dur, ease: "settle", onUpdate: () => (el.textContent = fmt(o.v)), ...ir }, t);
            tl.call(() => (el.textContent = fmt(t > 0 ? de : ate)), null, 0);
        },
        /** Visto azul: os dois tiques mudam de cinza para azul. */
        visto(tl, sel, t) {
            tl.fromTo($$(sel).flatMap((el) => [...el.querySelectorAll("path")]), { stroke: "#8696a0" }, { stroke: "#53bdeb", duration: 0.18, ease: "snap", ...ir }, t);
        },
        /** Olhos da EVA: lendo (achatados varrendo), alerta (abertos, ponto âmbar), feliz. */
        evaLendo(tl, sel, t, dur) {
            const olhos = $$(sel).flatMap((el) => [...el.querySelectorAll(".eva__olho")]);
            const grupo = $$(sel).map((el) => el.querySelector(".eva__olhos"));
            tl.to(olhos, { scaleY: 0.32, duration: 0.18, ease: "snap" }, t);
            for (let k = 0; k * 0.8 < dur; k++) tl.to(grupo, { x: k % 2 ? -6 : 6, duration: 0.4, ease: "drift", yoyo: true, repeat: 1 }, t + k * 0.8);
        },
        evaAlerta(tl, sel, t) {
            const el = $$(sel);
            tl.to(el.flatMap((e) => [...e.querySelectorAll(".eva__olho")]), { scaleY: 1.1, duration: 0.22, ease: "snap" }, t);
            tl.to(el.map((e) => e.querySelector(".eva__olhos")), { x: 0, duration: 0.2 }, t);
            tl.to(el.map((e) => e.querySelector(".eva__ponto")), { backgroundColor: "#f5b454", scale: 1.3, duration: 0.25, ease: "snap" }, t);
        },
        /** Câmera: respiração lenta (≤1,04) e um empurrão na virada. */
        respira(tl, dur) { tl.fromTo("#camera", { scale: 1 }, { scale: 1.025, duration: dur, ease: "none" }, 0); },
        /** Tempo queimado para o render de revisão (<html class="rev">). */
        tempo(tl, dur) {
            const el = $("#tc"); if (!el) return;
            const o = { t: 0 };
            tl.fromTo(o, { t: 0 }, { t: dur, duration: dur, ease: "none", onUpdate: () => (el.textContent = o.t.toFixed(2) + " s · b" + Math.floor((o.t - FASE) / BEAT)) }, 0);
        },
        /** Legenda da narração: blocos de window.LEGENDAS (gera-legendas.mjs). */
        legendas(tl, blocos = window.LEGENDAS || []) {
            const caixa = $("#legenda"); if (!caixa) return;
            blocos.forEach((b, i) => {
                const p = document.createElement("p");
                p.className = "leg"; p.textContent = b.texto; caixa.appendChild(p);
                tl.set(p, { autoAlpha: 0 }, 0);
                tl.fromTo(p, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.14, ease: "settle", immediateRender: false }, b.de);
                tl.to(p, { autoAlpha: 0, duration: 0.08, ease: "none" }, Math.max(b.de + 0.2, b.ate - 0.08));
            });
        },
        registrar(id, tl) {
            window.__timelines = window.__timelines || {};
            window.__timelines[id] = tl;
        },
    };
    window.VF = api;
})();
