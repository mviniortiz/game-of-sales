import https from 'https';
import { readFileSync } from 'fs';

const token = readFileSync('/tmp/ga_token.txt', 'utf8').trim();
const customerId = '3014873882';
const loginCustomerId = '1530563827';
const devToken = 'j88Tiv53ZfxDPKgWKp4v8w';
const campaignId = '23767172582';
const campaign = `customers/${customerId}/campaigns/${campaignId}`;

const NEG_EXACT = [
  'aace', 'nectar', 'utimify', 'komo', 'kommo', 'agendor', 'orum',
  'bitrix', 'clint', 'bluve', 'bigin', 'capys', 'braze', 'bogman',
  'atendezap', 'chatpro', 'zoho', 'rd station', 'ploomes',
  'pipefy', 'agendor crm', 'moskit', 'nectar crm',
];

const NEG_PHRASE = [
  'grátis', 'gratis', 'gratuito', 'free', 'phone integration',
  'cadastro de clientes', 'customer relationship', 'small business',
  'best crm', 'how to', 'sales and marketing', 'aplicaciones',
  'atencion', 'odonto', 'agro', 'como cadastrar', 'como criar',
  'como fazer', 'como colocar', 'planilha', 'ficha', 'excel', 'curso',
  'download', 'tutorial', 'api', 'open source', 'code',
  'gerenciamento de relacionamento',
];

const operations = [];
for (const text of NEG_EXACT) {
  operations.push({
    create: {
      campaign,
      keyword: { text, matchType: 'EXACT' },
      negative: true,
    },
  });
}
for (const text of NEG_PHRASE) {
  operations.push({
    create: {
      campaign,
      keyword: { text, matchType: 'PHRASE' },
      negative: true,
    },
  });
}

const body = JSON.stringify({ operations, partialFailure: true });

const req = https.request({
  hostname: 'googleads.googleapis.com',
  path: `/v21/customers/${customerId}/campaignCriteria:mutate`,
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
      else {
        console.log('created:', j.results?.length);
        if (j.partialFailureError) {
          console.log('partial errors:', JSON.stringify(j.partialFailureError.details?.[0]?.errors?.map(e => ({ text: e.trigger?.stringValue, code: Object.values(e.errorCode)[0], msg: e.message }))?.slice(0, 15), null, 2));
        }
      }
    } catch {
      console.log(d.slice(0, 2000));
    }
  });
});
req.on('error', e => console.error('req err:', e.message));
req.write(body);
req.end();
