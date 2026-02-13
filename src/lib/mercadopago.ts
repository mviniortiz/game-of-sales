import { initMercadoPago } from '@mercadopago/sdk-react';

const PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

let initialized = false;

export function initializeMercadoPago() {
    if (!initialized && PUBLIC_KEY) {
        initMercadoPago(PUBLIC_KEY, {
            locale: 'pt-BR'
        });
        initialized = true;
    }
}

export { PUBLIC_KEY };
