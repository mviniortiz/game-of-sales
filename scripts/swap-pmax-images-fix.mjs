#!/usr/bin/env node
// Fixup: os 12 assets já foram criados na run anterior. Agora só falta:
//  1) remover as 10 antigas do asset group
//  2) linkar as 12 novas
// Ambos numa única mutation (ordem: remove 10 → create 12) pra não estourar limite de 20.
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
const CUSTOMER = env.GOOGLE_ADS_CUSTOMER_ID;
const LOGIN = env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
const DEV_TOKEN = env.GOOGLE_ADS_DEVELOPER_TOKEN;
const ASSET_GROUP = "6699733151";
const API = "https://googleads.googleapis.com/v21";

// Asset IDs criados na run anterior
const NEW = [
    { id: "352658446948", field: "PORTRAIT_MARKETING_IMAGE" },
    { id: "352658446951", field: "PORTRAIT_MARKETING_IMAGE" },
    { id: "352658446954", field: "PORTRAIT_MARKETING_IMAGE" },
    { id: "352658446957", field: "PORTRAIT_MARKETING_IMAGE" },
    { id: "352658446960", field: "SQUARE_MARKETING_IMAGE" },
    { id: "352658446963", field: "SQUARE_MARKETING_IMAGE" },
    { id: "352658446966", field: "SQUARE_MARKETING_IMAGE" },
    { id: "352658446969", field: "SQUARE_MARKETING_IMAGE" },
    { id: "352658446972", field: "MARKETING_IMAGE" },
    { id: "352658446975", field: "MARKETING_IMAGE" },
    { id: "352658446978", field: "MARKETING_IMAGE" },
    { id: "352658446981", field: "MARKETING_IMAGE" },
];

const OLD = [
    "345343988559~MARKETING_IMAGE",
    "349336557096~MARKETING_IMAGE",
    "350185391183~MARKETING_IMAGE",
    "350185411043~MARKETING_IMAGE",
    "345199910060~SQUARE_MARKETING_IMAGE",
    "349337456865~SQUARE_MARKETING_IMAGE",
    "350185410635~SQUARE_MARKETING_IMAGE",
    "350185410668~SQUARE_MARKETING_IMAGE",
    "349337456874~PORTRAIT_MARKETING_IMAGE",
    "350185391105~PORTRAIT_MARKETING_IMAGE",
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

(async () => {
    const token = await getAccessToken();

    const operations = [
        // 10 removes primeiro
        ...OLD.map((rn) => ({
            remove: `customers/${CUSTOMER}/assetGroupAssets/${ASSET_GROUP}~${rn}`,
        })),
        // 12 creates depois
        ...NEW.map((n) => ({
            create: {
                assetGroup: `customers/${CUSTOMER}/assetGroups/${ASSET_GROUP}`,
                asset: `customers/${CUSTOMER}/assets/${n.id}`,
                fieldType: n.field,
            },
        })),
    ];

    console.log(`▶ mutation com ${operations.length} ops (10 remove + 12 create)…`);
    const res = await fetch(`${API}/customers/${CUSTOMER}/assetGroupAssets:mutate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "developer-token": DEV_TOKEN,
            "login-customer-id": LOGIN,
        },
        body: JSON.stringify({ operations }),
    });
    const j = await res.json();
    if (!res.ok) {
        console.error("✗ erro:", JSON.stringify(j, null, 2));
        process.exit(1);
    }
    console.log(`✓ ${j.results.length} ops aplicadas`);
    console.log("\n✅ swap completo. PMax agora tá rodando com as 12 founder-hero novas.");
})();
