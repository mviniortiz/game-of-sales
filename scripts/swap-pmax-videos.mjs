#!/usr/bin/env node
// Substitui os 3 vídeos V1 linkados ao asset group da PMax pelos 4 V2 novos.
//
// Uso:
//   node scripts/swap-pmax-videos.mjs            # dry-run
//   node scripts/swap-pmax-videos.mjs --execute
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
const ASSET_GROUP = "6699733151";
const API = "https://googleads.googleapis.com/v21";

// 4 vídeos V2 pra criar + linkar
const NEW_VIDEOS = [
    { ytId: "SJFpXYCrB2o", name: "Vyzon_SalesV2_Landscape_16x9" },
    { ytId: "3C1mIAE7I-o", name: "Vyzon_SalesV2_Reels_9x16" },
    { ytId: "vwWoYF41SxQ", name: "Vyzon_SalesV2_Vertical_4x5" },
    { ytId: "ARNRKccr04A", name: "Vyzon_SalesV2_Square_1x1" },
];

// 3 links V1 pra remover (resource names)
const OLD_LINKS = [
    `customers/${CUSTOMER}/assetGroupAssets/${ASSET_GROUP}~349334648967~YOUTUBE_VIDEO`, // sales-video.mp4 QS7HR0BC2jk
    `customers/${CUSTOMER}/assetGroupAssets/${ASSET_GROUP}~350268121228~YOUTUBE_VIDEO`, // sales-video-vertical45.mp4 sVoBQuA2aYU
    `customers/${CUSTOMER}/assetGroupAssets/${ASSET_GROUP}~350335586439~YOUTUBE_VIDEO`, // sales-video-square.mp4 5FkXMMrQwBs
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
    if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(j).slice(0, 500)}`);
    return j;
}

(async () => {
    console.log("=".repeat(65));
    console.log(DRY ? "DRY-RUN" : "EXECUTE");
    console.log("=".repeat(65));
    console.log("\nAdicionar (4 vídeos V2):");
    NEW_VIDEOS.forEach((v) => console.log(`  + ${v.ytId}  ${v.name}`));
    console.log("\nRemover (3 vídeos V1):");
    OLD_LINKS.forEach((rn) => console.log(`  - ${rn.split("/").pop()}`));
    console.log();

    if (DRY) {
        console.log("dry-run. rode com --execute pra aplicar.");
        return;
    }

    const token = await getAccessToken();

    // STEP 1: criar 4 assets YouTube Video
    console.log("STEP 1/2: criando 4 YouTube Video assets...");
    const assetOps = NEW_VIDEOS.map((v) => ({
        create: {
            name: v.name,
            type: "YOUTUBE_VIDEO",
            youtubeVideoAsset: { youtubeVideoId: v.ytId },
        },
    }));
    const assetRes = await apiCall("/assets:mutate", { operations: assetOps }, token);
    const newIds = assetRes.results.map((r) => r.resourceName?.split("/").pop()).filter(Boolean);
    console.log(`  ${newIds.length}/4 assets criados`);
    newIds.forEach((id, i) => console.log(`    ${NEW_VIDEOS[i].name} -> ${id}`));

    if (newIds.length !== 4) {
        console.log("  partial error:", JSON.stringify(assetRes.partialFailureError).slice(0, 500));
        throw new Error("Nem todos assets criados, abortando");
    }

    // STEP 2: mutation atômica = 3 remove + 4 create
    console.log("\nSTEP 2/2: swap atômico no asset group (3 remove + 4 create)...");
    const ops = [
        ...OLD_LINKS.map((rn) => ({ remove: rn })),
        ...newIds.map((id) => ({
            create: {
                assetGroup: `customers/${CUSTOMER}/assetGroups/${ASSET_GROUP}`,
                asset: `customers/${CUSTOMER}/assets/${id}`,
                fieldType: "YOUTUBE_VIDEO",
            },
        })),
    ];
    const swapRes = await apiCall("/assetGroupAssets:mutate", { operations: ops }, token);
    const okOps = (swapRes.results || []).filter((r) => r.resourceName).length;
    console.log(`  ${okOps}/${ops.length} ops aplicadas`);
    if (swapRes.partialFailureError) {
        console.log("  partial:", JSON.stringify(swapRes.partialFailureError).slice(0, 500));
    }

    console.log("\nswap de vídeos completo.");
})().catch((e) => {
    console.error("\nerro:", e.message);
    process.exit(1);
});
