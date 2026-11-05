import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { BlogHeader, BlogFooter, BlogCtaCard, ReadingBar } from "@/components/blog/BlogChrome";
import { BlogCover } from "@/components/blog/BlogCover";
import { Block, Toc } from "@/components/blog/BlogBlocks";
import { getBlogPost, formatBlogDate, headingId, readMinutes, relatedPosts } from "@/data/landing/blogPosts";
import { logLandingEvent, useContentFunnel } from "@/lib/landingFunnel";
import "@/components/blog/blog.css";

// Post do blog (rota /blog/:slug). Coluna de leitura de 680px, sumário fixo ao
// lado no desktop com o trecho atual marcado, barra de leitura em sol, capa que
// toca uma vez ao aparecer. Crawlers recebem o HTML do prerender
// (scripts/prerender-seo.mjs); aqui o title/meta valem para a navegação SPA.
const BlogPostV2 = () => {
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const post = slug ? getBlogPost(slug) : undefined;
    useContentFunnel("blog", post?.slug);

    const evento = (placement: string, extra: Record<string, string> = {}) => {
        if (post) logLandingEvent("blog", post.slug, "cta_click", { placement, ...extra });
    };

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        if (!window.location.hash) window.scrollTo(0, 0);
        return () => {
            if (wasDark) html.classList.add("dark");
        };
    }, [slug]);

    useEffect(() => {
        if (!post) return;
        const prevTitle = document.title;
        document.title = `${post.title} · Vyzon`;
        const metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        const prevDesc = metaDesc?.content;
        if (metaDesc) metaDesc.content = post.excerpt;
        return () => {
            document.title = prevTitle;
            if (metaDesc && prevDesc != null) metaDesc.content = prevDesc;
        };
    }, [post]);

    useEffect(() => {
        if (slug && !post) navigate("/blog", { replace: true });
    }, [slug, post, navigate]);

    if (!post) return null;

    const secoes = post.content.filter((b) => b.type === "h2").map((b) => (b as { text: string }).text);
    const leia = relatedPosts(post);

    return (
        <div className="lp-v2 lp-solar vb min-h-screen w-full">
            <BlogHeader onCta={() => evento("nav")} />
            <ReadingBar />

            <article>
                <header className="vb-wrap vb-post-topo">
                    <Link to="/blog" className="vb-voltar">
                        <ArrowLeft aria-hidden="true" /> Blog
                    </Link>
                    <p className="vb-meta mt-6 landing-fade-in-up-lg">
                        <span className="vb-meta__cat">{post.category}</span>
                        <span aria-hidden="true">·</span>
                        {post.updated ? (
                            <span>
                                Atualizado em <time dateTime={post.updated}>{formatBlogDate(post.updated)}</time>
                            </span>
                        ) : (
                            <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{readMinutes(post)} min de leitura</span>
                    </p>
                    <h1 className="vs-display vb-post-h1 landing-fade-in-up-lg landing-delay-100">{post.title}</h1>
                    <p className="vb-post-resumo landing-fade-in-up-lg landing-delay-200">{post.excerpt}</p>

                    {/* Download logo abaixo do resumo: quem chega buscando "modelo pdf/word" acha sem rolar */}
                    {post.downloads?.length ? (
                        <div className="vb-baixar landing-fade-in-up-lg landing-delay-200">
                            <p className="vb-baixar__titulo">Baixe grátis, sem cadastro</p>
                            <div className="vb-baixar__lista">
                                {post.downloads.map((d) => (
                                    <a key={d.href} href={d.href} download className="vb-file" onClick={() => evento("download", { arquivo: d.label })}>
                                        <Download aria-hidden="true" />
                                        {d.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </header>

                <div className="vb-wrap vb-post-capa">
                    <BlogCover cover={post.cover} animate />
                </div>

                <div className="vb-wrap vb-post-grade">
                    <aside className="vb-post-lado">
                        <Toc items={secoes} />
                    </aside>
                    <div className="vb-post-corpo">
                        {secoes.length >= 3 && (
                            <details className="vb-toc-mobile">
                                <summary>Neste artigo</summary>
                                <ol>
                                    {secoes.map((t) => (
                                        <li key={t}>
                                            <a href={`#${headingId(t)}`}>{t}</a>
                                        </li>
                                    ))}
                                </ol>
                            </details>
                        )}

                        <div className="vb-prosa">
                            {post.content.map((block, i) => (
                                <Block key={i} block={block} onEvent={evento} />
                            ))}
                        </div>

                        {post.faq && post.faq.length > 0 && (
                            <section className="vb-faq" aria-labelledby="faq-titulo">
                                <h2 id="faq-titulo" className="vs-display vb-h2">
                                    Perguntas frequentes
                                </h2>
                                <div className="mt-4">
                                    {post.faq.map((f) => (
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
                        )}

                        <div className="mt-20">
                            <BlogCtaCard titulo="Quantas propostas estão paradas no seu WhatsApp agora?" onCta={() => evento("final")} />
                        </div>
                    </div>
                </div>

                <nav aria-label="Leia também" className="vb-wrap pb-8 pt-16">
                    <p className="vb-kicker">Leia também</p>
                    <ul className="vb-leia">
                        {leia.map((p) => (
                            <li key={p.slug}>
                                <Link to={`/blog/${p.slug}`} className="vb-card vb-leia__card" onClick={() => evento("leia_tambem", { post: p.slug })}>
                                    <BlogCover cover={p.cover} />
                                    <span className="vb-meta mt-4">
                                        <span className="vb-meta__cat">{p.category}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{readMinutes(p)} min</span>
                                    </span>
                                    <span className="vs-display vb-leia__titulo">
                                        <span className="vb-sublinha">{p.title}</span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </article>

            <BlogFooter onSuporte={() => post && logLandingEvent("blog", post.slug, "whatsapp_click", { placement: "footer" })} />
        </div>
    );
};

export default BlogPostV2;
