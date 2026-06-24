// Pós-build: gera dist/<slug>/index.html por config SEO. Vercel serve
// arquivos estáticos antes do rewrite SPA `/(.*) → /index.html`, então
// cada slug entrega seu próprio HTML com title, canonical, meta description,
// OG/twitter, JSON-LD e <noscript> rico — sem perder a hidratação React em
// cima (o mesmo bundle inicial é referenciado).
//
// Causa raiz do problema corrigido aqui: as 3 rotas SEO viviam só dentro
// do React, e o crawler que não executa JS recebia sempre o index.html
// da homepage, com title/canonical/<noscript> da home.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const TEMPLATE_PATH = path.join(DIST, "index.html");

// Landings SEO /crm-* DESPUBLICADAS em 2026-06-10 (posicionamento antigo,
// 301 → home no vercel.json). Configs preservados em src/pages/seo/configs/
// pra eventual republicação; basta reimportar e readicionar a CONFIGS.
// const { crmGamificadoConfig } = await import(
//     path.join(ROOT, "src/pages/seo/configs/crmGamificado.js")
// );
// const { crmComRankingConfig } = await import(
//     path.join(ROOT, "src/pages/seo/configs/crmComRanking.js")
// );
// const { crmParaTimesConfig } = await import(
//     path.join(ROOT, "src/pages/seo/configs/crmParaTimes.js")
// );

const CONFIGS = [];

// SEO-FIX 2026-06-15 — Search Console: "Página alternativa com tag canônica
// adequada". As rotas client-only (personas, comparativos, changelog, legal)
// caíam no rewrite do Vercel `/(.*) → /index.html`, herdando o canonical e o
// title da HOME no HTML cru. O Google as tratava como alternativas da home e
// não indexava. O CanonicalManager corrige no client, mas o crawler confia no
// HTML inicial. Aqui pré-renderizamos cada rota com canonical/title/description
// PRÓPRIOS no HTML servido (sem depender de JS). Títulos/descrições espelham o
// que cada página já define em document.title/meta (mantidos em sincronia).
// MANTER SINCRONIZADO com a allowlist do src/components/CanonicalManager.tsx.
const SIMPLE_ROUTES = [
    {
        slug: "changelog",
        seo: {
            title: "Changelog · Vyzon",
            description: "Novidades, melhorias e correções do Vyzon — a Central Comercial com EVA para agências que vendem por conversa.",
        },
    },
    {
        slug: "politica-privacidade",
        seo: {
            title: "Política de Privacidade | Vyzon",
            description: "Como o Vyzon coleta, usa e protege os dados pessoais, em conformidade com a LGPD.",
        },
    },
    {
        slug: "termos-de-servico",
        seo: {
            title: "Termos de Serviço | Vyzon",
            description: "Termos e condições de uso da plataforma Vyzon.",
        },
    },
];

const ORIGIN = "https://vyzon.com.br";

const escapeHtml = (s = "") =>
    s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const escapeAttr = (s = "") => escapeHtml(s);

