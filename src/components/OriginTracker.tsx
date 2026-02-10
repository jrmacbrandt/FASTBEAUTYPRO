'use client';

import { useEffect } from 'react';

export function OriginTracker() {
    useEffect(() => {
        // Evita rodar no servidor
        if (typeof window === 'undefined') return;

        // Já capturou?
        if (sessionStorage.getItem('origin_captured')) return;

        const referrer = document.referrer;
        const urlParams = new URLSearchParams(window.location.search);
        const utmSource = urlParams.get('utm_source');
        const utmCampaign = urlParams.get('utm_campaign');

        let origin = 'Direto';

        if (utmSource) {
            origin = `Campanha: ${utmSource}`;
        } else if (referrer) {
            if (referrer.includes('instagram.com')) origin = 'Instagram';
            else if (referrer.includes('google.com')) origin = 'Google';
            else if (referrer.includes('facebook.com')) origin = 'Facebook';
            else origin = new URL(referrer).hostname;
        }

        // Salvar na sessão para usar no checkout/agendamento
        sessionStorage.setItem('origin_source', origin);
        if (utmSource) sessionStorage.setItem('utm_source', utmSource);
        if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign);

        sessionStorage.setItem('origin_captured', 'true');

        console.log('[OriginTracker] Capturado:', origin);
    }, []);

    return null; // Componente invisível
}
