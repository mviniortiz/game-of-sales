#!/usr/bin/env node
// Adiciona extensions (sitelinks + callouts + structured snippets) à conta Google Ads
// e linka à campanha Search. Subir Ad Rank é o fix principal pro 90% rank lost.
//
// Uso:
//   node scripts/ads-add-extensions.mjs            # dry-run
//   node scripts/ads-add-extensions.mjs --execute  # aplica
import { readFileSync } from "node:fs";

function loadEnv() {
    const env = {};
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return { ...process.env, ...env };
}
const env = loadEnv();
const DRY = !process.argv.includes("--execute");
const CUSTOMER = env.GOOGLE_ADS_CUSTOMER_ID;
const LOGIN = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
const DEV_TOKEN = env.GOOGLE_ADS_DEVELOPER_TOKEN;
const CAMPAIGN_ID = "23767172582";
const API = "https://googleads.googleapis.com/v21";

// Sitelinks — 4 (Google recomenda 4-6)
const SITELINKS = [
    {
        linkText: "Demo grátis 14 dias",
        description1: "Agende em 2 cliques",
        description2: "Sem cartão de crédito",
        finalUrls: ["https://vyzon.com.br/#demo"],
    },
    {
        linkText: "Pipeline + WhatsApp",
        description1: "CRM com WhatsApp nativo",
        description2: "Todo lead no funil",
        finalUrls: ["https://vyzon.com.br/"],
    },
    {
        linkText: "Gamificação em Vendas",
        description1: "Ranking ao vivo",
        description2: "Time batendo meta",
        finalUrls: ["https://vyzon.com.br/"],
    },
    {
        linkText: "Eva IA",
        description1: "SDR que não dorme",
        description2: "Qualifica e agenda sozinha",
        finalUrls: ["https://vyzon.com.br/"],
    },
];

// Callouts — até 25 caracteres cada
const CALLOUTS = [
    "Teste grátis 14 dias",
    "Sem cartão de crédito",
    "WhatsApp integrado",
    "Eva IA nativa",
    "Gamificação em vendas",
    "Suporte em português",
    "A partir de R$147/mês",
    "Setup em 1 dia",
];

// Structured snippets
const STRUCTURED_SNIPPETS = [
    {
        header: "Integrações",
        values: ["Hotmart", "Kiwify", "Greenn", "WhatsApp", "Mercado Pago", "Google Calendar"],
    },
    {
        header: "Tipos",
        values: ["Pipeline Kanban", "Ranking ao Vivo", "Gamificação", "IA Nativa", "WhatsApp CRM"],
    },
];

async function getAccessToken() {
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: env.GOOGLE_ADS_CLIENT_ID,
            client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
            refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
            grant_type: "refresh_token",
        }),
    });
    return (await res.json()).access_token;
}

async function apiCall(path, body, token) {
    const res = await fetch(`${API}/customers/${CUSTOMER}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "developer-token": DEV_TOKEN,
            "login-customer-id": LOGIN,
        },
        body: JSON.stringify({ ...body, partialFailure: true }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(j).slice(0, 400)}`);
    return j;
}

(async () => {
    console.log("━".repeat(65));
    console.log(DRY ? "DRY-RUN" : "EXECUTE");
    console.log("━".repeat(65));
    console.log(`\n${SITELINKS.length} sitelinks + ${CALLOUTS.length} callouts + ${STRUCTURED_SNIPPETS.length} structured snippets`);
    console.log(`→ linkar todos à campanha ${CAMPAIGN_ID}\n`);

    if (DRY) {
        console.log("Sitelinks:");
        SITELINKS.forEach((s) => console.log(`  • ${s.linkText} — ${s.description1} / ${s.description2}`));
        console.log("\nCallouts:");
        CALLOUTS.forEach((c) => console.log(`  • ${c}`));
        console.log("\nSnippets:");
        STRUCTURED_SNIPPETS.forEach((s) => console.log(`  • ${s.header}: ${s.values.join(", ")}`));
        console.log("\n— dry-run. rode com --execute pra aplicar.");
        return;
    }

    const token = await getAccessToken();

    // STEP 1: cria assets (sitelinks + callouts + snippets)
    console.log("▶ STEP 1/2: criando assets…");
    const assetOps = [
        ...SITELINKS.map((s) => ({
            create: {
                name: `Sitelink: ${s.linkText}`,
                sitelinkAsset: {
                    linkText: s.linkText,
                    description1: s.description1,
                    description2: s.description2,
                },
                finalUrls: s.finalUrls,
            },
        })),
        ...CALLOUTS.map((text) => ({
            create: {
                name: `Callout: ${text}`,
                calloutAsset: { calloutText: text },
            },
        })),
        ...STRUCTURED_SNIPPETS.map((s) => ({
            create: {
                name: `Snippet: ${s.header}`,
                structuredSnippetAsset: { header: s.header, values: s.values },
            },
        })),
    ];
    const assetRes = await apiCall("/assets:mutate", { operations: assetOps }, token);
    const assetIds = assetRes.results.map((r) => r.resourceName.split("/").pop());
    console.log(`  ✓ ${assetIds.length} assets criados`);

    // STEP 2: linkar à campanha via campaign_asset
    console.log("\n▶ STEP 2/2: linkando à campanha…");
    let i = 0;
    const campOps = [];
    for (const _ of SITELINKS) {
        campOps.push({
            create: {
                campaign: `customers/${CUSTOMER}/campaigns/${CAMPAIGN_ID}`,
                asset: `customers/${CUSTOMER}/assets/${assetIds[i++]}`,
                fieldType: "SITELINK",
            },
        });
    }
    for (const _ of CALLOUTS) {
        campOps.push({
            create: {
                campaign: `customers/${CUSTOMER}/campaigns/${CAMPAIGN_ID}`,
                asset: `customers/${CUSTOMER}/assets/${assetIds[i++]}`,
                fieldType: "CALLOUT",
            },
        });
    }
    for (const _ of STRUCTURED_SNIPPETS) {
        campOps.push({
            create: {
                campaign: `customers/${CUSTOMER}/campaigns/${CAMPAIGN_ID}`,
                asset: `customers/${CUSTOMER}/assets/${assetIds[i++]}`,
                fieldType: "STRUCTURED_SNIPPET",
            },
        });
    }
    const campRes = await apiCall("/campaignAssets:mutate", { operations: campOps }, token);
    console.log(`  ${campRes.results.length} links criados`);

    console.log("\nextensions completas. aguarda 24-48h pra Google re-avaliar Ad Rank.");
})().catch((e) => {
    console.error("\nerro:", e.message);
    process.exit(1);
});
