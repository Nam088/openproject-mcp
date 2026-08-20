import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from './core/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
} else {
  dotenv.config({ quiet: true });
}

export interface OpenProjectConfig {
  host: string;
  apiKey?: string;
  oauthToken?: string;
  defaultProjectId?: string;
  readOnlyMode: boolean;
  projectAllowlist?: string[];
}

export function normalizeHostUrl(url?: string): string {
  if (!url || !url.trim()) {
    return 'https://community.openproject.org';
  }
  return url
    .trim()
    .replace(/\/api\/v3\/?$/, '')
    .replace(/\/+$/, '');
}

export function parseAllowedProjectIds(value?: string): string[] | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }
  try {
    if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    }
  } catch {
    // Ignore JSON parse error, fallback to comma-separated
  }
  const parts = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}

export function parseBoolean(value?: string | boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (!value) {
    return false;
  }
  const str = String(value).trim().toLowerCase();
  return str === 'true' || str === '1' || str === 'yes' || str === 'on';
}

export const envConfigSchema = z.object({
  OPENPROJECT_HOST: z.string().optional().default('https://community.openproject.org'),
  OPENPROJECT_API_KEY: z.string().optional(),
  OPENPROJECT_OAUTH_TOKEN: z.string().optional(),
  OPENPROJECT_DEFAULT_PROJECT_ID: z.string().optional(),
  OPENPROJECT_READ_ONLY_MODE: z.union([z.string(), z.boolean()]).optional().default(false),
  OPENPROJECT_PROJECT_ALLOWLIST: z.string().optional(),
  DEBUG: z.union([z.string(), z.boolean()]).optional().default(false),
});

export type EnvConfig = z.infer<typeof envConfigSchema>;

export function loadConfig(overrides?: Partial<OpenProjectConfig>): OpenProjectConfig {
  const envParsed = envConfigSchema.safeParse(process.env);
  const rawEnv: Partial<EnvConfig> = envParsed.success ? envParsed.data : {};

  const host = normalizeHostUrl(overrides?.host || rawEnv.OPENPROJECT_HOST);
  const apiKey = overrides?.apiKey || rawEnv.OPENPROJECT_API_KEY;
  const oauthToken = overrides?.oauthToken || rawEnv.OPENPROJECT_OAUTH_TOKEN;
  const defaultProjectId = overrides?.defaultProjectId || rawEnv.OPENPROJECT_DEFAULT_PROJECT_ID;

  const readOnlyMode =
    overrides?.readOnlyMode !== undefined
      ? overrides.readOnlyMode
      : parseBoolean(rawEnv.OPENPROJECT_READ_ONLY_MODE);

  const projectAllowlist =
    overrides?.projectAllowlist || parseAllowedProjectIds(rawEnv.OPENPROJECT_PROJECT_ALLOWLIST);

  if (!apiKey && !oauthToken) {
    logger.warn(
      'OPENPROJECT_API_KEY or OPENPROJECT_OAUTH_TOKEN is not set. API requests will fail.'
    );
  }

  return {
    host,
    apiKey,
    oauthToken,
    defaultProjectId,
    readOnlyMode,
    projectAllowlist,
  };
}