function renderRichNoscript(config) {
    const url = `${ORIGIN}/${config.slug}`;
    const items = (arr) => arr.map((t) => `<li>${escapeHtml(t)}</li>`).join("\n          ");

    return `
  <noscript>
    <div style="max-width:960px;margin:0 auto;padding:32px 20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6;color:#111;">
      <header>
        <h1 style="font-size:34px;line-height:1.15;margin:0 0 12px;">${escapeHtml(config.hero.h1)}</h1>
        <p style="font-size:18px;color:#333;margin:0 0 16px;max-width:680px;">${escapeHtml(config.hero.subheadline)}</p>
        <p style="font-size:14px;color:#555;margin:0 0 20px;">${escapeHtml(config.hero.microcopy)}</p>
        <p style="margin:0 0 32px;">
          <a href="/onboarding?plan=plus" style="display:inline-block;padding:10px 18px;background:#00b25c;color:#fff;text-decoration:none;border-radius:8px;margin:0 6px 6px 0;"><strong>Testar grátis por 14 dias</strong></a>
          <a href="/#agendar-demo" style="display:inline-block;padding:10px 18px;border:1px solid #999;color:#111;text-decoration:none;border-radius:8px;">Agendar demonstração</a>
        </p>
      </header>

      <main>
        <section style="margin:0 0 32px;">
          <h2 style="font-size:22px;margin:0 0 8px;">${escapeHtml(config.pains.title)}</h2>
          ${config.pains.intro ? `<p style="color:#444;margin:0 0 12px;">${escapeHtml(config.pains.intro)}</p>` : ""}
          <ul style="padding-left:20px;color:#222;">
          ${items(config.pains.items)}
          </ul>
        </section>

        <section style="margin:0 0 32px;">
          <h2 style="font-size:22px;margin:0 0 8px;">${escapeHtml(config.mechanism.title)}</h2>
          ${config.mechanism.intro ? `<p style="color:#444;margin:0 0 12px;">${escapeHtml(config.mechanism.intro)}</p>` : ""}
          <ul style="padding-left:20px;color:#222;">
          ${config.mechanism.blocks.map((b) => `<li><strong>${escapeHtml(b.title)}:</strong> ${escapeHtml(b.body)}</li>`).join("\n          ")}
          </ul>
        </section>

        <section style="margin:0 0 32px;">
          <h2 style="font-size:22px;margin:0 0 8px;">${escapeHtml(config.comparison.title)}</h2>
          <h3 style="font-size:15px;margin:12px 0 4px;color:#a33;">Sem Vyzon</h3>
          <ul style="padding-left:20px;color:#222;">${items(config.comparison.without)}</ul>
          <h3 style="font-size:15px;margin:12px 0 4px;color:#0a7a45;">Com Vyzon</h3>
          <ul style="padding-left:20px;color:#222;">${items(config.comparison.withVyzon)}</ul>
        </section>

        <section style="margin:0 0 32px;">
          <h2 style="font-size:22px;margin:0 0 8px;">${escapeHtml(config.integrations.title)}</h2>
          <p style="color:#222;margin:0 0 8px;">${escapeHtml(config.integrations.body)}</p>
          <p style="margin:0;"><a href="/#integracoes" style="color:#0a7a45;">Ver lista completa de integrações disponíveis</a></p>
        </section>

        <section style="margin:0 0 32px;">
          <h2 style="font-size:22px;margin:0 0 8px;">${escapeHtml(config.faq.title)}</h2>
          ${config.faq.items
              .map(
                  (it) => `<h3 style="font-size:16px;margin:14px 0 4px;">${escapeHtml(it.q)}</h3>
          <p style="color:#222;margin:0;">${escapeHtml(it.a)}</p>`
              )
              .join("\n          ")}
        </section>

        ${
            config.related.length
                ? `<section style="margin:0 0 32px;">
          <h2 style="font-size:22px;margin:0 0 8px;">Continue lendo</h2>
          <ul style="padding-left:20px;color:#222;">
          ${config.related.map((r) => `<li><a href="${escapeAttr(r.href)}" style="color:#0a7a45;">${escapeHtml(r.label)}</a> — ${escapeHtml(r.description)}</li>`).join("\n          ")}
          </ul>
        </section>`
                : ""
        }

        <section style="margin:0 0 32px;">
          <h2 style="font-size:22px;margin:0 0 8px;">${escapeHtml(config.finalCta.title)}</h2>
          <p style="color:#444;margin:0 0 12px;">${escapeHtml(config.finalCta.body)}</p>
          <p style="margin:0;">
            <a href="/#agendar-demo" style="display:inline-block;padding:10px 18px;background:#00b25c;color:#fff;text-decoration:none;border-radius:8px;margin:0 6px 6px 0;"><strong>Agendar demonstração</strong></a>
            <a href="/onboarding?plan=plus" style="display:inline-block;padding:10px 18px;border:1px solid #999;color:#111;text-decoration:none;border-radius:8px;">Começar teste grátis</a>
          </p>
        </section>
      </main>

      <footer style="border-top:1px solid #eee;padding-top:20px;font-size:13px;color:#555;">
        <p style="margin:0 0 6px;"><strong>Vyzon</strong> — CRM de performance comercial com metas, ranking ao vivo, pipeline visual e automações.</p>
        <p style="margin:0;">
          <a href="/" style="color:#555;margin-right:12px;">Página inicial</a>
          <a href="/politica-privacidade" style="color:#555;margin-right:12px;">Política de Privacidade</a>
          <a href="/termos-de-servico" style="color:#555;margin-right:12px;">Termos de Serviço</a>
        </p>
        <p style="margin:8px 0 0;font-size:11px;color:#999;">Conteúdo: ${escapeHtml(url)}</p>
      </footer>
    </div>
  </noscript>`;
}

