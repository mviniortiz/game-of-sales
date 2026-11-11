import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Download } from "lucide-react";
import { BlogHeader, BlogFooter, BlogCtaCard } from "@/components/blog/BlogChrome";
import { BlogCover } from "@/components/blog/BlogCover";
import { EvaBot } from "@/components/eva/EvaBot";
import { BLOG_POSTS, BLOG_CATEGORIES, formatBlogDate, readMinutes, type BlogModelo, type BlogPost } from "@/data/landing/blogPosts";
import { logLandingEvent, useContentFunnel } from "@/lib/landingFunnel";
import "@/components/blog/blog.css";
import { PROPOSTA_LANDINGS } from "@/data/landing/propostaLandings";

// Blog (rota /blog) no sistema Lume em campo, o mesmo da home: creme, Geist 600,
// faixas chapadas de sol e noite, cartões brancos e a Lume sentada na borda.
// Capas feitas com o kit Stageshow. Filtro com marcador que desliza, cartões que
// sobem o objeto da capa no hover, e tudo com saída para prefers-reduced-motion.
type Filtro = "Todos" | (typeof BLOG_CATEGORIES)[number];
const FILTROS: Filtro[] = ["Todos", ...BLOG_CATEGORIES];

function modelosDoBlog(): BlogModelo[] {
    for (const p of BLOG_POSTS) {
        for (const b of p.content) if (b.type === "modelos") return b.items;
    }
    return [];
}
const MODELOS = modelosDoBlog();
const POST_MODELOS = BLOG_POSTS.find((p) => p.content.some((b) => b.type === "modelos"));

// Filtro com um marcador que desliza até a opção ativa (só transform e width).
function FiltroCategorias({ ativo, onChange }: { ativo: Filtro; onChange: (f: Filtro) => void }) {
    const wrap = useRef<HTMLDivElement>(null);
    const [marca, setMarca] = useState<{ x: number; w: number } | null>(null);
    useLayoutEffect(() => {
        const medir = () => {
            const el = wrap.current?.querySelector<HTMLButtonElement>(`[data-f="${ativo}"]`);
            if (el) setMarca({ x: el.offsetLeft, w: el.offsetWidth });
        };
        medir();
        window.addEventListener("resize", medir);
        return () => window.removeEventListener("resize", medir);
    }, [ativo]);
    return (
        <div ref={wrap} className="vb-filtro" role="group" aria-label="Filtrar por assunto">
            {marca && <span className="vb-filtro__marca" style={{ transform: `translateX(${marca.x}px)`, width: marca.w }} aria-hidden="true" />}
            {FILTROS.map((f) => (
                <button key={f} type="button" aria-pressed={f === ativo} data-f={f} className="vb-filtro__op" onClick={() => onChange(f)}>
                    {f}
                </button>
            ))}
        </div>
    );
}

function Meta({ post }: { post: BlogPost }) {
    return (
        <p className="vb-meta">
            <span className="vb-meta__cat">{post.category}</span>
            <span aria-hidden="true">·</span>
            <span>{formatBlogDate(post.updated ?? post.date)}</span>
            <span aria-hidden="true">·</span>
            <span>{readMinutes(post)} min</span>
        </p>
    );
}

function PostCard({ post, i, onOpen }: { post: BlogPost; i: number; onOpen: (p: BlogPost) => void }) {
    return (
        <Link to={`/blog/${post.slug}`} className="vb-card vb-entra" style={{ animationDelay: `${Math.min(i, 6) * 45}ms` }} onClick={() => onOpen(post)}>
            <BlogCover cover={post.cover} />
            <div className="vb-card__corpo">
                <Meta post={post} />
                <h3 className="vs-display vb-card__titulo">
                    <span className="vb-sublinha">{post.title}</span>
                </h3>
                <p className="vb-card__resumo">{post.excerpt}</p>
            </div>
        </Link>
    );
}

