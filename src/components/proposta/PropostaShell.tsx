import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BlogCtaCard, BlogFooter, BlogHeader } from "@/components/blog/BlogChrome";
import { getPropostaLanding, outrosFormatos } from "@/data/landing/propostaLandings";
import { logLandingEvent, useContentFunnel } from "@/lib/landingFunnel";
import { eventoProposta } from "@/lib/proposta/evento";
import "@/components/blog/blog.css";
import "./proposta.css";

// Moldura das 3 landings de proposta (gerador, planilha, Word): cabeçalho e
// rodapé do blog, título, o que a página entrega (children), as seções de texto,
// o FAQ e os links para os outros formatos. Os textos vêm de
// propostaLandings.content.json, o mesmo arquivo que o prerender lê.

export function PropostaShell({ slug, children }: { slug: string; children: ReactNode }) {
    const landing = getPropostaLanding(slug);
    useContentFunnel("proposta", slug);

    useEffect(() => {
        const prevTitle = document.title;
        document.title = landing.seoTitle;
        const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        const prevDesc = meta?.content;
        if (meta) meta.content = landing.seoDescription;
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        window.scrollTo(0, 0);
        return () => {
            document.title = prevTitle;
            if (meta && prevDesc != null) meta.content = prevDesc;
            if (wasDark) html.classList.add("dark");
        };
    }, [landing]);

    const evento = (placement: string, extra?: Record<string, string>) => eventoProposta(slug, placement, extra);

    return (
        <div className="lp-v2 lp-solar vb vpr min-h-screen w-full">
            <BlogHeader onCta={() => evento("nav")} />

            <main>
                <header className="vb-wrap vb-post-topo">
                    <p className="vb-kicker landing-fade-in-up-lg">{landing.kicker}</p>
                    <h1 className="vs-display vb-post-h1 landing-fade-in-up-lg landing-delay-100">{landing.h1}</h1>
                    <p className="vb-post-resumo landing-fade-in-up-lg landing-delay-200">{landing.sub}</p>
                </header>

                <div className="vb-wrap vpr-palco">{children}</div>

                <div className="vb-wrap">
                    <div className="vpr-corpo">
                        <div className="vb-prosa">
                            {landing.secoes.map((s) => (
                                <section key={s.h2} className="vpr-secao">
                                    <h2 className="vs-display vb-h2">{s.h2}</h2>
                                    {s.p?.map((t) => (
                                        <p key={t} className="vb-p">{t}</p>
                                    ))}
                                    {s.ol && (
                                        <ol className="vb-ol">
                                            {s.ol.map((t) => (
                                                <li key={t}>{t}</li>
                                            ))}
                                        </ol>
                                    )}
                                    {s.ul && (
                                        <ul className="vb-ul">
                                            {s.ul.map((t) => (
                                                <li key={t}>{t}</li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            ))}
                        </div>

                        {landing.atalho && (
                            <Link to={landing.atalho.href} className="vpr-atalho" onClick={() => evento("atalho", { destino: landing.atalho!.href })}>
                                <span className="vpr-atalho__texto">{landing.atalho.texto}</span>
                                <span className="vpr-atalho__acao">
                                    {landing.atalho.label} <ArrowRight aria-hidden="true" />
                                </span>
                            </Link>
                        )}

                        <section className="vb-faq" aria-labelledby="faq-titulo">
                            <h2 id="faq-titulo" className="vs-display vb-h2">Perguntas frequentes</h2>
                            <div className="mt-4">
                                {landing.faq.map((f) => (
                                    <details key={f.q}>
                                        <summary>
                                            <span>{f.q}</span>
                                            <span className="vb-faq__mais" aria-hidden="true" />
                                        </summary>
                                        <p>{f.a}</p>
                                    </details>
                                ))}
                            </div>
                        </section>

                        <nav className="vpr-outros" aria-labelledby="outros-titulo">
                            <h2 id="outros-titulo" className="vs-display vb-h2">Outros formatos de proposta</h2>
                            <ul className="vb-atalhos">
                                {outrosFormatos(slug).map((o) => (
                                    <li key={o.href}>
                                        <Link to={o.href} className="vb-atalho" onClick={() => evento("outros_formatos", { destino: o.href })}>
                                            <span className="vb-atalho__nome">
                                                {o.formato} <ArrowUpRight aria-hidden="true" />
                                            </span>
                                            <span className="vb-atalho__texto">{o.cartao}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>

                        <div className="mt-20">
                            <BlogCtaCard titulo="Quantas propostas estão paradas no seu WhatsApp agora?" onCta={() => evento("final")} />
                        </div>
                    </div>
                </div>
            </main>

            <BlogFooter onSuporte={() => logLandingEvent("proposta", slug, "whatsapp_click", { placement: "footer" })} />
        </div>
    );
}
