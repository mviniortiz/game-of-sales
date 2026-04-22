// Adiciona negative keywords à campanha Search.
// Uso: npm run ads:negatives
import { callAds, bailOnError, config } from './client.mjs';

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

const operations = [
    ...NEG_EXACT.map(text => ({
        create: {
            campaign: config.campaignResource,
            keyword: { text, matchType: 'EXACT' },
            negative: true,
        },
    })),
    ...NEG_PHRASE.map(text => ({
        create: {
            campaign: config.campaignResource,
            keyword: { text, matchType: 'PHRASE' },
            negative: true,
        },
    })),
];

console.log(`Enviando ${operations.length} negatives (EXACT=${NEG_EXACT.length}, PHRASE=${NEG_PHRASE.length})...`);
const res = await callAds('/campaignCriteria:mutate', { operations, partialFailure: true });
console.log('status:', res.status);
bailOnError(res, 'campaignCriteria:mutate');
console.log('criados:', res.json.results?.length);
