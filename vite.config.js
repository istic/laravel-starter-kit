import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import tailwindcss from '@tailwindcss/vite';
import { iconGenerationPlugin } from './bin/icons/vite-plugin.js';

export default defineConfig({
    plugins: [
        iconGenerationPlugin(),
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'resources/icons/apple-touch-icon.png',
                'resources/icons/favicon-96x96.png',
                'resources/icons/favicon.ico',
                'resources/icons/favicon.svg',
                'resources/icons/web-app-manifest-192x192.png',
                'resources/icons/web-app-manifest-512x512.png',
            ],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        tailwindcss(),
    ],
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
