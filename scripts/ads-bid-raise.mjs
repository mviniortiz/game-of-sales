#!/usr/bin/env node
// Sobe bid Search: ad_group default R$1 → R$3, + 12 keywords com override
// R$1 → R$3.
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
const AD_GROUP = "199510629510";
const NEW_BID_MICROS = 3_000_000; // R$3.00

const KEYWORD_RNS = JSON.parse(readFileSync("C:/Users/vinao/kw_overrides.json", "utf8"))
    .results?.map((r) => r.adGroupCriterion.resourceName)
    ?? JSON.parse('["customers/3014873882/adGroupCriteria/199510629510~348073218374","customers/3014873882/adGroupCriteria/199510629510~1150311011458","customers/3014873882/adGroupCriteria/199510629510~1647126049822","customers/3014873882/adGroupCriteria/199510629510~1652627742918","customers/3014873882/adGroupCriteria/199510629510~2186300654822","customers/3014873882/adGroupCriteria/199510629510~2412447013113","customers/3014873882/adGroupCriteria/199510629510~2426180667764","customers/3014873882/adGroupCriteria/199510629510~2448689756046","customers/3014873882/adGroupCriteria/199510629510~2460130174260","customers/3014873882/adGroupCriteria/199510629510~2477270703260","customers/3014873882/adGroupCriteria/199510629510~2477270703300","customers/3014873882/adGroupCriteria/199510629510~2481321921979"]');

async function token() {
    const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: env.GOOGLE_ADS_CLIENT_ID,
            client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
            refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
            grant_type: "refresh_token",
        }),
    });
    return (await r.json()).access_token;
}

async function call(path, body) {
    const t = await token();
    const r = await fetch(`https://googleads.googleapis.com/v21/customers/${CUSTOMER}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
            "developer-token": DEV_TOKEN,
            "login-customer-id": LOGIN,
        },
        body: JSON.stringify({ ...body, partialFailure: true }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`${path} ${r.status}: ${JSON.stringify(j).slice(0, 400)}`);
    return j;
}

(async () => {
    console.log(`Setando bid Search pra R$${NEW_BID_MICROS / 1e6}...`);

    // 1) Ad group default
    const r1 = await call("/adGroups:mutate", {
        operations: [
            {
                updateMask: "cpcBidMicros",
                update: {
                    resourceName: `customers/${CUSTOMER}/adGroups/${AD_GROUP}`,
                    cpcBidMicros: NEW_BID_MICROS,
                },
            },
        ],
    });
    console.log(`  ad_group: ${r1.results?.length || 0} atualizado`);

    // 2) 12 keywords com override
    const ops = KEYWORD_RNS.map((rn) => ({
        updateMask: "cpcBidMicros",
        update: { resourceName: rn, cpcBidMicros: NEW_BID_MICROS },
    }));
    const r2 = await call("/adGroupCriteria:mutate", { operations: ops });
    console.log(`  keywords: ${(r2.results || []).filter((x) => x.resourceName).length}/${KEYWORD_RNS.length} atualizadas`);
    if (r2.partialFailureError) {
        console.log("  partial:", JSON.stringify(r2.partialFailureError).slice(0, 300));
    }

    console.log("\nExpectativa:");
    console.log("  - Rank lost cai de ~80% pra 30-50% (aparece mais)");
    console.log("  - CPC médio sobe de ~R$1.25 pra R$2-3");
    console.log("  - Cliques/dia caem de ~17 pra 10-12 (mesmo budget R$30)");
    console.log("  - Tráfego mais qualificado (queries de maior intent)");
    console.log("  - Revisa em 3-5 dias");
})();
