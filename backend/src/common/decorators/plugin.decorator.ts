// Plugin Decorator
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md
// Marks modules as optional plugins

import { SetMetadata } from '@nestjs/common';

export const PLUGIN_METADATA = 'PLUGIN_METADATA';

export interface PluginOptions {
    name: string;
    enabled?: boolean;
}

export const Plugin = (options: PluginOptions) => {
    return SetMetadata(PLUGIN_METADATA, options);
};
