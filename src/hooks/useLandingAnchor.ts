import { useEffect } from "react";

const HEADER_OFFSET = 72;

export const smoothScrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    return true;
};

// Faz scroll pro anchor mesmo quando o nó ainda não foi hidratado por LazyOnVisible,
// e re-scrolla enquanto lazy sections acima do target crescem e deslocam a posição.
// Aborta se o usuário começar a rolar manualmente (evita "brigar" com scroll do user).
export const scrollToLazyAnchor = (id: string) => {
    window.dispatchEvent(new CustomEvent("vyzon:hydrate-all"));

    let lastUserScrollAt = 0;
    const onUserScroll = () => {
        lastUserScrollAt = Date.now();
    };
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchmove", onUserScroll, { passive: true });
    window.addEventListener("keydown", onUserScroll);

    let attempts = 0;
    const maxAttempts = 8;
    const start = Date.now();
    let settled = false;

    const cleanup = () => {
        settled = true;
        window.removeEventListener("wheel", onUserScroll);
        window.removeEventListener("touchmove", onUserScroll);
        window.removeEventListener("keydown", onUserScroll);
    };

    const tick = (isFirst: boolean) => {
        if (settled) return;
        if (attempts >= maxAttempts) return cleanup();
        if (Date.now() - start > 2500) return cleanup();
        // Se user começou a rolar (não é o scroll nosso), solta.
        if (!isFirst && Date.now() - lastUserScrollAt < 250) return cleanup();

        const el = document.getElementById(id);
        if (!el) {
            attempts++;
            setTimeout(() => tick(false), 180);
            return;
        }

        const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        const targetTop = Math.max(0, top);
        const diff = Math.abs(window.scrollY - targetTop);

        if (diff < 6) {
            // Já está no alvo. Dá mais 2 ticks pra confirmar estabilidade.
            attempts = Math.max(attempts, maxAttempts - 2);
            setTimeout(() => tick(false), 250);
            return;
        }

        // Primeiro scroll é suave, correções subsequentes são instant pra snap direto
        // no alvo final (evita "deslize" repetido que incomoda o usuário).
        window.scrollTo({ top: targetTop, behavior: isFirst ? "smooth" : "auto" });
        attempts++;
        setTimeout(() => tick(false), isFirst ? 350 : 200);
    };

    requestAnimationFrame(() => tick(true));
};

// Escuta o hash inicial (ex: `/#features` vindo de /para-infoprodutores) e faz scroll.
export const useHashScrollOnMount = () => {
    useEffect(() => {
        const hash = window.location.hash.replace("#", "");
        if (!hash) return;
        scrollToLazyAnchor(hash);
    }, []);
};
