import { useEffect, useMemo, useState } from "react";

/**
 * Lista longa em partes: mostra `passo` itens e mais `passo` a cada clique.
 * `chave` volta ao começo quando muda (troca de filtro, aba ou busca).
 * Os dados continuam todos na memória; isto só evita montar centenas de
 * linhas de uma vez na tela.
 */
export function useMostrarMais<T>(itens: T[], passo = 30, chave?: unknown) {
    const [limite, setLimite] = useState(passo);
    useEffect(() => setLimite(passo), [chave, passo]);
    const visiveis = useMemo(() => itens.slice(0, limite), [itens, limite]);
    return {
        visiveis,
        total: itens.length,
        restante: Math.max(0, itens.length - limite),
        mostrarMais: () => setLimite((l) => l + passo),
        passo,
    };
}
