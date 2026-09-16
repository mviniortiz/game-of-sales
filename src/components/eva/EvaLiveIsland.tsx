// EvaLiveIsland — o que a EVA fez hoje, visível em qualquer tela do app.
//
// O Diário no /inicio já conta o dia, mas some assim que a pessoa navega. Como
// a EVA trabalha sozinha (cron das 9h) e a maior parte do uso acontece no Inbox
// e no Pipeline, o trabalho dela ficava invisível justamente onde a pessoa
// passa o dia. Esta pílula no header carrega o placar e abre o resumo sem sair
// da tela.
//
// A mecânica de expansão vem do beui (src/components/vendor/dynamic-island),
// repintada com os tokens daqui: o preto do componente original virava um
// corpo estranho no header claro.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DynamicIsland } from "@/components/vendor/dynamic-island";
import { TextShimmer } from "@/components/vendor/text-shimmer";
import { EvaNode } from "@/components/landing/EvaNode";
import { useEvaDiary } from "@/hooks/useEvaDiary";

export function EvaLiveIsland() {
    const diary = useEvaDiary();
    const navigate = useNavigate();
    const [aberta, setAberta] = useState(false);
    const reduce = useReducedMotion();

    // Clique fora fecha. Sem isto a ilha fica aberta por cima do conteúdo e a
    // pessoa precisa acertar de novo o mesmo alvo para se livrar dela.
    useEffect(() => {
        if (!aberta) return;
        const fechar = () => setAberta(false);
        window.addEventListener("pointerdown", fechar);
        return () => window.removeEventListener("pointerdown", fechar);
    }, [aberta]);

    if (diary.loading) return null;

    const esperando = diary.rascunhos.length;
    const acoes = diary.linhas.length;

    // Conta parada não ganha pílula: uma EVA anunciando que não fez nada é pior
    // que silêncio.
    if (!diary.trabalhou && esperando === 0) return null;

    const resumoCurto = esperando > 0
        ? `${esperando} esperando você`
        : `${acoes} ${acoes === 1 ? "ação hoje" : "ações hoje"}`;

    return (
        <div
            className="relative"
            onPointerDown={(e) => e.stopPropagation()}
        >
            <button
                type="button"
                onClick={() => setAberta((v) => !v)}
                aria-expanded={aberta}
                aria-label={`EVA: ${resumoCurto}. Abrir resumo do dia`}
                className="block"
            >
                <DynamicIsland
                    view={null}
                    className="!bg-[var(--vyz-surface-2)] !text-[var(--vyz-text-primary)] !shadow-none ring-1 ring-[var(--vyz-border-subtle)]"
                    compact={
                        <span className="inline-flex items-center gap-2">
                            <EvaNode size={11} color="var(--vyz-eva)" />
                            {esperando > 0 ? (
                                // Esperando aprovação é o único estado que pede o
                                // olho: o shimmer marca isso sem virar alarme.
                                <TextShimmer className="text-[11.5px] font-medium">{resumoCurto}</TextShimmer>
                            ) : (
                                <span className="text-[11.5px] font-medium">{resumoCurto}</span>
                            )}
                        </span>
                    }
                />
            </button>

            {/* O painel não usa a expansão da ilha do beui: o shell dela mede o
                conteúdo no mount e não voltou a crescer aqui (medido: conteúdo
                248x193 com o shell preso em 126x37). Em vez de depurar código de
                terceiro, a pílula fica com eles e o painel é nosso, ancorado
                fora do fluxo para não esticar o header de 56px. */}
            <AnimatePresence>
                {aberta && (
                    <motion.div
                        initial={reduce ? false : { opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                            transformOrigin: "top right",
                            background: "var(--vyz-surface-1)",
                            border: "1px solid var(--vyz-border-subtle)",
                            boxShadow: "var(--vyz-shadow-panel)",
                        }}
                        className="absolute right-0 top-[calc(100%+8px)] z-50 w-[252px] rounded-[var(--vyz-radius)] p-3.5 text-left"
                    >
                        <span className="flex items-center gap-2 mb-2">
                            <EvaNode size={11} color="var(--vyz-eva)" />
                            <span className="text-[12px] font-semibold" style={{ color: "var(--vyz-text-strong)" }}>
                                O dia da EVA
                            </span>
                        </span>

                        <ul className="flex flex-col gap-1">
                            {diary.linhas.slice(0, 3).map((l) => (
                                <li key={l.chave} className="text-[11.5px]" style={{ color: "var(--vyz-text-primary)" }}>
                                    {l.texto}
                                </li>
                            ))}
                            {diary.linhas.length === 0 && (
                                <li className="text-[11.5px]" style={{ color: "var(--vyz-text-muted)" }}>
                                    Nenhuma ação hoje ainda.
                                </li>
                            )}
                        </ul>

                        {esperando > 0 && (
                            <p className="text-[11.5px] mt-2" style={{ color: "var(--vyz-accent-text)" }}>
                                {esperando === 1
                                    ? "1 mensagem esperando seu 1 no WhatsApp"
                                    : `${esperando} mensagens esperando seu 1 no WhatsApp`}
                            </p>
                        )}

                        <button
                            type="button"
                            onClick={() => { setAberta(false); navigate("/inicio"); }}
                            className="mt-2.5 text-[11.5px] font-medium"
                            style={{ color: "var(--vyz-accent)" }}
                        >
                            Ver o passo a passo
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
