import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Minus, X } from "lucide-react";
import { NavV2 } from "@/components/landing-v2/NavV2";
import { FooterV2 } from "@/components/landing-v2/FooterV2";
import { ButtonV2 } from "@/components/landing-v2/ButtonV2";
import { Reveal } from "@/components/landing-v2/Reveal";
import { FinalCtaV2 } from "@/components/landing-v2/FinalCtaV2";
import { trackBehavior } from "@/lib/analytics";
import content from "@/data/landing/alternativasContent.json";

type Level = "yes" | "no" | "partial";

const ORIGIN = "https://vyzon.com.br";
const CANONICAL = `${ORIGIN}/alternativas`;

const FAVICON = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

const LevelIcon = ({ level }: { level: Level }) => {
  if (level === "yes") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgba(21,86,192,0.12)", border: "1px solid rgba(21,86,192,0.28)" }}
        aria-label="Sim"
      >
        <Check className="h-3 w-3" style={{ color: "#1556C0" }} strokeWidth={3} />
      </span>
    );
  }
  if (level === "partial") {
    return (
      <span
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgba(180,140,40,0.1)", border: "1px solid rgba(180,140,40,0.25)" }}
        aria-label="Parcial"
      >
        <Minus className="h-3 w-3" style={{ color: "#a8892a" }} strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{ background: "rgba(5,5,5,0.04)", border: "1px solid rgba(5,5,5,0.12)" }}
      aria-label="Não"
    >
      <X className="h-3 w-3" style={{ color: "rgba(5,5,5,0.35)" }} strokeWidth={3} />
    </span>
  );
};