const BlogV2 = () => {
    const [filtro, setFiltro] = useState<Filtro>("Todos");
    useContentFunnel("blog", "index");

    useEffect(() => {
        const html = document.documentElement;
        const wasDark = html.classList.contains("dark");
        html.classList.remove("dark");
        window.scrollTo(0, 0);
        const prevTitle = document.title;
        document.title = "Blog · Vyzon";
        return () => {
            document.title = prevTitle;
            if (wasDark) html.classList.add("dark");
        };
    }, []);

    const abrir = (p: BlogPost) => logLandingEvent("blog", "index", "cta_click", { placement: "abrir_post", post: p.slug });
    const cta = (placement: string) => logLandingEvent("blog", "index", "cta_click", { placement });

    const lista = filtro === "Todos" ? BLOG_POSTS : BLOG_POSTS.filter((p) => p.category === filtro);
    const destaque = filtro === "Todos" ? (BLOG_POSTS.find((p) => p.featured) ?? BLOG_POSTS[0]) : null;
    const resto = destaque ? lista.filter((p) => p.slug !== destaque.slug) : lista;
    const mostraModelos = MODELOS.length > 0 && (filtro === "Todos" || filtro === "Modelos prontos");

    return (
        <div className="lp-v2 lp-solar vb min-h-screen w-full">
            <BlogHeader onCta={() => cta("nav")} />

            <main>
                <section className="vb-wrap pb-10 pt-8 md:pb-14 md:pt-14">
                    <p className="vb-kicker landing-fade-in-up-lg">Blog do Vyzon</p>
                    <h1 className="vs-display vb-h1 landing-fade-in-up-lg landing-delay-100">
                        Para quem vende energia solar <span className="vs-marca vs-marca--draw">pelo WhatsApp</span>
                    </h1>
                    <p className="vb-sub landing-fade-in-up-lg landing-delay-200">
                        Modelos de proposta para baixar, mensagens prontas para chamar de volta o cliente que sumiu e o que dá para deixar com a IA sem perder o jeito da sua empresa.
                    </p>
                    <div className="mt-8 landing-fade-in-up-lg landing-delay-200">
                        <FiltroCategorias ativo={filtro} onChange={setFiltro} />
                    </div>
                </section>

                {destaque && (
                    <section className="vs-sol vb-faixa" aria-label="Em destaque">
                        <div className="vb-wrap">
                            <Link to={`/blog/${destaque.slug}`} className="vb-card vb-destaque" onClick={() => abrir(destaque)}>
                                <BlogCover cover={destaque.cover} />
                                <div className="vb-destaque__texto">
                                    <p className="vb-kicker">Em destaque</p>
                                    <h2 className="vs-display vb-destaque__titulo">
                                        <span className="vb-sublinha">{destaque.title}</span>
                                    </h2>
                                    <p className="vb-destaque__resumo">{destaque.excerpt}</p>
                                    <p className="vb-meta mt-5">
                                        <span>{formatBlogDate(destaque.updated ?? destaque.date)}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{readMinutes(destaque)} min de leitura</span>
                                    </p>
                                    <span className="vb-ler">
                                        Ler o artigo <ArrowRight aria-hidden="true" />
                                    </span>
                                </div>
                            </Link>
                        </div>
                    </section>
                )}

                {mostraModelos && (
                    <section className="vb-wrap pt-14 md:pt-20" aria-labelledby="modelos-titulo">
                        <div className="vb-modelos-faixa vs-noite">
                            <span className="vs-sentada" style={{ ["--s-eva" as string]: "104px" }}>
                                <EvaBot size={104} state="happy" label="Lume" />
                            </span>
                            <div className="vb-modelos-faixa__topo">
                                <div>
                                    <p className="vb-kicker">Grátis, sem cadastro</p>
                                    <h2 id="modelos-titulo" className="vs-display vb-h2 !mt-2">
                                        Modelos de proposta para baixar
                                    </h2>
                                </div>
                                {POST_MODELOS && (
                                    <Link to={`/blog/${POST_MODELOS.slug}`} className="vb-link-claro" onClick={() => abrir(POST_MODELOS)}>
                                        Como montar cada parte <ArrowRight aria-hidden="true" />
                                    </Link>
                                )}
                            </div>
                            <ul className="vb-mini-modelos">
                                {MODELOS.map((m) => (
                                    <li key={m.titulo} className="vb-mini-modelo">
                                        <div className="vb-mini-modelo__previa">
                                            <img src={m.previa} alt="" loading="lazy" decoding="async" width={900} height={1273} />
                                        </div>
                                        <p className="vb-mini-modelo__titulo">{m.titulo}</p>
                                        <div className="vb-mini-modelo__arquivos">
                                            {m.arquivos.map((a) => (
                                                <a key={a.href} href={a.href} download className="vb-file vb-file--claro" onClick={() => cta(`download:${a.href.split("/").pop()}`)}>
                                                    <Download aria-hidden="true" />
                                                    {a.label.replace(/^Baixar (em )?/, "")}
                                                </a>
                                            ))}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <nav className="vb-modelos-faixa__mais" aria-label="Outros formatos de proposta">
                                {PROPOSTA_LANDINGS.map((l) => (
                                    <Link key={l.slug} to={`/${l.slug}`} className="vb-link-claro" onClick={() => cta(`landing:${l.slug}`)}>
                                        {l.formato} <ArrowRight aria-hidden="true" />
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    </section>
                )}

                <section className="vb-wrap pb-6 pt-14 md:pt-20" aria-label="Artigos">
                    {filtro !== "Todos" && (
                        <h2 className="vs-display vb-h2 !mt-0 mb-8">{filtro}</h2>
                    )}
                    <div key={filtro} className="grid gap-x-8 gap-y-12 md:grid-cols-2">
                        {resto.map((p, i) => (
                            <PostCard key={p.slug} post={p} i={i} onOpen={abrir} />
                        ))}
                    </div>
                </section>

                <div className="vb-wrap pb-6 pt-20">
                    <BlogCtaCard
                        titulo="Quantas propostas estão paradas no seu WhatsApp agora?"
                        onCta={() => cta("final")}
                    />
                </div>
            </main>

            <BlogFooter onSuporte={() => logLandingEvent("blog", "index", "whatsapp_click", { placement: "footer" })} />
        </div>
    );
};

export default BlogV2;
