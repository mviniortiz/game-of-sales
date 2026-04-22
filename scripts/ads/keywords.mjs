// Normaliza match types das keywords de um ad group (lixo broad → PHRASE).
// Espera o JSON com a query pré-feita em /tmp/kws.json ou em $KWS_FILE.
// Uso: npm run ads:keywords:fix-match
import { readFileSync, existsSync } from 'fs';
import os from 'os';
import path from 'path';
import { callAds, bailOnError, config } from './client.mjs';

const kwsPath = process.env.KWS_FILE
    || (existsSync(path.join(os.tmpdir(), 'kws.json')) ? path.join(os.tmpdir(), 'kws.json') : '/tmp/kws.json');

if (!existsSync(kwsPath)) {
    console.error(`kws.json não encontrado em ${kwsPath}. Rode a query primeiro e salve lá, ou seta $KWS_FILE.`);
    process.exit(1);
}

const kws = JSON.parse(readFileSync(kwsPath, 'utf8'));
const adGroupId = process.env.ADS_AD_GROUP_ID || '199510629510';
const adGroup = `customers/${config.customerId}/adGroups/${adGroupId}`;

const skipTexts = new Set([
    'alternativa hubspotcrm comercial',
    'alternativa',
]);

const operations = [];
for (const r of kws.results) {
    const c = r.adGroupCriterion;
    const text = c.keyword.text;
    operations.push({ remove: `customers/${config.customerId}/adGroupCriteria/${r.adGroup.id}~${c.criterionId}` });
    if (!skipTexts.has(text)) {
        operations.push({
            create: { adGroup, keyword: { text, matchType: 'PHRASE' }, status: 'ENABLED' },
        });
    } else {
        console.log('skip recreate:', text);
    }
}

console.log(`Aplicando ${operations.length} operações em ${adGroup}...`);
const res = await callAds('/adGroupCriteria:mutate', { operations, partialFailure: true });
console.log('status:', res.status);
bailOnError(res, 'adGroupCriteria:mutate');
console.log('mutated:', res.json.results?.length);
