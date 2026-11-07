import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { EvaBot } from "@/components/eva/EvaBot";
import { headingId, type BlogBlock, type BlogModelo } from "@/data/landing/blogPosts";

// Blocos do corpo do post. Cada tipo tem um renderBlogBlock espelhado em
// scripts/prerender-seo.mjs (o HTML que o Google lê).

// Copiar com confirmação no próprio botão: o ícone troca por um check e o
// rótulo vira "Copiado" por 1,6 s. O aviso para leitor de tela sai num aria-live.
export function CopyButton({ text, onCopy }: { text: string; onCopy?: () => void }) {
    const [ok, setOk] = useState(false);
    const timer = useRef<number>();
    useEffect(() => () => window.clearTimeout(timer.current), []);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
        }
        setOk(true);
        onCopy?.();
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setOk(false), 1600);
    };
    return (
        <button type="button" className="vb-copy" data-ok={ok || undefined} onClick={copy}>
            <span className="vb-copy__ico" aria-hidden="true">
                <Copy className="vb-copy__a" />
                <Check className="vb-copy__b" />
            </span>
            <span className="vb-copy__txt">
                <span className="vb-copy__a">Copiar</span>
                <span className="vb-copy__b">Copiado</span>
            </span>
            <span className="sr-only" aria-live="polite">{ok ? "Texto copiado" : ""}</span>
        </button>
    );
}

function Modelos({ items, onDownload }: { items: BlogModelo[]; onDownload: (label: string) => void }) {
    return (
        <div className="vb-modelos">
            {items.map((m) => (
                <article key={m.titulo} className="vb-modelo">
                    <div className="vb-modelo__previa">
                        <img src={m.previa} alt={`Primeira página do modelo: ${m.titulo}`} loading="lazy" decoding="async" width={900} height={1273} />
                    </div>
                    <div className="vb-modelo__corpo">
                        <h3 className="vb-modelo__titulo">{m.titulo}</h3>
                        <p className="vb-modelo__desc">{m.descricao}</p>
                        <div className="vb-modelo__arquivos">
                            {m.arquivos.map((a) => (
                                <a key={a.href} href={a.href} download className="vb-file" onClick={() => onDownload(a.label)}>
                                    <Download aria-hidden="true" />
                                    {a.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
}

export function Block({ block, onEvent }: { block: BlogBlock; onEvent: (placement: string, extra?: Record<string, string>) => void }) {
    switch (block.type) {
        case "h2":
            return (
                <h2 id={headingId(block.text)} className="vs-display vb-h2">
                    {block.text}
                </h2>
            );
        case "h3":
            return <h3 className="vb-h3">{block.text}</h3>;
        case "ul":
            return (
                <ul className="vb-ul">
                    {block.items.map((it, i) => (
                        <li key={i}>{it}</li>
                    ))}
                </ul>
            );
        case "ol":
            return (
                <ol className="vb-ol">
                    {block.items.map((it, i) => (
                        <li key={i}>{it}</li>
                    ))}
                </ol>
            );
        case "quote":
            return <blockquote className="vb-quote">{block.text}</blockquote>;
        case "example":
            return (
                <aside className="vb-exemplo">
                    <p className="vb-exemplo__label">Exemplo</p>
                    <p className="vb-exemplo__titulo">{block.title}</p>
                    {block.body.map((t, i) => (
                        <p key={i} className="vb-exemplo__p">{t}</p>
                    ))}
                </aside>
            );
        case "mensagem":
            return (
                <figure className="vb-msg">
                    <figcaption className="vb-msg__label">{block.label ?? "Mensagem pronta"}</figcaption>
                    <div className="vb-msg__chat">
                        <p className="vb-msg__bolha">{block.text}</p>
                    </div>
                    <CopyButton text={block.text} onCopy={() => onEvent("copiar_mensagem", { label: block.label ?? "" })} />
                </figure>
            );
        case "prompt":
            return (
                <figure className="vb-prompt">
                    <figcaption className="vb-prompt__label">{block.label ?? "Prompt"}</figcaption>
                    <pre className="vb-prompt__texto">{block.text}</pre>
                    <CopyButton text={block.text} onCopy={() => onEvent("copiar_prompt", { label: block.label ?? "" })} />
                </figure>
            );
        case "lume":
            return (
                <aside className="vb-lume">
                    <span className="vb-lume__eva" aria-hidden="true">
                        <EvaBot size={64} state="idle" label="Lume" />
                    </span>
                    <div>
                        <p className="vb-lume__titulo">{block.title}</p>
                        <p className="vb-lume__texto">{block.text}</p>
                    </div>
                </aside>
            );
        case "tabela":
            return (
                <figure className="vb-tabela">
                    {/* Rola de lado no celular; o foco por teclado também rola. */}
                    <div className="vb-tabela__rolo" tabIndex={0} role="region" aria-label={block.caption}>
                        <table>
                            <caption>{block.caption}</caption>
                            <thead>
                                <tr>
                                    {block.colunas.map((c) => (
                                        <th key={c} scope="col">{c}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {block.linhas.map((l) => (
                                    <tr key={l[0]}>
                                        <th scope="row">{l[0]}</th>
                                        {l.slice(1).map((c, i) => (
                                            <td key={i}>{c}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {block.nota && <figcaption className="vb-tabela__nota">{block.nota}</figcaption>}
                </figure>
            );
        case "modelos":
            return <Modelos items={block.items} onDownload={(label) => onEvent("download", { arquivo: label })} />;
        default:
            return <p className="vb-p">{block.text}</p>;
    }
}

// Sumário com o trecho atual marcado. Um IntersectionObserver por h2; a marca
// desliza até o item ativo (só transform).
export function Toc({ items }: { items: string[] }) {
    const [ativo, setAtivo] = useState(0);
    const listRef = useRef<HTMLOListElement>(null);
    const [marca, setMarca] = useState<{ y: number; h: number } | null>(null);

    useEffect(() => {
        const els = items.map((t) => document.getElementById(headingId(t))).filter(Boolean) as HTMLElement[];
        if (!els.length) return;
        const io = new IntersectionObserver(
            () => {
                // o último título que já passou do terço de cima da tela
                let idx = 0;
                els.forEach((el, i) => {
                    if (el.getBoundingClientRect().top < window.innerHeight * 0.35) idx = i;
                });
                setAtivo(idx);
            },
            { rootMargin: "0px 0px -60% 0px", threshold: [0, 1] },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [items]);

    useEffect(() => {
        const li = listRef.current?.children[ativo] as HTMLElement | undefined;
        if (li) setMarca({ y: li.offsetTop, h: li.offsetHeight });
    }, [ativo, items]);

    if (items.length < 3) return null;
    return (
        <nav className="vb-toc" aria-label="Neste artigo">
            <p className="vb-toc__titulo">Neste artigo</p>
            <div className="vb-toc__trilho">
                {marca && <span className="vb-toc__marca" style={{ transform: `translateY(${marca.y}px)`, height: marca.h }} aria-hidden="true" />}
                <ol ref={listRef}>
                    {items.map((t, i) => (
                        <li key={t}>
                            <a href={`#${headingId(t)}`} data-ativo={i === ativo || undefined} aria-current={i === ativo ? "location" : undefined}>
                                {t}
                            </a>
                        </li>
                    ))}
                </ol>
            </div>
        </nav>
    );
}
