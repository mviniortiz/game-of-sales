import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Wrench, Plus, ArrowUpRight } from "lucide-react";
import { ThemeLogo } from "@/components/ui/ThemeLogo";
import { CHANGELOG, type ChangelogTag } from "@/data/changelog";

const TAG_STYLE: Record<
  ChangelogTag,
  { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }
> = {
  shipped: {
    label: "Shipped",
    bg: "rgba(0,227,122,0.08)",
    text: "#34e398",
    border: "rgba(0,227,122,0.25)",
    icon: CheckCircle2,
  },
  feature: {
    label: "Feature",
    bg: "rgba(21,86,192,0.14)",
    text: "#6ea6ff",
    border: "rgba(21,86,192,0.35)",
    icon: Plus,
  },
  improvement: {
    label: "Melhoria",
    bg: "rgba(136,146,176,0.12)",
    text: "#c2cbe3",
    border: "rgba(136,146,176,0.25)",
    icon: ArrowUpRight,
  },
  fix: {
    label: "Fix",
    bg: "rgba(242,170,76,0.10)",
    text: "#f2aa4c",
    border: "rgba(242,170,76,0.30)",
    icon: Wrench,
  },
};

const MONTHS_PT: Record<string, string> = {
  "01": "janeiro",
  "02": "fevereiro",
  "03": "março",
  "04": "abril",
  "05": "maio",
  "06": "junho",
  "07": "julho",
  "08": "agosto",
  "09": "setembro",
  "10": "outubro",
  "11": "novembro",
  "12": "dezembro",
};

const formatLongDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  const day = Number(d);
  return `${day} de ${MONTHS_PT[m]}, ${y}`;
};

