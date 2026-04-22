// Substitui o sitelink "Para Infoprodutores" (que apontava pra #use-cases) por
// um novo apontando pra /para-infoprodutores (rota dedicada).
// Uso: npm run ads:persona-sitelink
import { callAds, bailOnError, config } from './client.mjs';

const OLD_ASSET_ID = process.env.OLD_ASSET_ID || '351825733889';
const OLD_CAMPAIGN_ASSET = `customers/${config.customerId}/campaignAssets/23767172582~${OLD_ASSET_ID}~SITELINK`;

const NEW_SITELINK = {
    linkText: 'Para Infoprodutores',
    description1: 'Hotmart Kiwify e Greenn',
    description2: 'Pipeline por esteira de produto',
    finalUrl: 'https://vyzon.com.br/para-infoprodutores',
};

console.log('Criando asset novo...');
const assetRes = await callAds('/assets:mutate', {
    operations: [{
        create: {
            name: `sitelink-para-infoprodutores-dedicated-${Date.now()}`,
            finalUrls: [NEW_SITELINK.finalUrl],
            sitelinkAsset: {
                linkText: NEW_SITELINK.linkText,
                description1: NEW_SITELINK.description1,
                description2: NEW_SITELINK.description2,
            },
        },
    }],
});
bailOnError(assetRes, 'assets:mutate');
const newAssetResource = assetRes.json.results[0].resourceName;
console.log('  criado:', newAssetResource, '→', NEW_SITELINK.finalUrl);

console.log('\nDesvinculando antigo e vinculando novo...');
const linkRes = await callAds('/campaignAssets:mutate', {
    operations: [
        { remove: OLD_CAMPAIGN_ASSET },
        { create: { campaign: config.campaignResource, asset: newAssetResource, fieldType: 'SITELINK' } },
    ],
    partialFailure: true,
});
bailOnError(linkRes, 'campaignAssets:mutate');
console.log('operations aplicadas:', linkRes.json.results?.length);
console.log('\nDONE — novo sitelink aponta pra /para-infoprodutores');