const Alternativas = () => {
  const navigate = useNavigate();
  const [scenario, setScenario] = useState(content.scenarios[0].id);

  const activeScenario = useMemo(
    () => content.scenarios.find((s) => s.id === scenario) ?? content.scenarios[0],
    [scenario],
  );

  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains("dark");
    html.classList.remove("dark");
    window.scrollTo(0, 0);

    document.title = content.seo.title;
    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) el.content = value;
    };
    setMeta('meta[name="description"]', content.seo.description);
    setMeta('meta[name="title"]', content.seo.title);
    setMeta('meta[property="og:title"]', content.seo.ogTitle);
    setMeta('meta[property="og:description"]', content.seo.ogDescription);
    setMeta('meta[property="og:url"]', CANONICAL);
    setMeta('meta[name="twitter:title"]', content.seo.ogTitle);
    setMeta('meta[name="twitter:description"]', content.seo.ogDescription);
    setMeta('meta[name="twitter:url"]', CANONICAL);
    const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (link) link.href = CANONICAL;

    trackBehavior("alternativas_hub_view", {});

    return () => {
      if (wasDark) html.classList.add("dark");
    };
  }, []);

  const goHome = (anchor?: string) => navigate(anchor ? `/?go=${anchor}` : "/");
  const openDemo = () => {
    trackBehavior("alternativas_cta", { target: "demo" });
    navigate("/?demo=1");
  };
  const goTrial = () => {
    trackBehavior("alternativas_cta", { target: "trial" });
    navigate("/criar-conta?plan=plus");
  };

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: content.seo.title,
        description: content.seo.description,
        url: CANONICAL,
        dateModified: content.updated,
        inLanguage: "pt-BR",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Vyzon", item: `${ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Alternativas", item: CANONICAL },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "ItemList",
        name: "Ferramentas comparadas",
        itemListElement: content.tools.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.name,
          url: `https://${t.domain}`,
        })),
      },
    ],
  };

  return (
    <div className="lp-v2 min-h-screen w-full" style={{ background: "var(--lp-paper)", color: "var(--lp-ink)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <NavV2
        onCTAClick={openDemo}
        onLoginClick={() => navigate("/auth")}
        onNavClick={(a) => goHome(a)}
        onBlogClick={() => navigate("/blog")}
      />

      {/* HERO */}
      <section className="relative overflow-hidden px-5 pb-16 pt-24 sm:pb-24 sm:pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0"
          style={{
            width: "min(1100px, 120vw)",
            aspectRatio: "1",
            transform: "translate(-50%, -42%)",
            background: "radial-gradient(circle at center, rgba(21,86,192,0.14), rgba(21,86,192,0.04) 42%, transparent 66%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="lp-mono landing-fade-in" style={{ color: "var(--lp-ink-55)" }}>
            {content.hero.eyebrow} · atualizado {content.updatedLabel}
          </p>
          <h1
            className="lp-display mx-auto mt-4 max-w-2xl landing-fade-in-up-lg landing-delay-100"
            style={{
              fontSize: "clamp(2rem, 5.2vw, 3.6rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              color: "#050505",
              textWrap: "balance",
            }}
          >
            {content.hero.h1Lead}
            <br />
            <span className="lp-serif" style={{ color: "rgba(5,5,5,0.72)" }}>
              {content.hero.h1Accent}
            </span>
          </h1>

          {/* BLUF — answer-first pra SEO/AI */}
          <p
            className="mx-auto mt-7 max-w-[640px] landing-fade-in-up landing-delay-200"
            style={{ fontSize: "clamp(1rem, 1.4vw, 1.125rem)", lineHeight: 1.6, color: "rgba(5,5,5,0.78)", fontWeight: 500 }}
          >
            {content.hero.bluf}
          </p>
          <p
            className="mx-auto mt-4 max-w-[560px] landing-fade-in-up landing-delay-300"
            style={{ fontSize: "0.95rem", lineHeight: 1.55, color: "rgba(5,5,5,0.58)" }}
          >
            {content.hero.sub}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row landing-fade-in-up landing-delay-300">
            <ButtonV2 onClick={openDemo} showArrow>
              Ver a EVA em ação
            </ButtonV2>
            <ButtonV2 variant="secondary" onClick={() => document.getElementById("tabela")?.scrollIntoView({ behavior: "smooth" })}>
              Ver a tabela
            </ButtonV2>
          </div>
        </div>
      </section>

      {/* CENÁRIOS */}
      <section className="px-5 pb-20 sm:pb-28" id="cenarios">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Veredito por cenário</p>
              <h2
                className="lp-display mt-3"
                style={{ fontSize: "clamp(1.7rem, 3.8vw, 2.6rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}
              >
                Qual ferramenta ganha no seu caso
              </h2>
            </div>
          </Reveal>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {content.scenarios.map((s) => {
              const active = s.id === scenario;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setScenario(s.id);
                    trackBehavior("alternativas_scenario", { scenario: s.id });
                  }}
                  className="vz-blog-filter rounded-full px-4 py-1.5 text-[13.5px] transition-colors"
                  style={
                    active
                      ? { background: "var(--lp-ink)", color: "#fff", fontWeight: 600 }
                      : { background: "transparent", color: "var(--lp-ink-90)", border: "1px solid var(--lp-line)" }
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          <Reveal delay={80}>
            <div
              className="mx-auto mt-8 max-w-2xl rounded-[20px] p-7 sm:p-9"
              style={{ background: "var(--lp-white)", border: "1px solid var(--lp-line)" }}
            >
              <p className="lp-mono text-[11px]" style={{ color: "var(--lp-blue)", letterSpacing: "0.06em" }}>
                RECOMENDAÇÃO
              </p>
              <p className="lp-display mt-2" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", letterSpacing: "-0.025em", color: "#050505" }}>
                {activeScenario.pick}
              </p>
              <p className="mt-3 text-[15px]" style={{ color: "rgba(5,5,5,0.66)", lineHeight: 1.6 }}>
                {activeScenario.why}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PIPEDRIVE VS PLOOMES — query do GSC */}
      <section id="pipedrive-vs-ploomes" className="px-5 pb-20 sm:pb-28" style={{ background: "rgba(21,86,192,0.035)" }}>
        <div className="mx-auto max-w-5xl py-16 sm:py-20">
          <Reveal>
            <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>A busca que já chega aqui</p>
            <h2
              className="lp-display mt-3 max-w-2xl"
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", lineHeight: 1.06, letterSpacing: "-0.035em", color: "#050505" }}
            >
              {content.vsFeatured.title}
            </h2>
            <p className="mt-4 max-w-xl text-[15px]" style={{ color: "rgba(5,5,5,0.62)", lineHeight: 1.55 }}>
              {content.vsFeatured.lead}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {content.vsFeatured.points.map((p, i) => (
              <Reveal key={p.title} delay={i * 70}>
                <article
                  className="vz-price-card h-full rounded-[18px] p-6"
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                  }}
                  style={{
                    background: "var(--lp-white)",
                    border: i === 2 ? "1.5px solid var(--lp-blue)" : "1px solid var(--lp-line)",
                  }}
                >
                  <h3 className="lp-display text-[1.2rem]" style={{ letterSpacing: "-0.02em", color: "#050505" }}>
                    {p.title}
                  </h3>
                  <p className="mt-3 text-[14px]" style={{ color: "rgba(5,5,5,0.64)", lineHeight: 1.55 }}>
                    {p.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TABELA */}
      <section id="tabela" className="px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Matriz</p>
              <h2
                className="lp-display mt-3"
                style={{ fontSize: "clamp(1.7rem, 3.8vw, 2.6rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}
              >
                Lado a lado, no que importa
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[15px]" style={{ color: "rgba(5,5,5,0.6)", lineHeight: 1.55 }}>
                HTML estático, legível por humanos e por buscadores. Onde o concorrente ganha, a gente diz.
              </p>
            </div>
          </Reveal>

          <Reveal delay={60}>
            <div className="mt-10 overflow-x-auto rounded-[16px]" style={{ border: "1px solid var(--lp-line)", background: "var(--lp-white)" }}>
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">
                  Comparativo entre Vyzon, Pipedrive, Ploomes, Kommo e RD Station
                </caption>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--lp-line)" }}>
                    <th className="px-4 py-4 text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--lp-ink-55)" }}>
                      Critério
                    </th>
                    {content.matrix.columns.map((col) => (
                      <th key={col.id} className="px-3 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <img src={FAVICON(col.domain)} alt="" width={20} height={20} className="rounded-sm" loading="lazy" />
                          <span className="text-[13px] font-semibold" style={{ color: "#050505" }}>
                            {col.name}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.matrix.rows.map((row) => (
                    <tr key={row.feature} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <th scope="row" className="px-4 py-4 text-[13.5px] font-medium" style={{ color: "rgba(5,5,5,0.88)", maxWidth: 220 }}>
                        {row.feature}
                      </th>
                      {content.matrix.columns.map((col) => {
                        const cell = row[col.id as keyof typeof row] as { level: Level; text: string };
                        return (
                          <td key={col.id} className="px-3 py-4 align-top">
                            <div className="flex flex-col items-center gap-1.5 text-center">
                              <LevelIcon level={cell.level} />
                              <span className="text-[12px] leading-snug" style={{ color: "rgba(5,5,5,0.55)", maxWidth: 110 }}>
                                {cell.text}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-center text-[12px]" style={{ color: "rgba(5,5,5,0.45)" }}>
              Preços e features de terceiros mudam. Confira nos sites oficiais antes de assinar.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CARDS POR FERRAMENTA */}
      <section id="ferramentas" className="px-5 pb-20 sm:pb-28">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="lp-mono" style={{ color: "var(--lp-ink-55)" }}>Por ferramenta</p>
              <h2
                className="lp-display mt-3"
                style={{ fontSize: "clamp(1.7rem, 3.8vw, 2.6rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}
              >
                Onde cada um brilha (e onde não)
              </h2>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {content.tools.map((tool, i) => (
              <Reveal key={tool.id} delay={(i % 2) * 60}>
                <article
                  className="vz-price-card flex h-full flex-col rounded-[20px] p-7"
                  onMouseMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
                    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
                  }}
                  style={{
                    background: "var(--lp-white)",
                    border: tool.id === "vyzon" ? "1.5px solid var(--lp-blue)" : "1px solid var(--lp-line)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <img src={FAVICON(tool.domain)} alt="" width={28} height={28} className="rounded-md" loading="lazy" />
                    <div>
                      <h3 className="lp-display text-[1.35rem]" style={{ letterSpacing: "-0.02em", color: "#050505" }}>
                        {tool.name}
                      </h3>
                      <p className="text-[13px]" style={{ color: "rgba(5,5,5,0.5)" }}>
                        {tool.tagline}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-[14px]" style={{ color: "rgba(5,5,5,0.66)", lineHeight: 1.55 }}>
                    {tool.bestFor}
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--lp-blue)" }}>
                        Ganha em
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {tool.wins.map((w) => (
                          <li key={w} className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(5,5,5,0.7)" }}>
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#1556C0" }} strokeWidth={2.5} />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(5,5,5,0.4)" }}>
                        Limite
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {tool.gaps.map((g) => (
                          <li key={g} className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(5,5,5,0.55)" }}>
                            <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "rgba(5,5,5,0.3)" }} strokeWidth={2.5} />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p
                    className="mt-5 rounded-xl px-3.5 py-2.5 text-[13px]"
                    style={{
                      background: tool.id === "vyzon" ? "rgba(21,86,192,0.08)" : "rgba(5,5,5,0.03)",
                      color: "rgba(5,5,5,0.72)",
                      lineHeight: 1.45,
                    }}
                  >
                    {tool.verdict}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 py-20 sm:py-28" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
        <div className="vz-faq mx-auto max-w-[820px]">
          <Reveal>
            <h2
              className="lp-display"
              style={{ fontSize: "clamp(1.9rem, 4vw, 2.7rem)", lineHeight: 1.08, letterSpacing: "-0.03em", color: "#050505" }}
            >
              Perguntas que a gente ouve
            </h2>
          </Reveal>
          <div className="mt-10">
            {content.faq.map((f) => (
              <details key={f.q} className="border-t py-5" style={{ borderColor: "rgba(0,0,0,0.10)" }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                  <span
                    className="lp-display"
                    style={{ fontSize: "clamp(1.1rem, 2vw, 1.35rem)", lineHeight: 1.25, letterSpacing: "-0.02em", color: "var(--lp-ink)" }}
                  >
                    {f.q}
                  </span>
                  <span className="vz-faq-plus shrink-0 text-[22px] leading-none" style={{ color: "rgba(5,5,5,0.4)", fontWeight: 300 }} aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[680px]" style={{ fontSize: "1rem", lineHeight: 1.6, color: "rgba(5,5,5,0.66)" }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* belief line */}
      <section className="px-5 pb-8">
        <p className="mx-auto max-w-2xl text-center lp-display" style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)", color: "rgba(5,5,5,0.55)", letterSpacing: "-0.02em" }}>
          {content.footerBelief}
        </p>
        <p className="mt-4 text-center text-[13px]">
          <Link to="/blog" className="vz-navlink" style={{ color: "var(--lp-blue)" }}>
            Ler o blog →
          </Link>
          {" · "}
          <button type="button" className="vz-navlink" style={{ color: "var(--lp-blue)" }} onClick={goTrial}>
            Testar o Pro 14 dias
          </button>
        </p>
      </section>

      <FinalCtaV2 onScheduleDemoClick={openDemo} onSecondaryClick={() => goHome("how-it-works")} />

      <FooterV2
        onNavClick={(a) => goHome(a)}
        onLoginClick={() => navigate("/auth")}
        onBlogClick={() => navigate("/blog")}
      />
    </div>
  );
};

export default Alternativas;
