import { useCallback, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSpecialist, type SpecialistKey } from "@/lib/eva/evaSpecialists";

// useEvaStudioChat — conversa REAL com a EVA pra montar um agente especialista.
// Chama a edge `eva-studio-chat` (LLM conduz a entrevista + extrai os campos do
// agente escolhido). Fail-open: sem backend/key, cai num roteiro guiado e os
// campos recebem exatamente o que o gestor digitou (nada inventado).

export type StudioMsg = { from: "eva" | "user"; text: string; attachment?: string };
export type StudioFields = Record<string, string>;

export interface StudioFieldView {
    key: string;
    label: string;
    value: string;
}

// Perguntas de follow-up genéricas do fallback (sem backend) — uma por campo
// ainda não preenchido, na ordem do agente.
const FALLBACK_FOLLOWUPS = [
    "Boa. Me conta um pouco mais sobre o próximo ponto?",
    "Entendi. E sobre o passo seguinte, como funciona aí?",
    "Quase lá. Tem mais alguma coisa importante nisso?",
];
const FALLBACK_CLOSING = "Pronto, montei a sua EVA. Olha à direita o que eu entendi. Se tiver algo torto, é só me dizer e eu ajusto.";

export function useEvaStudioChat(agentKey: SpecialistKey) {
    const spec = useMemo(() => getSpecialist(agentKey), [agentKey]);
    const emptyFields = useMemo<StudioFields>(
        () => Object.fromEntries(spec.fields.map((f) => [f.key, ""])),
        [spec],
    );

    const [messages, setMessages] = useState<StudioMsg[]>([{ from: "eva", text: spec.opening }]);
    const [fields, setFields] = useState<StudioFields>(emptyFields);
    const [thinking, setThinking] = useState(false);
    const [done, setDone] = useState(false);
    const fallbackStep = useRef(0);

    // A 1ª fala é SEMPRE a abertura do especialista escolhido. Se o agente trocar
    // antes de a conversa começar (sem remount), reflete a abertura do novo agente.
    const lastSpecKey = useRef(spec.key);
    if (lastSpecKey.current !== spec.key) {
        lastSpecKey.current = spec.key;
        if (messages.length <= 1) {
            setMessages([{ from: "eva", text: spec.opening }]);
            setFields(emptyFields);
            setDone(false);
            fallbackStep.current = 0;
        }
    }

    const fieldsView: StudioFieldView[] = useMemo(
        () => spec.fields.map((f) => ({ key: f.key, label: f.label, value: fields[f.key] ?? "" })),
        [spec, fields],
    );
    const filledCount = useMemo(
        () => spec.fields.filter((f) => (fields[f.key] ?? "").trim().length > 0).length,
        [spec, fields],
    );
    const total = spec.fields.length;

    const send = useCallback(
        async (rawText: string, attachment?: string) => {
            if (thinking || done) return;
            const text = (rawText || "").trim();
            const userMsg: StudioMsg = { from: "user", text: text || "(material enviado)", attachment };
            const history = [...messages, userMsg];
            setMessages(history);
            setThinking(true);

            // 1) EVA real (edge LLM)
            try {
                const { data, error } = await supabase.functions.invoke("eva-studio-chat", {
                    body: { agentKey: spec.key, messages: history.map(({ from, text }) => ({ from, text })), fields },
                });
                if (!error && data?.ok && typeof data.reply === "string") {
                    setMessages((m) => [...m, { from: "eva", text: data.reply }]);
                    if (data.fields) setFields(data.fields as StudioFields);
                    setDone(!!data.done);
                    setThinking(false);
                    return;
                }
            } catch {
                /* cai no roteiro guiado */
            }

            // 2) fallback guiado — o valor do campo é o que o gestor disse
            const step = fallbackStep.current;
            const field = spec.fields[step];
            const isLast = step >= spec.fields.length - 1;
            const nextText = isLast ? FALLBACK_CLOSING : FALLBACK_FOLLOWUPS[Math.min(step, FALLBACK_FOLLOWUPS.length - 1)];
            window.setTimeout(() => {
                if (field && text) setFields((f) => ({ ...f, [field.key]: text }));
                setMessages((m) => [...m, { from: "eva", text: nextText }]);
                const ns = step + 1;
                fallbackStep.current = ns;
                if (ns >= spec.fields.length) setDone(true);
                setThinking(false);
            }, 600);
        },
        [messages, fields, thinking, done, spec],
    );

    // Reabre a entrevista pós-recap ("quero ajustar") sem perder o que já foi
    // montado: só destrava o envio e deixa a EVA convidar a ajustar.
    const reopen = useCallback(() => {
        setDone(false);
        setMessages((m) => [
            ...m,
            { from: "eva", text: "Claro. O que você quer ajustar? Me fala e eu refaço." },
        ]);
    }, []);

    const reset = useCallback(() => {
        setMessages([{ from: "eva", text: spec.opening }]);
        setFields(emptyFields);
        setThinking(false);
        setDone(false);
        fallbackStep.current = 0;
    }, [spec, emptyFields]);

    return { messages, fields, fieldsView, filledCount, total, thinking, done, send, reset, reopen };
}