function renderJsonLd(config) {
    const url = `${ORIGIN}/${config.slug}`;
    const graph = [
        {
            "@type": "WebPage",
            name: config.seo.title,
            description: config.seo.description,
            url,
        },
        {
            "@type": "FAQPage",
            mainEntity: config.faq.items.map((it) => ({
                "@type": "Question",
                name: it.q,
                acceptedAnswer: { "@type": "Answer", text: it.a },
            })),
        },
        {
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Vyzon", item: `${ORIGIN}/` },
                { "@type": "ListItem", position: 2, name: config.seo.title, item: url },
            ],
        },
    ];
    return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

function rewriteHead(template, config) {
    const url = `${ORIGIN}/${config.slug}`;
    const title = escapeHtml(config.seo.title);
    const description = escapeHtml(config.seo.description);
    const ogTitle = escapeHtml(config.seo.ogTitle || config.seo.title);
    const ogDescription = escapeHtml(config.seo.ogDescription || config.seo.description);

    let html = template;

    // <title>
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);

    // <meta name="title">
    html = html.replace(
        /<meta name="title" content="[^"]*" \/>/,
        `<meta name="title" content="${title}" />`
    );

    // <meta name="description">
    html = html.replace(
        /<meta name="description"\s+content="[^"]*" \/>/,
        `<meta name="description"\n    content="${description}" />`
    );

    // canonical
    html = html.replace(
        /<link rel="canonical" href="[^"]*" \/>/,
        `<link rel="canonical" href="${url}" />`
    );

    // Open Graph
    html = html.replace(
        /<meta property="og:url" content="[^"]*" \/>/,
        `<meta property="og:url" content="${url}" />`
    );
    html = html.replace(
        /<meta property="og:title" content="[^"]*" \/>/,
        `<meta property="og:title" content="${ogTitle}" />`
    );
    html = html.replace(
        /<meta property="og:description"\s+content="[^"]*" \/>/,
        `<meta property="og:description"\n    content="${ogDescription}" />`
    );

    // Twitter
    html = html.replace(
        /<meta name="twitter:url" content="[^"]*" \/>/,
        `<meta name="twitter:url" content="${url}" />`
    );
    html = html.replace(
        /<meta name="twitter:title" content="[^"]*" \/>/,
        `<meta name="twitter:title" content="${ogTitle}" />`
    );
    html = html.replace(
        /<meta name="twitter:description"\s+content="[^"]*" \/>/,
        `<meta name="twitter:description"\n    content="${ogDescription}" />`
    );

    return html;
}

