import { useEffect, useRef, useState } from "react";

// DEMO.SYNC — player da narração PRÉ-GERADA do tour (ElevenLabs
// with-timestamps, assets em public/demo-tour/). A legenda é dirigida pelos
// timestamps POR FRASE do próprio áudio (audio.currentTime via rAF): sync
// exata, sem estimativa. HTMLAudioElement dá pause/resume de graça (o clique
// em "Iniciar demo" já libera autoplay com som no domínio).
interface NarrSentence { text: string; start: number; end: number }
interface NarrScene { text: string; duration: number; sentences: NarrSentence[] }
type Manifest = Record<string, NarrScene>;

export function useTourNarration(muted: boolean) {
    const manifestRef = useRef<Manifest | "failed" | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const sceneRef = useRef<NarrScene | null>(null);
    const rafRef = useRef(0);
    const keyRef = useRef(0);
    const mutedRef = useRef(muted);
    const [caption, setCaption] = useState<{ text: string; key: number }>({ text: "", key: 0 });
    const [active, setActive] = useState(false);

    const loadManifest = async (): Promise<Manifest | null> => {
        if (manifestRef.current === "failed") return null;
        if (manifestRef.current) return manifestRef.current;
        try {
            const r = await fetch("/demo-tour/narration.json");
            if (!r.ok) throw new Error(String(r.status));
            manifestRef.current = (await r.json()) as Manifest;
            return manifestRef.current;
        } catch {
            manifestRef.current = "failed"; // sem assets → quem chama cai no fallback de legenda
            return null;
        }
    };
    useEffect(() => { loadManifest(); }, []); // pré-carrega o manifesto

    const stopRaf = () => cancelAnimationFrame(rafRef.current);
    const tick = () => {
        const a = audioRef.current;
        const m = sceneRef.current;
        if (a && m) {
            const t = a.currentTime;
            let cur = "";
            for (const s of m.sentences) {
                if (t >= s.start - 0.05) cur = s.text;
                else break;
            }
            if (cur) setCaption((prev) => (prev.text === cur ? prev : { text: cur, key: ++keyRef.current }));
        }
        rafRef.current = requestAnimationFrame(tick);
    };

    const stop = () => {
        const a = audioRef.current;
        if (a) { a.onended = null; a.onerror = null; a.pause(); }
        stopRaf();
        sceneRef.current = null;
        setActive(false);
    };

    /** Toca a narração da cena; resolve false se os assets não existirem ou o
     *  autoplay for bloqueado (quem chama conduz por legenda). */
    const play = async (screen: string, onEnd: () => void): Promise<boolean> => {
        const manifest = await loadManifest();
        const scene = manifest?.[screen];
        if (!scene) return false;
        stop();
        const a = audioRef.current ?? (audioRef.current = new Audio());
        a.src = `/demo-tour/${screen}.mp3`;
        a.muted = mutedRef.current;
        sceneRef.current = scene;
        setCaption({ text: "", key: ++keyRef.current });
        a.onended = () => { stop(); onEnd(); };
        a.onerror = () => { stop(); onEnd(); }; // mp3 quebrado no meio: não trava o tour
        try { await a.play(); } catch { stop(); return false; }
        setActive(true);
        stopRaf();
        rafRef.current = requestAnimationFrame(tick);
        return true;
    };

    // pause/resume (ex.: pessoa abriu o chat no meio da cena)
    const pause = () => audioRef.current?.pause();
    const resume = () => { if (sceneRef.current) audioRef.current?.play().catch(() => undefined); };

    useEffect(() => {
        mutedRef.current = muted;
        if (audioRef.current) audioRef.current.muted = muted;
    }, [muted]);
    useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

    return { play, stop, pause, resume, caption, active };
}
