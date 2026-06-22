import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getSpecialist, type SpecialistKey } from "@/lib/eva/evaSpecialists";
import type { EvaPriorContext } from "./useEvaPriorContext";

// useEvaStudioChat — conversa REAL com a EVA pra montar um agente especialista.
// Chama a edge `eva-studio-chat` (LLM conduz a entrevista + extrai os campos do
// agente escolhido). Fail-open: sem backend/key, cai num roteiro guiado e os
// campos recebem exatamente o que o gestor digitou (nada inventado).
//
// Leva 3 (2026-06-21):
//  - PERSISTÊNCIA: a conversa sobrevive a refresh (localStorage por empresa+agente).
//  - ADAPTATIVIDADE: recebe o contexto que a empresa já configurou (prior) e já
//    chega com os campos óbvios preenchidos + avisa a EVA pra não repetir perguntas.

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

// ── Persistência (localStorage) ──────────────────────────────────────────────
const STORE_PREFIX = "vyz:eva-studio-chat:v1";
interface SavedSession { v: 1; messages: StudioMsg[]; fields: StudioFields; done: boolean; step: number }

function storeKey(companyId: string | null | undefined, agentKey: string): string {
    return `${STORE_PREFIX}:${companyId ?? "anon"}:${agentKey}`;
}
function loadSession(key: string): SavedSession | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const s = JSON.parse(raw) as SavedSession;
        if (s && s.v === 1 && Array.isArray(s.messages) && s.messages.length > 0 && s.fields && typeof s.fields === "object") {
            return s;
        }
    } catch { /* storage indisponível / corrompido */ }
    return null;
}
function saveSession(key: string, s: SavedSession) {
    try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* quota / modo privado */ }
}
function clearSession(key: string) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
}

// Aplica os valores que a empresa já configurou (prior.seeds) nos campos vazios
// do agente escolhido — adaptatividade visível antes mesmo da 1ª pergunta.
function applySeeds(empty: StudioFields, fieldKeys: string[], prior?: EvaPriorContext): StudioFields {
    const out = { ...empty };
    if (!prior?.seeds) return out;
    for (const k of fieldKeys) {
        const v = prior.seeds[k];
        if (v && !out[k]) out[k] = v;
    }
    return out;
}

export function useEvaStudioChat(agentKey: SpecialistKey, prior?: EvaPriorContext) {
    const { companyId } = useAuth();
    const spec = useMemo(() => getSpecialist(agentKey), [agentKey]);
    const fieldKeys = useMemo(() => spec.fields.map((f) => f.key), [spec]);
    const emptyFields = useMemo<StudioFields>(
        () => Object.fromEntries(fieldKeys.map((k) => [k, ""])),
        [fieldKeys],
    );

    const [messages, setMessages] = useState<StudioMsg[]>([{ from: "eva", text: spec.opening }]);
    const [fields, setFields] = useState<StudioFields>(emptyFields);
    const [thinking, setThinking] = useState(false);
    const [done, setDone] = useState(false);
    const fallbackStep = useRef(0);
    const seededRef = useRef(false);

    // ── (Re)carrega a sessão sempre que mudar empresa OU agente (sessionId). ──
    // Restaura do localStorage se houver; senão começa limpo (seeds entram via efeito).
    const sessionId = `${companyId ?? "anon"}:${spec.key}`;
    const loadedFor = useRef<string | null>(null);
    if (loadedFor.current !== sessionId) {
        loadedFor.current = sessionId;
        const saved = loadSession(storeKey(companyId, spec.key));
        if (saved) {
            setMessages(saved.messages);
            setFields({ ...emptyFields, ...saved.fields });
            setDone(saved.done);
            fallbackStep.current = saved.step ?? 0;
            seededRef.current = true; // sessão real: não sobrescrever com seeds
        } else {
            setMessages([{ from: "eva", text: spec.opening }]);
            setFields(applySeeds(emptyFields, fieldKeys, prior));
            setDone(false);
            fallbackStep.current = 0;
            seededRef.current = prior?.ready ? true : false;
        }
    }

    // O prior pode resolver DEPOIS do mount (query async). Quando ficar pronto e a
    // conversa ainda estiver intocada (sem sessão salva), pré-preenche os campos.
    useEffect(() => {
        if (seededRef.current) return;
        if (!prior?.ready) return;
        if (messages.length > 1 || done) return;
        const anyFilled = Object.values(fields).some((v) => v.trim());
        if (anyFilled) return;
        if (Object.keys(prior.seeds).length === 0) { seededRef.current = true; return; }
        setFields(applySeeds(emptyFields, fieldKeys, prior));
        seededRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage ao prior ficar pronto
    }, [prior?.ready]);

    // ── Persiste a conversa quando há progresso real (não persiste só os seeds). ──
    useEffect(() => {
        if (messages.length > 1 || done) {
            saveSession(storeKey(companyId, spec.key), {
                v: 1, messages, fields, done, step: fallbackStep.current,
            });
        }
    }, [messages, fields, done, companyId, spec.key]);

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

            // 1) EVA real (edge LLM) — manda o contexto que a empresa já configurou
            //    pra ela não repetir o que já sabe.
            try {
                const { data, error } = await supabase.functions.invoke("eva-studio-chat", {
                    body: {
                        agentKey: spec.key,
                        messages: history.map(({ from, text }) => ({ from, text })),
                        fields,
                        priorContext: prior?.summary || undefined,
                    },
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
        [messages, fields, thinking, done, spec, prior],
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
        clearSession(storeKey(companyId, spec.key));
        seededRef.current = false;
        setMessages([{ from: "eva", text: spec.opening }]);
        setFields(applySeeds(emptyFields, fieldKeys, prior));
        setThinking(false);
        setDone(false);
        fallbackStep.current = 0;
    }, [spec, emptyFields, fieldKeys, prior, companyId]);

    return { messages, fields, fieldsView, filledCount, total, thinking, done, send, reset, reopen };
}