function rewriteBody(html, config) {
    // Remove TODOS os blocos <noscript> exceto o do Meta Pixel (que tem facebook.com/tr).
    // O index.html da home tem 2: pixel fallback (mantido) + landing fallback (substituído).
    html = html.replace(/<noscript>([\s\S]*?)<\/noscript>/g, (match) => {
        if (match.includes("facebook.com/tr")) return match;
        return ""; // remove fallback genérico da home
    });

    // Injeta o noscript específico desta SEO landing antes do </body>.
    const seoNoscript = renderRichNoscript(config);
    html = html.replace("</body>", `${seoNoscript}\n</body>`);

    // Injeta JSON-LD específico antes de </head>. O index.html já tem 3
    // JSON-LDs da home (SoftwareApplication, Organization, FAQPage). Mantemos
    // o Organization (mesma marca), removemos o SoftwareApplication e o
    // FAQPage da home (que é da home, não desta página) e adicionamos o
    // WebPage + FAQPage + BreadcrumbList desta landing SEO.
    html = html.replace(
        /<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"SoftwareApplication"[\s\S]*?<\/script>/,
        ""
    );
    html = html.replace(
        /<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"FAQPage"[\s\S]*?<\/script>/,
        ""
    );

    const seoJsonLd = renderJsonLd(config);
    html = html.replace("</head>", `  ${seoJsonLd}\n</head>`);

    return html;
}

async function buildOne(config) {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    let html = rewriteHead(template, config);
    html = rewriteBody(html, config);

    const outDir = path.join(DIST, config.slug);
    if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), html, "utf8");
    console.log(`✓ dist/${config.slug}/index.html  (${html.length.toLocaleString()} bytes)`);
}

// Prerender LEVE: só reescreve o <head> SEO (title, description, canonical,
// OG/twitter) por rota, sem exigir os blocos ricos (pains/mechanism/faq...).
// Remove o <noscript> genérico da home (mantém o do pixel) pra um crawler sem
// JS não ver o conteúdo da home sob uma URL de comparativo/persona. O React
// hidrata e renderiza a página real da rota normalmente.
async function buildSimple(config) {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    let html = rewriteHead(template, config);
    // Remove noscripts que não sejam o do Meta Pixel (facebook.com/tr).
    html = html.replace(/<noscript>([\s\S]*?)<\/noscript>/g, (match) =>
        match.includes("facebook.com/tr") ? match : ""
    );
    const outDir = path.join(DIST, config.slug);
    if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), html, "utf8");
    console.log(`✓ dist/${config.slug}/index.html  (self-canonical, ${html.length.toLocaleString()} bytes)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOG (rota /blog e /blog/<slug>)
//
// Os posts são client-only no React (BlogPostV2 nem seta document.title), então
// um crawler sem JS recebia o HTML da home. Aqui pré-renderizamos cada post com
// title/description/canonical/OG próprios + o CORPO INTEIRO do artigo no
// <noscript> (texto real, rastreável) + JSON-LD BlogPosting. A página /blog
// vira um índice indexável que linka pros posts.
//
// FONTE ÚNICA: lê o mesmo JSON que o React consome (src/data/landing/
// blogPosts.content.json) — editar conteúdo num lugar só, sem drift.
const BLOG_POSTS = JSON.parse(
    await readFile(path.join(ROOT, "src/data/landing/blogPosts.content.json"), "utf8")
);

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
function formatBlogDate(iso) {
    const [y, m, d] = String(iso).split("-").map(Number);
    if (!y || !m || !d) return iso;
    return `${d} de ${MESES[m - 1]} de ${y}`;
}

function renderBlogBlock(b) {
    if (b.type === "h2") return `<h2 style="font-size:21px;line-height:1.3;margin:30px 0 10px;">${escapeHtml(b.text)}</h2>`;
    if (b.type === "h3") return `<h3 style="font-size:17px;line-height:1.35;margin:22px 0 8px;">${escapeHtml(b.text)}</h3>`;
    if (b.type === "ul") return `<ul style="padding-left:20px;color:#222;margin:0 0 16px;">${b.items.map((it) => `<li style="margin:0 0 8px;">${escapeHtml(it)}</li>`).join("")}</ul>`;
    if (b.type === "ol") return `<ol style="padding-left:22px;color:#222;margin:0 0 16px;">${b.items.map((it) => `<li style="margin:0 0 10px;">${escapeHtml(it)}</li>`).join("")}</ol>`;
    if (b.type === "quote") return `<blockquote style="margin:24px 0;padding:4px 0 4px 18px;border-left:3px solid #1556C0;color:#111;font-style:italic;font-size:19px;">${escapeHtml(b.text)}</blockquote>`;
    if (b.type === "example") return `<aside style="margin:22px 0;padding:18px 20px;border:1px solid #e6e4dd;border-left:3px solid #1556C0;border-radius:10px;background:#fafafa;"><p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#1556C0;margin:0 0 6px;font-weight:600;">Exemplo</p><p style="font-weight:600;color:#111;margin:0 0 10px;">${escapeHtml(b.title)}</p>${b.body.map((t) => `<p style="color:#333;margin:0 0 10px;">${escapeHtml(t)}</p>`).join("")}</aside>`;
    return `<p style="color:#222;margin:0 0 16px;">${escapeHtml(b.text)}</p>`;
}

