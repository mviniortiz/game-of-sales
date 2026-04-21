import https from 'https';
import { readFileSync } from 'fs';

const token = readFileSync('C:/Users/vinao/AppData/Local/Temp/ga_token.txt', 'utf8').trim();
const customerId = '3014873882';
const loginCustomerId = '1530563827';
const devToken = 'j88Tiv53ZfxDPKgWKp4v8w';
const searchCampaignId = '23767172582';
const campaign = `customers/${customerId}/campaigns/${searchCampaignId}`;

// Anchors validados contra src/pages/LandingPage.tsx + componentes:
// #how-it-works, #agendar-demo, #use-cases, #pricing, #faq, #features, #demo existem
// #planos, #como-funciona, #integracoes NÃO existem → não usar
const SITELINKS = [
  { linkText: 'Ver Planos e Precos', description1: 'A partir de R$147 por mes', description2: '14 dias gratis sem cartao', finalUrl: 'https://vyzon.com.br/#pricing' },
  { linkText: 'Como Funciona', description1: 'Pipeline visual e ranking', description2: 'Metas em tempo real', finalUrl: 'https://vyzon.com.br/#how-it-works' },
  { linkText: 'Comecar Teste Gratis', description1: '14 dias sem compromisso', description2: 'Sem cartao de credito', finalUrl: 'https://vyzon.com.br/onboarding?plan=pro' },
  { linkText: 'Agendar Demonstracao', description1: 'Veja o Vyzon em acao', description2: 'Conversa de 15 minutos', finalUrl: 'https://vyzon.com.br/#agendar-demo' },
  { linkText: 'Recursos de IA', description1: 'Eva agente de vendas', description2: 'Automatiza follow-up', finalUrl: 'https://vyzon.com.br/#features' },
  { linkText: 'Para Infoprodutores', description1: 'Hotmart Kiwify e Greenn', description2: 'Integracao em 5 minutos', finalUrl: 'https://vyzon.com.br/#use-cases' },
  { linkText: 'Duvidas Frequentes', description1: 'Tire suas duvidas', description2: 'Seguranca LGPD e mais', finalUrl: 'https://vyzon.com.br/#faq' },
  { linkText: 'Ranking de Vendedores', description1: 'Gamificacao que engaja', description2: 'Times batem meta todo mes', finalUrl: 'https://vyzon.com.br/#features' },
];

async function apiCall(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'googleads.googleapis.com',
      path: `/v21/customers/${customerId}${path}`,
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'developer-token': devToken,
        'login-customer-id': loginCustomerId,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Step 1: Create sitelink assets
const assetOps = SITELINKS.map(s => ({
  create: {
    name: `sitelink-${s.linkText.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    finalUrls: [s.finalUrl],
    sitelinkAsset: {
      linkText: s.linkText,
      description1: s.description1,
      description2: s.description2,
    },
  },
}));

console.log(`Creating ${assetOps.length} sitelink assets...`);
const assetRes = await apiCall('/assets:mutate', { operations: assetOps });
console.log('asset create status:', assetRes.status);
if (assetRes.json?.error) {
  console.log('ERROR:', JSON.stringify(assetRes.json.error, null, 2).slice(0, 2000));
  process.exit(1);
}
const newAssetResources = assetRes.json.results.map(r => r.resourceName);
console.log('created:', newAssetResources.length);
newAssetResources.forEach((r, i) => console.log(`  ${SITELINKS[i].linkText} → ${r}`));

// Step 2: Remove broken campaign_asset links (anchors que nao existem)
const BROKEN_CAMPAIGN_ASSETS = [
  'customers/3014873882/campaignAssets/23767172582~351531901010~SITELINK', // Ver Planos → #planos
  'customers/3014873882/campaignAssets/23767172582~351531901013~SITELINK', // Como Funciona → #como-funciona
  'customers/3014873882/campaignAssets/23767172582~351531901016~SITELINK', // Integracoes → #integracoes
];

console.log('\nRemoving broken campaign_asset links...');
const removeOps = BROKEN_CAMPAIGN_ASSETS.map(r => ({ remove: r }));
const linkNewOps = newAssetResources.map(rn => ({
  create: { campaign, asset: rn, fieldType: 'SITELINK' },
}));

const linkRes = await apiCall('/campaignAssets:mutate', {
  operations: [...removeOps, ...linkNewOps],
  partialFailure: true,
});
console.log('link status:', linkRes.status);
if (linkRes.json?.error) {
  console.log('ERROR:', JSON.stringify(linkRes.json.error, null, 2).slice(0, 2000));
  process.exit(1);
}
console.log('results:', linkRes.json.results?.length);
if (linkRes.json.partialFailureError) {
  console.log('partial errors:', JSON.stringify(linkRes.json.partialFailureError, null, 2).slice(0, 2000));
}
console.log('\nDONE');
