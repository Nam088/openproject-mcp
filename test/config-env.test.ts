import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { describe, expect, it } from 'vitest';
import {
  envConfigSchema,
  loadConfig,
  normalizeHostUrl,
  parseAllowedProjectIds,
  parseBoolean,
} from '../src/config.js';

describe('OpenProject Configuration & .env.example Suite', () => {
  it('verifies that .env.example exists and contains all required variables', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);

    const content = fs.readFileSync(envExamplePath, 'utf-8');
    const parsedExample = dotenv.parse(content);

    expect(parsedExample).toHaveProperty('OPENPROJECT_HOST');
    expect(parsedExample).toHaveProperty('OPENPROJECT_API_KEY');
    expect(parsedExample).toHaveProperty('OPENPROJECT_DEFAULT_PROJECT_ID');
    expect(parsedExample).toHaveProperty('OPENPROJECT_READ_ONLY_MODE');
    expect(parsedExample).toHaveProperty('DEBUG');
  });

  it('validates .env.example keys against Zod envConfigSchema', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    const parsedExample = dotenv.parse(content);

    const validationResult = envConfigSchema.safeParse(parsedExample);
    expect(validationResult.success).toBe(true);
  });

  it('normalizes OpenProject Host URLs correctly', () => {
    expect(normalizeHostUrl(undefined)).toBe('https://community.openproject.org');
    expect(normalizeHostUrl('')).toBe('https://community.openproject.org');
    expect(normalizeHostUrl('https://op.example.com/')).toBe('https://op.example.com');
    expect(normalizeHostUrl('https://op.example.com/api/v3')).toBe('https://op.example.com');
    expect(normalizeHostUrl('https://op.example.com/api/v3/')).toBe('https://op.example.com');
  });

  it('parses allowed project IDs from strings and JSON arrays', () => {
    expect(parseAllowedProjectIds(undefined)).toBeUndefined();
    expect(parseAllowedProjectIds('')).toBeUndefined();
    expect(parseAllowedProjectIds('14, 15, demo')).toEqual(['14', '15', 'demo']);
    expect(parseAllowedProjectIds('["14", "15", "demo"]')).toEqual(['14', '15', 'demo']);
  });

  it('parses booleans with truthy and falsy values', () => {
    expect(parseBoolean(true)).toBe(true);
    expect(parseBoolean(false)).toBe(false);
    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean('1')).toBe(true);
    expect(parseBoolean('yes')).toBe(true);
    expect(parseBoolean('on')).toBe(true);
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean('0')).toBe(false);
    expect(parseBoolean(undefined)).toBe(false);
  });

  it('prefers explicit overrides over process.env variables', () => {
    const originalEnv = { ...process.env };
    process.env.OPENPROJECT_HOST = 'https://env.openproject.com';
    process.env.OPENPROJECT_API_KEY = 'env-api-key';
    process.env.OPENPROJECT_DEFAULT_PROJECT_ID = '999';

    const config = loadConfig({
      host: 'https://override.openproject.com',
      apiKey: 'override-key',
      defaultProjectId: '111',
      readOnlyMode: true,
    });

    expect(config.host).toBe('https://override.openproject.com');
    expect(config.apiKey).toBe('override-key');
    expect(config.defaultProjectId).toBe('111');
    expect(config.readOnlyMode).toBe(true);

    process.env = originalEnv;
  });
});
