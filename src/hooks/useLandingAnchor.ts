import { useEffect } from "react";

const HEADER_OFFSET = 72;

export const smoothScrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return false;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    return true;
};

// Faz scroll pro anchor mesmo quando o nó ainda não foi hidratado por LazyOnVisible.
// Força hidratação + observa DOM até o nó aparecer (ou 2.5s timeout).
export const scrollToLazyAnchor = (id: string) => {
    if (smoothScrollToId(id)) return;
    window.dispatchEvent(new CustomEvent("vyzon:hydrate-all"));
    let settled = false;
    const observer = new MutationObserver(() => {
        if (settled) return;
        if (smoothScrollToId(id)) {
            settled = true;
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    requestAnimationFrame(() => {
        if (!settled && smoothScrollToId(id)) {
            settled = true;
            observer.disconnect();
        }
    });
    setTimeout(() => {
        if (!settled) observer.disconnect();
    }, 2500);
};

// Escuta o hash inicial (ex: `/#features` vindo de /para-infoprodutores) e faz scroll.
export const useHashScrollOnMount = () => {
    useEffect(() => {
        const hash = window.location.hash.replace("#", "");
        if (!hash) return;
        scrollToLazyAnchor(hash);
    }, []);
};
