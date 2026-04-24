#!/usr/bin/env node
// Refino da Search VYZON - ABR 26:
//  (a) Remove keyword positiva "hubspot" (2 resource names)
//  (b) Converte 23 EXACT negativas de concorrentes → PHRASE (pega variações tipo "ploomes crm")
//  (c) Adiciona 7 novas PHRASE negativas pra termos informacionais/irrelevantes
//
// Uso:
//   node scripts/ads-search-refinements.mjs            # dry-run
//   node scripts/ads-search-refinements.mjs --execute  # aplica
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

// (a) positiva hubspot pra remover (2 resource names encontrados)
const REMOVE_POSITIVE = [
    "customers/3014873882/adGroupCriteria/199510629510~4748807689",
    "customers/3014873882/adGroupCriteria/199510629510~11508484610",
];

// (b) 23 EXACT negativas pra REMOVER + 21 PHRASE novas pra ADICIONAR
// (pulei "bluve" e "orum" — já existem como PHRASE, evitar duplicata)
const REMOVE_EXACT_NEGATIVES = [
    "customers/3014873882/campaignCriteria/23767172582~21737106",   // braze
    "customers/3014873882/campaignCriteria/23767172582~44198690",   // nectar
    "customers/3014873882/campaignCriteria/23767172582~77979568",   // clint
    "customers/3014873882/campaignCriteria/23767172582~335088867",  // komo
    "customers/3014873882/campaignCriteria/23767172582~569039570",  // orum
    "customers/3014873882/campaignCriteria/23767172582~1303501272", // zoho
    "customers/3014873882/campaignCriteria/23767172582~2027345969", // capys
    "customers/3014873882/campaignCriteria/23767172582~2711616141", // moskit
    "customers/3014873882/campaignCriteria/23767172582~5149167707", // bitrix
    "customers/3014873882/campaignCriteria/23767172582~301085614969", // bogman
    "customers/3014873882/campaignCriteria/23767172582~301525045428", // rd station
    "customers/3014873882/campaignCriteria/23767172582~301556670141", // ploomes
    "customers/3014873882/campaignCriteria/23767172582~313252272424", // agendor
    "customers/3014873882/campaignCriteria/23767172582~313252272464", // agendor crm
    "customers/3014873882/campaignCriteria/23767172582~313701592476", // aace
    "customers/3014873882/campaignCriteria/23767172582~333249393562", // bigin
    "customers/3014873882/campaignCriteria/23767172582~366478696723", // kommo
    "customers/3014873882/campaignCriteria/23767172582~370118183734", // nectar crm
    "customers/3014873882/campaignCriteria/23767172582~401458197265", // bluve
    "customers/3014873882/campaignCriteria/23767172582~501721041992", // pipefy
    "customers/3014873882/campaignCriteria/23767172582~849777219817", // atendezap
    "customers/3014873882/campaignCriteria/23767172582~926594862692", // chatpro
    "customers/3014873882/campaignCriteria/23767172582~2366211264840", // utimify
];

// PHRASE novas a partir das EXACTs (21 — pulei bluve e orum)
const ADD_PHRASE_COMPETITORS = [
    "braze", "nectar", "clint", "komo", "zoho", "capys", "moskit", "bitrix",
    "bogman", "rd station", "ploomes", "agendor", "aace", "bigin", "kommo",
    "pipefy", "atendezap", "chatpro", "utimify", "hubspot", "salesforce",
];

// (c) 7 novas PHRASE pra termos que vazaram depois das últimas negativas
const ADD_PHRASE_NEW = [
    "o que significa",
    "os sistemas",
    "significa crm",
    "closer de",
    "aplicativo para cadastro",
    "mercanet",
    "marketing automation platforms",
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
    if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(j)}`);
    return j;
}

(async () => {
    console.log("━".repeat(70));
    console.log(DRY ? "DRY-RUN (nada escrito)" : "EXECUTE (aplicando)");
    console.log("━".repeat(70));
    console.log();
    console.log("(a) Remover positiva hubspot:");
    REMOVE_POSITIVE.forEach((r) => console.log(`  - ${r}`));
    console.log();
    console.log(`(b) Converter ${REMOVE_EXACT_NEGATIVES.length} EXACT → ${ADD_PHRASE_COMPETITORS.length} PHRASE (concorrentes):`);
    console.log(`  - Remove 23 EXACT (ver resource names no código)`);
    console.log(`  + Add PHRASE: ${ADD_PHRASE_COMPETITORS.join(", ")}`);
    console.log();
    console.log(`(c) Adicionar ${ADD_PHRASE_NEW.length} PHRASE novas:`);
    ADD_PHRASE_NEW.forEach((t) => console.log(`  + ${t}`));
    console.log();

    if (DRY) {
        console.log("— dry-run. rode com --execute pra aplicar.");
        return;
    }

    const token = await getAccessToken();

    // STEP 1: remover positiva hubspot (ad_group_criterion)
    console.log("\n▶ STEP 1/2: removendo positiva hubspot…");
    const remPosOps = REMOVE_POSITIVE.map((rn) => ({ remove: rn }));
    const remPosRes = await apiCall("/adGroupCriteria:mutate", { operations: remPosOps }, token);
    console.log(`  ✓ ${remPosRes.results.length} positivas removidas`);

    // STEP 2: mutation atômica campaign_criterion (23 remove + 28 create)
    console.log("\n▶ STEP 2/2: refinando negativas campaign-level…");
    const allNewPhrases = [...ADD_PHRASE_COMPETITORS, ...ADD_PHRASE_NEW];
    const campOps = [
        ...REMOVE_EXACT_NEGATIVES.map((rn) => ({ remove: rn })),
        ...allNewPhrases.map((text) => ({
            create: {
                campaign: `customers/${CUSTOMER}/campaigns/${CAMPAIGN_ID}`,
                negative: true,
                keyword: { text, matchType: "PHRASE" },
            },
        })),
    ];
    const campRes = await apiCall("/campaignCriteria:mutate", { operations: campOps }, token);
    console.log(`  ✓ ${campRes.results.length} ops aplicadas (${REMOVE_EXACT_NEGATIVES.length} remove + ${allNewPhrases.length} create)`);

    console.log("\n✅ Search refinement completo.");
    console.log("   Aguarda 24-48h pra ver efeito nos search terms.");
})().catch((e) => {
    console.error("\n✗ erro:", e.message);
    process.exit(1);
});
