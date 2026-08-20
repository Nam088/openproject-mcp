import { describe, expect, it } from 'vitest';
import { createServer } from '../src/index.js';

describe('OpenProject MCP Server Composition Root', () => {
  it('instantiates FastMCP server instance with all tools, prompts and resources', () => {
    const server = createServer({
      host: 'https://community.openproject.org',
      apiKey: 'test-key',
      defaultProjectId: '14',
      readOnlyMode: false,
    });

    expect(server).toBeDefined();
  });
});
