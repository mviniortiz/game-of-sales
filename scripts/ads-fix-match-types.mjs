import https from 'https';
import { readFileSync } from 'fs';

const token = readFileSync('/tmp/ga_token.txt', 'utf8').trim();
const kws = JSON.parse(readFileSync('/tmp/kws.json', 'utf8'));
const customerId = '3014873882';
const loginCustomerId = '1530563827';
const devToken = 'j88Tiv53ZfxDPKgWKp4v8w';

const adGroup = `customers/${customerId}/adGroups/199510629510`;

const skipTexts = new Set([
  'alternativa hubspotcrm comercial',
  'alternativa',
]);

const operations = [];
for (const r of kws.results) {
  const c = r.adGroupCriterion;
  const text = c.keyword.text;
  // remove sempre (pra limpar broad lixo e typos); só recria se não for skip
  operations.push({ remove: `customers/${customerId}/adGroupCriteria/${r.adGroup.id}~${c.criterionId}` });
  if (!skipTexts.has(text)) {
    operations.push({ create: { adGroup, keyword: { text, matchType: 'PHRASE' }, status: 'ENABLED' } });
  } else {
    console.log('skip recreate:', text);
  }
}

const body = JSON.stringify({ operations, partialFailure: true });

const req = https.request({
  hostname: 'googleads.googleapis.com',
  path: `/v21/customers/${customerId}/adGroupCriteria:mutate`,
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'developer-token': devToken,
    'login-customer-id': loginCustomerId,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('status:', res.statusCode);
    try {
      const j = JSON.parse(d);
      if (j.error) console.log(JSON.stringify(j.error, null, 2).slice(0, 2000));
      else console.log('mutated:', j.results?.length);
    } catch {
      console.log(d.slice(0, 2000));
    }
  });
});
req.on('error', e => console.error('req err:', e.message));
req.write(body);
req.end();
