// Cadeado do login entre abas (09/11/2026).
//
// O Supabase usa navigator.locks para que só uma aba por vez leia ou renove a
// sessão, e espera esse cadeado sem limite. Quando uma aba fica parada
// segurando ele (Chrome congela aba em segundo plano, Mac dorme no meio de uma
// renovação), toda aba nova do Vyzon fica em "Carregando" para sempre, até no
// /criar-conta. Aqui a espera tem teto: passou dele, a aba nova toma o
// cadeado da aba parada e segue.
import { NavigatorLockAcquireTimeoutError } from "@supabase/supabase-js";

export const TETO_ESPERA_MS = 8_000;

type Gerente = Pick<LockManager, "request">;

function gerenteDoNavegador(): Gerente | undefined {
    try {
        return globalThis.navigator?.locks;
    } catch {
        return undefined;
    }
}

export function criarCadeado(gerente: Gerente | undefined = gerenteDoNavegador(), teto = TETO_ESPERA_MS) {
    return async function cadeado<R>(nome: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
        if (!gerente) return fn();

        // 0 = só se estiver livre agora (mesmo contrato do navigatorLock).
        if (acquireTimeout === 0) {
            return gerente.request(nome, { mode: "exclusive", ifAvailable: true }, async (lock) => {
                if (!lock) throw new NavigatorLockAcquireTimeoutError(`Cadeado "${nome}" ocupado`);
                return fn();
            });
        }

        const limite = acquireTimeout > 0 ? acquireTimeout : teto;
        const abortar = new AbortController();
        const timer = setTimeout(() => abortar.abort(), limite);
        let pegou = false;
        try {
            return await gerente.request(nome, { mode: "exclusive", signal: abortar.signal }, async () => {
                pegou = true;
                clearTimeout(timer);
                return fn();
            });
        } catch (erro) {
            clearTimeout(timer);
            // Erro de dentro da operação (ou de outra coisa): repassa como veio.
            if (pegou || (erro as { name?: string } | null)?.name !== "AbortError") throw erro;
            // Quem pediu prazo recebe o erro de prazo, como na biblioteca.
            if (acquireTimeout > 0) throw new NavigatorLockAcquireTimeoutError(`Cadeado "${nome}" demorou demais`);
            console.warn(`[login] outra aba segurou "${nome}" por mais de ${limite} ms; tomando o cadeado`);
            return gerente.request(nome, { steal: true }, async () => fn());
        }
    };
}

export const cadeadoDoLogin = criarCadeado();
