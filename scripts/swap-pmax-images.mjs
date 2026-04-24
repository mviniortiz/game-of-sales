#!/usr/bin/env node
// Substitui as 10 imagens atuais da PMax "VYZON | INTERESSE | LEADS | ABR 2026"
// pelas 12 novas founder-hero (4 variantes × 3 aspect ratios).
//
// Uso:
//   node scripts/swap-pmax-images.mjs            # dry-run (só imprime o plano)
//   node scripts/swap-pmax-images.mjs --execute  # executa de verdade
//
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
const ASSET_GROUP = "6699733151";
const API = "https://googleads.googleapis.com/v21";

// 12 novas — arquivo + field type
const NEW_IMAGES = [
    { file: "out/google-ads/hero-green-4x5.png", field: "PORTRAIT_MARKETING_IMAGE", name: "Vyzon_Founder_Green_4x5" },
    { file: "out/google-ads/hero-blue-4x5.png", field: "PORTRAIT_MARKETING_IMAGE", name: "Vyzon_Founder_Blue_4x5" },
    { file: "out/google-ads/hero-block-4x5.png", field: "PORTRAIT_MARKETING_IMAGE", name: "Vyzon_Founder_Block_4x5" },
    { file: "out/google-ads/hero-violet-4x5.png", field: "PORTRAIT_MARKETING_IMAGE", name: "Vyzon_Founder_Violet_4x5" },
    { file: "out/google-ads/hero-green-1x1.png", field: "SQUARE_MARKETING_IMAGE", name: "Vyzon_Founder_Green_1x1" },
    { file: "out/google-ads/hero-blue-1x1.png", field: "SQUARE_MARKETING_IMAGE", name: "Vyzon_Founder_Blue_1x1" },
    { file: "out/google-ads/hero-block-1x1.png", field: "SQUARE_MARKETING_IMAGE", name: "Vyzon_Founder_Block_1x1" },
    { file: "out/google-ads/hero-violet-1x1.png", field: "SQUARE_MARKETING_IMAGE", name: "Vyzon_Founder_Violet_1x1" },
    { file: "out/google-ads/hero-green-191x1.png", field: "MARKETING_IMAGE", name: "Vyzon_Founder_Green_191x1" },
    { file: "out/google-ads/hero-blue-191x1.png", field: "MARKETING_IMAGE", name: "Vyzon_Founder_Blue_191x1" },
    { file: "out/google-ads/hero-block-191x1.png", field: "MARKETING_IMAGE", name: "Vyzon_Founder_Block_191x1" },
    { file: "out/google-ads/hero-violet-191x1.png", field: "MARKETING_IMAGE", name: "Vyzon_Founder_Violet_191x1" },
];

// 10 antigas — resource names pra remover do asset group
const OLD_ASSETS = [
    // MARKETING_IMAGE (1.91:1)
    "345343988559~MARKETING_IMAGE", // Vyzon_Ad_Paisagem_1200x628.jpg
    "349336557096~MARKETING_IMAGE", // Gemini_p9vyhep9vy
    "350185391183~MARKETING_IMAGE", // Gemini_vaeer7vaeer
    "350185411043~MARKETING_IMAGE", // Gemini_he1wdghe1w
    // SQUARE (1:1)
    "345199910060~SQUARE_MARKETING_IMAGE", // Vyzon_Ad_Quadrada_1200x1200.jpg
    "349337456865~SQUARE_MARKETING_IMAGE", // Gemini_cxovbv
    "350185410635~SQUARE_MARKETING_IMAGE", // Gemini_o8jps3
    "350185410668~SQUARE_MARKETING_IMAGE", // Gemini_m51srj
    // PORTRAIT (4:5)
    "349337456874~PORTRAIT_MARKETING_IMAGE", // Gemini_kj3iwq
    "350185391105~PORTRAIT_MARKETING_IMAGE", // Gemini_8m6whh
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
    const j = await res.json();
    if (!j.access_token) throw new Error("no access token: " + JSON.stringify(j));
    return j.access_token;
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
        body: JSON.stringify(body),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(j)}`);
    return j;
}

(async () => {
    console.log("━".repeat(60));
    console.log(DRY ? "DRY-RUN (nada será escrito)" : "EXECUTE (mudanças reais na PMax)");
    console.log("━".repeat(60));
    console.log();
    console.log("PLANO:");
    console.log(`  +  Upload de ${NEW_IMAGES.length} novas imagens como assets`);
    console.log(`  +  Linkar ${NEW_IMAGES.length} ao asset group ${ASSET_GROUP}`);
    console.log(`  -  Remover ${OLD_ASSETS.length} imagens antigas do asset group`);
    console.log();
    console.log("Adicionar:");
    for (const img of NEW_IMAGES) console.log(`  + ${img.field.padEnd(26)} ${img.name}`);
    console.log();
    console.log("Remover:");
    for (const rn of OLD_ASSETS) console.log(`  - ${rn}`);
    console.log();

    if (DRY) {
        console.log("— dry-run. rode com --execute pra aplicar.");
        return;
    }

    const token = await getAccessToken();

    // STEP 1: upload 12 novas imagens
    console.log("\n▶ STEP 1/3: uploading 12 imagens…");
    const assetOps = NEW_IMAGES.map((img) => {
        const b64 = readFileSync(resolve(img.file)).toString("base64");
        return {
            create: {
                name: img.name,
                type: "IMAGE",
                imageAsset: { data: b64 },
            },
        };
    });
    const assetRes = await apiCall("/assets:mutate", { operations: assetOps }, token);
    const newAssetIds = assetRes.results.map((r) => r.resourceName.split("/").pop());
    console.log(`  ✓ ${newAssetIds.length} assets criados`);
    for (let i = 0; i < newAssetIds.length; i++) {
        console.log(`    ${NEW_IMAGES[i].name} → asset ${newAssetIds[i]}`);
    }

    // STEP 2: linkar novos ao asset group
    console.log("\n▶ STEP 2/3: linkando 12 ao asset group…");
    const linkOps = NEW_IMAGES.map((img, i) => ({
        create: {
            assetGroup: `customers/${CUSTOMER}/assetGroups/${ASSET_GROUP}`,
            asset: `customers/${CUSTOMER}/assets/${newAssetIds[i]}`,
            fieldType: img.field,
        },
    }));
    const linkRes = await apiCall("/assetGroupAssets:mutate", { operations: linkOps }, token);
    console.log(`  ✓ ${linkRes.results.length} links criados`);

    // STEP 3: remover antigas
    console.log("\n▶ STEP 3/3: removendo 10 imagens antigas…");
    const removeOps = OLD_ASSETS.map((rn) => ({
        remove: `customers/${CUSTOMER}/assetGroupAssets/${ASSET_GROUP}~${rn}`,
    }));
    const removeRes = await apiCall("/assetGroupAssets:mutate", { operations: removeOps }, token);
    console.log(`  ✓ ${removeRes.results.length} links removidos`);

    console.log("\n✅ swap completo.");
})().catch((e) => {
    console.error("\n✗ erro:", e.message);
    process.exit(1);
});