export default function Changelog() {
  useEffect(() => {
    document.title = "Changelog · Vyzon";
    const meta =
      document.querySelector<HTMLMetaElement>("meta[name='description']") ??
      (() => {
        const m = document.createElement("meta");
        m.name = "description";
        document.head.appendChild(m);
        return m;
      })();
    meta.content =
      "O que a gente enviou pra produção no Vyzon. Features novas, melhorias e correções, semana a semana.";
  }, []);

  const entries = useMemo(
    () => [...CHANGELOG].sort((a, b) => b.date.localeCompare(a.date)),
    [],
  );

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--vyz-bg, #06080a)", color: "var(--vyz-text-primary, #e6e9ef)" }}
    >
      <style>{`
        @keyframes vyz-pulse-dot {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes vyz-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes vyz-float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(0.3deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .vyz-animate-pulse-dot,
          .vyz-animate-shimmer,
          .vyz-animate-float { animation: none !important; }
        }
      `}</style>

      {/* Full-page dot grid */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.15) 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.15) 100%)",
        }}
      />

      {/* Top accent line with shimmer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden"
      >
        <div
          className="vyz-animate-shimmer absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(0,227,122,0.15) 20%, rgba(0,227,122,0.9) 50%, rgba(0,227,122,0.15) 80%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: "vyz-shimmer 6s linear infinite",
          }}
        />
      </div>

      {/* Ambient green radial at top */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 w-[1100px] h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(0,227,122,0.14) 0%, rgba(0,227,122,0.06) 30%, rgba(0,227,122,0) 65%)",
        }}
      />

      {/* Secondary blue radial bottom-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-[700px] w-[600px] h-[600px]"
        style={{
          background:
            "radial-gradient(circle at 30% 50%, rgba(21,86,192,0.10) 0%, rgba(21,86,192,0.04) 40%, transparent 70%)",
        }}
      />

      {/* Secondary green radial bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-[1400px] w-[600px] h-[600px]"
        style={{
          background:
            "radial-gradient(circle at 70% 50%, rgba(0,227,122,0.08) 0%, rgba(0,227,122,0.03) 40%, transparent 70%)",
        }}
      />

      {/* Vertical rules grid (multiple columns) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden md:block"
      >
        {[18, 34, 66, 82].map((pct, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${pct}%`,
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.06) 15%, rgba(255,255,255,0.06) 85%, transparent 100%)",
            }}
          />
        ))}
      </div>

      {/* Floating pulse dots scattered */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        {[
          { top: 180, left: "14%", delay: "0s", color: "rgba(0,227,122,0.9)" },
          { top: 420, left: "86%", delay: "1.2s", color: "rgba(0,227,122,0.8)" },
          { top: 780, left: "10%", delay: "0.4s", color: "rgba(110,166,255,0.9)" },
          { top: 1120, left: "88%", delay: "2.0s", color: "rgba(0,227,122,0.8)" },
          { top: 1520, left: "12%", delay: "0.9s", color: "rgba(110,166,255,0.7)" },
          { top: 1880, left: "84%", delay: "1.6s", color: "rgba(0,227,122,0.9)" },
        ].map((d, i) => (
          <span
            key={i}
            className="vyz-animate-pulse-dot absolute block"
            style={{
              top: d.top,
              left: d.left,
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: d.color,
              boxShadow: `0 0 12px ${d.color}`,
              animation: `vyz-pulse-dot 3.2s ease-in-out ${d.delay} infinite`,
            }}
          />
        ))}
      </div>

      {/* Diagonal accent lines top-right corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 w-[360px] h-[360px] hidden md:block overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(135deg, transparent 0px, transparent 14px, rgba(255,255,255,0.035) 14px, rgba(255,255,255,0.035) 15px)",
          maskImage:
            "radial-gradient(circle at 100% 0%, rgba(0,0,0,0.9) 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle at 100% 0%, rgba(0,0,0,0.9) 0%, transparent 70%)",
        }}
      />

      {/* Vertical version markers on the right */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-6 top-32 text-[10px] tracking-[0.35em] uppercase hidden xl:flex flex-col gap-12"
        style={{ color: "rgba(255,255,255,0.22)", fontWeight: 700, writingMode: "vertical-rl" }}
      >
        <span style={{ color: "rgba(0,227,122,0.45)" }}>v.2026.04</span>
        <span>v.2026.03</span>
        <span style={{ color: "rgba(255,255,255,0.12)" }}>v.2026.02</span>
      </div>

      {/* Corner bracket top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-20 left-6 hidden lg:block"
        style={{
          width: 40,
          height: 40,
          borderTop: "1px solid rgba(0,227,122,0.35)",
          borderLeft: "1px solid rgba(0,227,122,0.35)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-20 right-6 hidden lg:block"
        style={{
          width: 40,
          height: 40,
          borderTop: "1px solid rgba(0,227,122,0.35)",
          borderRight: "1px solid rgba(0,227,122,0.35)",
        }}
      />

      {/* Content wrapper above the background */}
      <div className="relative z-10">
      {/* Nav minimal */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: "rgba(6,8,10,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderColor: "var(--vyz-border, rgba(255,255,255,0.06))",
        }}
      >
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ThemeLogo className="h-6 w-auto" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
            style={{ color: "var(--vyz-text-muted, #8892b0)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Voltar pra home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-5 pt-16 pb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-6"
          style={{
            background: "rgba(0,227,122,0.08)",
            color: "#34e398",
            border: "1px solid rgba(0,227,122,0.20)",
            fontWeight: 600,
            letterSpacing: "0.08em",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Building in public
        </div>
        <h1
          className="text-4xl sm:text-5xl tracking-tight mb-4"
          style={{ fontWeight: 700, lineHeight: 1.1 }}
        >
          Changelog
        </h1>
        <p
          className="text-base sm:text-lg max-w-xl"
          style={{ color: "var(--vyz-text-muted, #8892b0)", lineHeight: 1.6 }}
        >
          O que a gente enviou pra produção no Vyzon. Features novas, melhorias e
          correções, semana a semana.
        </p>
      </section>

      {/* Timeline */}
      <section className="max-w-3xl mx-auto px-5 pb-32">
        <div className="relative">
          <div
            className="absolute left-[7px] top-2 bottom-2 w-px hidden sm:block"
            style={{ background: "var(--vyz-border, rgba(255,255,255,0.06))" }}
          />
          <div className="space-y-14">
            {entries.map((entry) => (
              <article key={entry.date} className="relative sm:pl-10">
                <span
                  className="hidden sm:block absolute left-0 top-2 w-[15px] h-[15px] rounded-full"
                  style={{
                    background: "var(--vyz-bg, #06080a)",
                    border: "2px solid rgba(0,227,122,0.55)",
                    boxShadow: "0 0 0 4px rgba(0,227,122,0.08)",
                  }}
                />

                <p
                  className="text-xs uppercase tracking-wider mb-2"
                  style={{
                    color: "var(--vyz-text-soft, #6a7690)",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                  }}
                >
                  {formatLongDate(entry.date)}
                </p>
                <h2
                  className="text-xl sm:text-2xl tracking-tight mb-3"
                  style={{ fontWeight: 600, color: "var(--vyz-text-strong, #ffffff)" }}
                >
                  {entry.title}
                </h2>
                {entry.summary && (
                  <p
                    className="text-sm sm:text-base mb-5"
                    style={{ color: "var(--vyz-text-muted, #8892b0)", lineHeight: 1.6 }}
                  >
                    {entry.summary}
                  </p>
                )}

                <ul className="space-y-3">
                  {entry.items.map((item, i) => {
                    const meta = TAG_STYLE[item.tag];
                    const Icon = meta.icon;
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <span
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider shrink-0 mt-0.5"
                          style={{
                            background: meta.bg,
                            color: meta.text,
                            border: `1px solid ${meta.border}`,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            minWidth: 88,
                          }}
                        >
                          <Icon className="h-3 w-3" strokeWidth={2.5} />
                          {meta.label}
                        </span>
                        <p
                          className="text-sm sm:text-[15px]"
                          style={{
                            color: "var(--vyz-text-strong, #e6e9ef)",
                            lineHeight: 1.55,
                          }}
                        >
                          {item.text}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div
          className="mt-20 p-8 rounded-2xl text-center"
          style={{
            background: "var(--vyz-surface-1, rgba(255,255,255,0.02))",
            border: "1px solid var(--vyz-border, rgba(255,255,255,0.06))",
          }}
        >
          <p
            className="text-sm mb-4"
            style={{ color: "var(--vyz-text-muted, #8892b0)" }}
          >
            Quer ver tudo isso rodando?
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm transition-all"
            style={{
              background: "var(--vyz-accent, #00e37a)",
              color: "#06080a",
              fontWeight: 600,
            }}
          >
            Agendar uma demo
          </Link>
        </div>
      </section>
      </div>
    </div>
  );
}
