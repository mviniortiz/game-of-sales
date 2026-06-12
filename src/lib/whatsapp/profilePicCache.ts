// INBOX.PPIC.1 (2026-06-12) — cache + fila de fotos de perfil do WhatsApp.
//
// Problema: buscar a foto de cada contato direto na render trava a lista (N
// chamadas ao Evolution de uma vez) e o código antigo simplesmente descartava
// tudo além das 10 primeiras. Aqui, um cache module-level com:
//   - dedupe de requisições em voo (1 fetch por número, mesmo com N avatares);
//   - fila com concorrência limitada (não dispara 100 chamadas juntas);
//   - persistência em localStorage com TTL (sobrevive a reload, sem rebater);
//   - cache negativo curto (número sem foto não é tentado de novo a cada scroll).
//
// Resultado: avatares aparecem progressivamente, sem travar a UI nem o Evolution.
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "vyzon:wapp:ppic:v1";
const TTL_HIT_MS = 7 * 24 * 60 * 60 * 1000;   // foto encontrada: 7 dias
const TTL_MISS_MS = 24 * 60 * 60 * 1000;       // sem foto: 1 dia
const MAX_CONCURRENT = 4;

interface Entry {
    url: string | null;
    at: number;
}

type Resolver = (url: string | null) => void;

const mem = new Map<string, Entry>();
const inFlight = new Map<string, Promise<string | null>>();
const queue: { key: string; companyId: string | null; resolve: Resolver }[] = [];
let active = 0;
let hydrated = false;

const digitsOf = (phone: string) => phone.replace(/\D/g, "");

function hydrate() {
    if (hydrated) return;
    hydrated = true;
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, Entry>;
        const now = Date.now();
        for (const [k, e] of Object.entries(parsed)) {
            const ttl = e.url ? TTL_HIT_MS : TTL_MISS_MS;
            if (now - e.at < ttl) mem.set(k, e);
        }
    } catch {
        /* localStorage indisponível/corrompido — ignora */
    }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistSoon() {
    if (persistTimer) return;
    persistTimer = setTimeout(() => {
        persistTimer = null;
        try {
            const obj: Record<string, Entry> = {};
            for (const [k, e] of mem.entries()) obj[k] = e;
            localStorage.setItem(LS_KEY, JSON.stringify(obj));
        } catch {
            /* quota/indisponível — ignora */
        }
    }, 800);
}

function fresh(entry: Entry | undefined): Entry | null {
    if (!entry) return null;
    const ttl = entry.url ? TTL_HIT_MS : TTL_MISS_MS;
    return Date.now() - entry.at < ttl ? entry : null;
}

function pump() {
    while (active < MAX_CONCURRENT && queue.length > 0) {
        const job = queue.shift()!;
        active++;
        void (async () => {
            let url: string | null = null;
            try {
                const res = (await supabase.functions.invoke("evolution-whatsapp", {
                    body: { action: "profilePic", number: job.key, companyId: job.companyId },
                })) as { data?: { profilePicUrl?: string } | null };
                url = res?.data?.profilePicUrl || null;
            } catch {
                url = null;
            }
            const entry: Entry = { url, at: Date.now() };
            mem.set(job.key, entry);
            persistSoon();
            job.resolve(url);
            inFlight.delete(job.key);
            active--;
            pump();
        })();
    }
}

/**
 * Resolve a foto de perfil de um número. Cacheada, deduplicada e enfileirada.
 * Retorna null quando não há foto (ou falha) — o caller cai no fallback (iniciais).
 */
export function getProfilePic(phone: string, companyId: string | null): Promise<string | null> {
    hydrate();
    const key = digitsOf(phone);
    if (!key) return Promise.resolve(null);

    const cached = fresh(mem.get(key));
    if (cached) return Promise.resolve(cached.url);

    const existing = inFlight.get(key);
    if (existing) return existing;

    const p = new Promise<string | null>((resolve) => {
        queue.push({ key, companyId, resolve });
        pump();
    });
    inFlight.set(key, p);
    return p;
}

/** Pré-aquece sincronicamente a partir do cache (sem disparar fetch). */
export function peekProfilePic(phone: string): string | null {
    hydrate();
    const cached = fresh(mem.get(digitsOf(phone)));
    return cached?.url ?? null;
}
