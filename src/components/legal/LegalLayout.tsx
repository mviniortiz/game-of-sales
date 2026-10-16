import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ThemeLogo } from "@/components/ui/ThemeLogo";

export type LegalSection = { id: string; title: string; body: ReactNode };

const RAIO_X_AUTO = "/criar-conta?segmento=energia_solar";
const DOCS = [
    { to: "/politica-privacidade", label: "Privacidade" },
    { to: "/termos-de-servico", label: "Termos de serviço" },
];

// Peças de texto das páginas legais: mesma tinta e ritmo nas duas.
export const P = ({ children }: { children: ReactNode }) => <p>{children}</p>;
export const Sub = ({ children }: { children: ReactNode }) => (
    <h3 className="!mt-7 text-[16px] font-semibold tracking-[-0.01em]" style={{ color: "var(--lp-ink)" }}>{children}</h3>
);
export const Lista = ({ itens }: { itens: ReactNode[] }) => (
    <ul className="space-y-2.5">
        {itens.map((item, i) => (
            <li key={i} className="flex gap-3">
                <span aria-hidden className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--lp-ink-40)" }} />
                <span>{item}</span>
            </li>
        ))}
    </ul>
);
export const Destaque = ({ children }: { children: ReactNode }) => (
    <div className="rounded-[10px] border px-4 py-3.5 text-[15px]" style={{ background: "var(--lp-white)", borderColor: "var(--lp-line)", color: "var(--lp-ink-90)" }}>
        {children}
    </div>
);
export const A = ({ href, children }: { href: string; children: ReactNode }) => {
    const externo = /^https?:/.test(href);
    const cls = "font-medium underline decoration-1 underline-offset-[3px] hover:decoration-2";
    const style = { color: "var(--lp-blue)" };
    if (href.startsWith("/")) return <Link to={href} className={cls} style={style}>{children}</Link>;
    return <a href={href} className={cls} style={style} {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{children}</a>;
};

/** Seção visível agora, para marcar o índice. */
function useSecaoAtual(ids: string[]) {
    const [atual, setAtual] = useState(ids[0]);
    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") return;
        const obs = new IntersectionObserver(
            (entries) => {
                const visivel = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
                if (visivel) setAtual(visivel.target.id);
            },
            { rootMargin: "-20% 0px -70% 0px" },
        );
        ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [ids]);
    return atual;
}

export function LegalLayout({ path, title, updated, summary, sections }: {
    path: string;
    title: string;
    updated: string;
    summary: ReactNode[];
    sections: LegalSection[];
}) {
    const atual = useSecaoAtual(sections.map((s) => s.id));
    useEffect(() => { document.title = `${title} | Vyzon`; }, [title]);

    return (
        <div className="lp-v2 min-h-screen" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
            <header className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-5 md:px-8">
                <Link to="/" aria-label="Vyzon, início">
                    <ThemeLogo className="h-[22px] w-auto" />
                </Link>
                <div className="flex items-center gap-4">
                    <Link to="/auth" className="text-sm" style={{ color: "var(--lp-ink-55)" }}>Entrar</Link>
                    <Link to={RAIO_X_AUTO} className="vz-btn vz-btn--primary vz-btn--sm"><span>Fazer meu Raio-X</span></Link>
                </div>
            </header>

            <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-8 md:px-8 md:pt-16">
                <div className="max-w-[720px]">
                    <nav aria-label="Documentos" className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--lp-line)", background: "var(--lp-white)" }}>
                        {DOCS.map((d) => {
                            const ativo = d.to === path;
                            return (
                                <Link
                                    key={d.to}
                                    to={d.to}
                                    aria-current={ativo ? "page" : undefined}
                                    className="rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150"
                                    style={ativo ? { background: "var(--lp-ink)", color: "var(--lp-white)" } : { color: "var(--lp-ink-55)" }}
                                >
                                    {d.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <h1 className="mt-7 text-[36px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[52px]">{title}</h1>
                    <p className="mt-3 text-[14px]" style={{ color: "var(--lp-ink-55)" }}>{updated}</p>

                    <section aria-label="Em resumo" className="mt-9 rounded-[14px] border p-5 md:p-6" style={{ background: "var(--lp-white)", borderColor: "var(--lp-line)" }}>
                        <p className="text-[13px] font-semibold" style={{ color: "var(--lp-ink)" }}>Em resumo</p>
                        <div className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--lp-ink-70)" }}>
                            <Lista itens={summary} />
                        </div>
                        <p className="mt-4 text-[13px]" style={{ color: "var(--lp-ink-55)" }}>O resumo ajuda a ler. O que vale é o texto completo abaixo.</p>
                    </section>
                </div>

                <div className="mt-14 grid gap-10 lg:grid-cols-[220px_minmax(0,720px)] lg:gap-16">
                    <nav aria-label="Nesta página" className="hidden lg:block">
                        <div className="sticky top-8">
                            <p className="text-[12px] font-semibold" style={{ color: "var(--lp-ink-55)" }}>Nesta página</p>
                            <ol className="mt-3 space-y-0.5 border-l" style={{ borderColor: "var(--lp-line)" }}>
                                {sections.map((s, i) => {
                                    const ativo = s.id === atual;
                                    return (
                                        <li key={s.id}>
                                            <a
                                                href={`#${s.id}`}
                                                className="-ml-px block border-l py-1.5 pl-3.5 text-[13px] leading-snug transition-colors duration-150"
                                                style={{ borderColor: ativo ? "var(--lp-ink)" : "transparent", color: ativo ? "var(--lp-ink)" : "var(--lp-ink-55)", fontWeight: ativo ? 600 : 400 }}
                                            >
                                                {i + 1}. {s.title}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </nav>

                    <article className="min-w-0">
                        {sections.map((s, i) => (
                            <section key={s.id} id={s.id} className="scroll-mt-8 border-t py-9 first:border-t-0 first:pt-0" style={{ borderColor: "var(--lp-line)" }}>
                                <h2 className="flex items-baseline gap-3 text-[22px] font-semibold leading-tight tracking-[-0.02em] md:text-[24px]">
                                    <span className="text-[14px] font-medium tabular-nums" style={{ color: "var(--lp-ink-40)" }}>{String(i + 1).padStart(2, "0")}</span>
                                    {s.title}
                                </h2>
                                <div className="mt-4 space-y-4 text-[16px] leading-[1.7]" style={{ color: "var(--lp-ink-70)" }}>
                                    {s.body}
                                </div>
                            </section>
                        ))}
                    </article>
                </div>
            </main>

            <footer className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3 border-t px-5 py-8 text-sm md:px-8" style={{ color: "var(--lp-ink-40)", borderColor: "var(--lp-line)" }}>
                <span>Vyzon</span>
                <nav className="flex flex-wrap gap-5">
                    {DOCS.map((d) => <Link key={d.to} to={d.to}>{d.label}</Link>)}
                </nav>
            </footer>
        </div>
    );
}