function renderBlogPostNoscript(post) {
    const paras = post.content.map(renderBlogBlock).join("\n          ");
    return `
  <noscript>
    <div style="max-width:720px;margin:0 auto;padding:32px 20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.7;color:#111;">
      <p style="margin:0 0 16px;font-size:13px;"><a href="/blog" style="color:#1556C0;">← Blog da Vyzon</a></p>
      <article>
        <p style="font-size:13px;color:#555;margin:0 0 8px;">${escapeHtml(post.category)} · ${escapeHtml(formatBlogDate(post.date))}</p>
        <h1 style="font-size:32px;line-height:1.15;margin:0 0 14px;">${escapeHtml(post.title)}</h1>
        <p style="font-size:18px;color:#333;margin:0 0 24px;">${escapeHtml(post.excerpt)}</p>
          ${paras}
        <p style="margin:28px 0 0;">
          <a href="/onboarding?plan=plus" style="display:inline-block;padding:10px 18px;background:#1556C0;color:#fff;text-decoration:none;border-radius:8px;margin:0 6px 6px 0;"><strong>Testar 14 dias grátis</strong></a>
          <a href="/?demo=1" style="display:inline-block;padding:10px 18px;border:1px solid #999;color:#111;text-decoration:none;border-radius:8px;">Ver a EVA em ação</a>
        </p>
      </article>
      <footer style="border-top:1px solid #eee;margin-top:28px;padding-top:20px;font-size:13px;color:#555;">
        <p style="margin:0;"><strong>Vyzon</strong>, Central Comercial com EVA para agências que vendem por conversa.</p>
      </footer>
    </div>
  </noscript>`;
}

function renderBlogPostJsonLd(post) {
    const url = `${ORIGIN}/blog/${post.slug}`;
    const graph = [
        {
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            image: `${ORIGIN}/blog-covers/${post.slug}.jpg`,
            datePublished: post.date,
            dateModified: post.date,
            articleSection: post.category,
            inLanguage: "pt-BR",
            url,
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "Vyzon", url: `${ORIGIN}/` },
            publisher: {
                "@type": "Organization",
                name: "Vyzon",
                url: `${ORIGIN}/`,
                logo: { "@type": "ImageObject", url: `${ORIGIN}/icon-512.png` },
            },
        },
        {
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Vyzon", item: `${ORIGIN}/` },
                { "@type": "ListItem", position: 2, name: "Blog", item: `${ORIGIN}/blog` },
                { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
        },
    ];
    return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
}

