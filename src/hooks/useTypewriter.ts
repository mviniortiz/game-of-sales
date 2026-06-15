import { useEffect, useState } from "react";

// Revela um texto progressivamente (efeito de digitação), para dar à EVA uma
// presença de "respondendo" em vez de cuspir a resposta seca. Respeita
// prefers-reduced-motion: nesse caso mostra o texto inteiro de imediato.
export function useTypewriter(
    text: string,
    opts?: { speed?: number; enabled?: boolean },
): { displayed: string; done: boolean } {
    const speed = opts?.speed ?? 16; // ms por caractere
    const [displayed, setDisplayed] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        const reduced =
            typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const enabled = opts?.enabled !== false && !reduced;

        if (!enabled || !text) {
            setDisplayed(text || "");
            setDone(true);
            return;
        }

        setDisplayed("");
        setDone(false);
        let i = 0;
        const iv = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) {
                clearInterval(iv);
                setDone(true);
            }
        }, speed);
        return () => clearInterval(iv);
    }, [text, speed, opts?.enabled]);

    return { displayed, done };
}
