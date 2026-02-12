import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FastBeauty Pro',
        short_name: 'FastBeauty',
        description: 'Sistema completo para gestão de barbearias e salões',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#f2b90d',
        icons: [
            {
                src: `/favicon.ico?v=3`,
                sizes: 'any',
                type: 'image/x-icon',
            },
            {
                src: `/icon.png?v=3`,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: `/icon.png?v=3`,
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: `/icon.png?v=3`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: `/icon.png?v=3`,
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    }
}