// Remove os JSON-LD da HOME (SoftwareApplication + FAQPage) que não pertencem a
// esta página; mantém o Organization. Mesma estratégia do rewriteBody.
function stripHomeJsonLd(html) {
    html = html.replace(
        /<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"SoftwareApplication"[\s\S]*?<\/script>/,
        ""
    );
    html = html.replace(
        /<script type="application\/ld\+json">\s*\{\s*"@context":\s*"https:\/\/schema\.org",\s*"@type":\s*"FAQPage"[\s\S]*?<\/script>/,
        ""
    );
    return html;
}

// Remove todos os <noscript> da home menos o do Meta Pixel (facebook.com/tr).
function stripHomeNoscripts(html) {
    return html.replace(/<noscript>([\s\S]*?)<\/noscript>/g, (m) =>
        m.includes("facebook.com/tr") ? m : ""
    );
}

async function buildBlogPost(post) {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    const config = {
        slug: `blog/${post.slug}`,
        seo: { title: `${post.title} · Vyzon`, description: post.excerpt },
    };
    let html = rewriteHead(template, config);
    // posts são artigos
    html = html.replace(/<meta property="og:type" content="[^"]*" \/>/, `<meta property="og:type" content="article" />`);
    // og:image / twitter:image próprios (capa do post, 1200x630). width/height da
    // home já são 1200/630, então não precisam mudar.
    const ogImg = `${ORIGIN}/blog-covers/${post.slug}.jpg`;
    html = html.replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${ogImg}" />`);
    html = html.replace(/<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${ogImg}" />`);
    html = stripHomeNoscripts(html);
    html = html.replace("</body>", `${renderBlogPostNoscript(post)}\n</body>`);
    html = stripHomeJsonLd(html);
    html = html.replace("</head>", `  ${renderBlogPostJsonLd(post)}\n</head>`);

    const outDir = path.join(DIST, "blog", post.slug);
    if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), html, "utf8");
    console.log(`✓ dist/blog/${post.slug}/index.html  (${html.length.toLocaleString()} bytes)`);
}

async function buildBlogIndex(posts) {
    const template = await readFile(TEMPLATE_PATH, "utf8");
    const config = {
        slug: "blog",
        seo: {
            title: "Blog · Vyzon",
            description: "Ideias sobre vender por conversa, qualificar leads no WhatsApp e usar IA sem perder o controle do seu time.",
        },
    };
    let html = rewriteHead(template, config);
    html = stripHomeNoscripts(html);
    const list = posts
        .map((p) => `<li style="margin:0 0 14px;"><a href="/blog/${escapeAttr(p.slug)}" style="color:#1556C0;font-weight:600;">${escapeHtml(p.title)}</a><br /><span style="color:#444;">${escapeHtml(p.excerpt)}</span></li>`)
        .join("\n          ");
    const noscript = `
  <noscript>
    <div style="max-width:760px;margin:0 auto;padding:32px 20px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6;color:#111;">
      <h1 style="font-size:34px;line-height:1.15;margin:0 0 8px;">Blog da Vyzon</h1>
      <p style="font-size:17px;color:#333;margin:0 0 24px;">Ideias sobre vender por conversa, qualificar leads no WhatsApp e usar IA sem perder o controle do seu time.</p>
      <ul style="padding-left:20px;">
          ${list}
      </ul>
    </div>
  </noscript>`;
    html = html.replace("</body>", `${noscript}\n</body>`);
    html = stripHomeJsonLd(html);
    const blogGraph = {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "Blog da Vyzon",
        url: `${ORIGIN}/blog`,
        inLanguage: "pt-BR",
        blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            description: p.excerpt,
            datePublished: p.date,
            url: `${ORIGIN}/blog/${p.slug}`,
        })),
    };
    html = html.replace("</head>", `  <script type="application/ld+json">${JSON.stringify(blogGraph)}</script>\n</head>`);

    const outDir = path.join(DIST, "blog");
    if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, "index.html"), html, "utf8");
    console.log(`✓ dist/blog/index.html  (${html.length.toLocaleString()} bytes)`);
}

if (!existsSync(TEMPLATE_PATH)) {
    console.error(`✗ ${TEMPLATE_PATH} não encontrado. Rode 'vite build' primeiro.`);
    process.exit(1);
}

console.log("Prerender SEO landings...\n");
for (const cfg of CONFIGS) {
    await buildOne(cfg);
}
for (const cfg of SIMPLE_ROUTES) {
    await buildSimple(cfg);
}
await buildBlogIndex(BLOG_POSTS);
for (const post of BLOG_POSTS) {
    await buildBlogPost(post);
}
console.log("\nDone.");
