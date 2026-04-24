#!/usr/bin/env node
// Guerrilla de Search pra R$30/dia:
//  (a) Pausa 3 keywords caras que competem com hubspot/ploomes/agendor
//  (b) Adiciona 12 keywords de nicho barato (infoprodutores + alternativas + gamificação)
//  (c) Troca bidding strategy TARGET_SPEND (Maximize Clicks) → MANUAL_CPC bid R$1
//
// Uso:
//   node scripts/ads-search-guerrilla.mjs            # dry-run
//   node scripts/ads-search-guerrilla.mjs --execute
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
const AD_GROUP_ID = "199510629510";
const API = "https://googleads.googleapis.com/v21";

const PAUSE_KEYWORDS = [
    "customers/3014873882/adGroupCriteria/199510629510~2470864131", // crm comercial
    "customers/3014873882/adGroupCriteria/199510629510~334165429816", // comercial crm
    "customers/3014873882/adGroupCriteria/199510629510~335296647078", // crm gestão comercial
];

const NEW_KEYWORDS = [
    "crm hotmart",
    "crm greenn",
    "crm para infoprodutores",
    "crm para infoprodutor",
    "crm infoprodutos",
    "alternativa agendor",
    "alternativa ploomes",
    "alternativa kommo",
    "alternativa moskit",
    "ranking de vendas",
    "ranking vendedores",
    "gamificação comercial",
];

// R$1.00 = 1_000_000 micros
const DEFAULT_CPC_BID_MICROS = 1_000_000;

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
    if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(j).slice(0, 500)}`);
    return j;
}

(async () => {
    console.log("=".repeat(65));
    console.log(DRY ? "DRY-RUN" : "EXECUTE");
    console.log("=".repeat(65));
    console.log("\n(a) Pausar 3 keywords caras:");
    console.log("  - crm comercial [PHRASE]");
    console.log("  - comercial crm [PHRASE]");
    console.log("  - crm gestão comercial [PHRASE]");
    console.log(`\n(b) Adicionar ${NEW_KEYWORDS.length} PHRASE novas (bid R$1.00):`);
    NEW_KEYWORDS.forEach((k) => console.log(`  + ${k}`));
    console.log("\n(c) Bidding: TARGET_SPEND (Maximize Clicks) -> MANUAL_CPC (Manual CPC, eCPC off)");
    console.log(`    Ad Group default bid: R$0.01 -> R$${(DEFAULT_CPC_BID_MICROS / 1e6).toFixed(2)}`);
    console.log();

    if (DRY) {
        console.log("dry-run. rode com --execute pra aplicar.");
        return;
    }

    const token = await getAccessToken();

    // STEP 1: pausa 3 keywords + adiciona 12 novas com bid R$1
    console.log("STEP 1/3: pause 3 + add 12 keywords...");
    const adGroupCritOps = [
        ...PAUSE_KEYWORDS.map((rn) => ({
            updateMask: "status",
            update: { resourceName: rn, status: "PAUSED" },
        })),
        ...NEW_KEYWORDS.map((text) => ({
            create: {
                adGroup: `customers/${CUSTOMER}/adGroups/${AD_GROUP_ID}`,
                status: "ENABLED",
                cpcBidMicros: DEFAULT_CPC_BID_MICROS,
                keyword: { text, matchType: "PHRASE" },
            },
        })),
    ];
    const r1 = await apiCall("/adGroupCriteria:mutate", { operations: adGroupCritOps }, token);
    const ok1 = (r1.results || []).filter((x) => x.resourceName).length;
    console.log(`  ${ok1}/${adGroupCritOps.length} ops aplicadas`);
    if (r1.partialFailureError) {
        console.log("  partial:", JSON.stringify(r1.partialFailureError).slice(0, 300));
    }

    // STEP 2: ad_group default bid -> R$1.00
    console.log("\nSTEP 2/3: ad_group default bid R$1...");
    const r2 = await apiCall(
        "/adGroups:mutate",
        {
            operations: [
                {
                    updateMask: "cpcBidMicros",
                    update: {
                        resourceName: `customers/${CUSTOMER}/adGroups/${AD_GROUP_ID}`,
                        cpcBidMicros: DEFAULT_CPC_BID_MICROS,
                    },
                },
            ],
        },
        token,
    );
    console.log(`  ${r2.results?.length || 0} ad_group atualizado`);

    // STEP 3: campanha bidding -> MANUAL_CPC
    console.log("\nSTEP 3/3: bidding strategy -> MANUAL_CPC...");
    const r3 = await apiCall(
        "/campaigns:mutate",
        {
            operations: [
                {
                    updateMask: "manualCpc",
                    update: {
                        resourceName: `customers/${CUSTOMER}/campaigns/${CAMPAIGN_ID}`,
                        manualCpc: { enhancedCpcEnabled: false },
                    },
                },
            ],
        },
        token,
    );
    console.log(`  ${r3.results?.length || 0} campanha atualizada`);

    console.log("\nguerrilla completo.");
    console.log("expectativa em 24-48h:");
    console.log("  - tras nichos baratos = impression share maior em queries qualificadas");
    console.log("  - CPC vai variar de R$0.30 a R$1.00");
    console.log("  - volume de cliques pode cair um pouco, mas qualidade sobe");
})().catch((e) => {
    console.error("\nerro:", e.message);
    process.exit(1);
});
