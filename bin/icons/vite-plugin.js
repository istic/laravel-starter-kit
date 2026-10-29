/* global process */
import fs from 'node:fs/promises';
import { generateAppleTouchIcon, generateWebIcons } from '@istic-co/annealer';

const CONFIG_PATH = 'resources/branding/icon-config.json';

export function iconGenerationPlugin() {
    let viteMode;

    return {
        name: 'icon-generation',
        configResolved(config) {
            // APP_ENV (local/staging/production) takes precedence over Vite mode so
            // staging servers don't need --mode staging on their build command.
            viteMode = process.env.APP_ENV ?? config.mode;
        },
        async buildStart() {
            const iconConfig = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));
            const backgroundColor = iconConfig.backgroundColors?.[viteMode] ?? iconConfig.backgroundColor;
            const config = { ...iconConfig, backgroundColor };

            await generateWebIcons(config);
            // Never write the compensated colour back into the tracked icon.json —
            // every build would otherwise reformat it and fail Biome's check.
            await generateAppleTouchIcon(config, undefined, { syncJson: false });
        },
    };
}
