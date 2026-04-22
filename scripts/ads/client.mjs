import https from 'https';
import { readFileSync, existsSync } from 'fs';
import os from 'os';
import path from 'path';

// Account fixo (Vyzon). Se precisar apontar pra outra conta, exporta vars.
const CUSTOMER_ID = process.env.GOOGLE_ADS_CUSTOMER_ID || '3014873882';
const LOGIN_CUSTOMER_ID = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '1530563827';
const DEV_TOKEN = process.env.GOOGLE_ADS_DEV_TOKEN || 'j88Tiv53ZfxDPKgWKp4v8w';
// Campanha Search principal (única ativa).
export const SEARCH_CAMPAIGN_ID = process.env.GOOGLE_ADS_CAMPAIGN_ID || '23767172582';

// Token em arquivo, fallback pros lugares onde scripts antigos gravavam.
// Ordem: env TOKEN literal → env FILE → caminhos temp usuais.
const resolveToken = () => {
    if (process.env.GOOGLE_ADS_TOKEN) return process.env.GOOGLE_ADS_TOKEN.trim();
    const candidates = [
        process.env.GOOGLE_ADS_TOKEN_FILE,
        path.join(os.tmpdir(), 'ga_token.txt'),
        'C:/Users/vinao/AppData/Local/Temp/ga_token.txt',
        '/tmp/ga_token.txt',
    ].filter(Boolean);
    for (const p of candidates) {
        if (existsSync(p)) return readFileSync(p, 'utf8').trim();
    }
    throw new Error(
        'Google Ads token não encontrado. Seta GOOGLE_ADS_TOKEN, GOOGLE_ADS_TOKEN_FILE, ou grava em %TEMP%/ga_token.txt'
    );
};

export const config = {
    customerId: CUSTOMER_ID,
    loginCustomerId: LOGIN_CUSTOMER_ID,
    devToken: DEV_TOKEN,
    campaignResource: `customers/${CUSTOMER_ID}/campaigns/${SEARCH_CAMPAIGN_ID}`,
};

// POST genérico contra googleads.googleapis.com v21.
// `path` é tudo depois de /v21/customers/{id}, ex.: '/assets:mutate'.
export const callAds = async (endpoint, body) => {
    const token = resolveToken();
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = https.request({
            hostname: 'googleads.googleapis.com',
            path: `/v21/customers/${CUSTOMER_ID}${endpoint}`,
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + token,
                'developer-token': DEV_TOKEN,
                'login-customer-id': LOGIN_CUSTOMER_ID,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        }, res => {
            let d = '';
            res.on('data', c => (d += c));
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, json: JSON.parse(d) });
                } catch {
                    resolve({ status: res.statusCode, raw: d });
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
};

// Helper: aborta com log legível se resposta tiver `.json.error`.
export const bailOnError = (res, label = 'request') => {
    if (res.json?.error) {
        console.error(`[${label}] ERRO:`, JSON.stringify(res.json.error, null, 2).slice(0, 2000));
        process.exit(1);
    }
    if (res.json?.partialFailureError) {
        console.warn(`[${label}] partial errors:`,
            JSON.stringify(res.json.partialFailureError, null, 2).slice(0, 2000));
    }
};
