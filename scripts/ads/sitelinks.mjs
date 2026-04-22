// Substitui sitelinks "quebrados" (apontando pra anchors inexistentes) por novos.
// Uso: npm run ads:sitelinks
import { callAds, bailOnError, config } from './client.mjs';

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

const BROKEN_CAMPAIGN_ASSETS = [
    `customers/${config.customerId}/campaignAssets/23767172582~351531901010~SITELINK`,
    `customers/${config.customerId}/campaignAssets/23767172582~351531901013~SITELINK`,
    `customers/${config.customerId}/campaignAssets/23767172582~351531901016~SITELINK`,
];

console.log(`Criando ${SITELINKS.length} sitelink assets...`);
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
const assetRes = await callAds('/assets:mutate', { operations: assetOps });
console.log('asset status:', assetRes.status);
bailOnError(assetRes, 'asset:mutate');
const newAssetResources = assetRes.json.results.map(r => r.resourceName);
newAssetResources.forEach((r, i) => console.log(`  ${SITELINKS[i].linkText} → ${r}`));

console.log('\nRemovendo campaign_assets quebrados e vinculando novos...');
const linkRes = await callAds('/campaignAssets:mutate', {
    operations: [
        ...BROKEN_CAMPAIGN_ASSETS.map(r => ({ remove: r })),
        ...newAssetResources.map(rn => ({
            create: { campaign: config.campaignResource, asset: rn, fieldType: 'SITELINK' },
        })),
    ],
    partialFailure: true,
});
console.log('link status:', linkRes.status);
bailOnError(linkRes, 'campaignAssets:mutate');
console.log('operations aplicadas:', linkRes.json.results?.length);
console.log('\nDONE');
