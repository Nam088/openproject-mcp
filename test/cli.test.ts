import { describe, expect, it, vi } from 'vitest';
import { createCli } from '../src/cli.js';
import { OpenProjectClient } from '../src/core/openproject-client.js';

describe('OpenProject CLI Suite', () => {
  it('defines doctor, tools, and setup subcommands', () => {
    const startServerMock = vi.fn();
    const cli = createCli(startServerMock);

    expect(cli.commands.map((c) => c.name())).toContain('doctor');
    expect(cli.commands.map((c) => c.name())).toContain('tools');
    expect(cli.commands.map((c) => c.name())).toContain('setup');
  });

  it('runs doctor command successfully with mocked client', async () => {
    vi.spyOn(OpenProjectClient.prototype, 'get').mockResolvedValue({
      name: 'Test User',
      login: 'test',
      email: 'test@example.com',
      admin: true,
      identifier: 'demo',
      active: true,
    } as any);

    const startServerMock = vi.fn();
    const cli = createCli(startServerMock);

    await expect(cli.parseAsync(['node', 'openproject-mcp', 'doctor'])).resolves.not.toThrow();
  });

  it('runs tools command successfully', async () => {
    const startServerMock = vi.fn();
    const cli = createCli(startServerMock);

    await expect(cli.parseAsync(['node', 'openproject-mcp', 'tools'])).resolves.not.toThrow();
  });

  it('runs setup command successfully', async () => {
    const startServerMock = vi.fn();
    const cli = createCli(startServerMock);

    await expect(
      cli.parseAsync(['node', 'openproject-mcp', 'setup', '--client', 'cursor'])
    ).resolves.not.toThrow();
  });

  it('parses stdio, sse, and httpStream transport options', async () => {
    const startServerMock = vi.fn().mockResolvedValue(undefined);
    const cli = createCli(startServerMock);

    await cli.parseAsync([
      'node',
      'openproject-mcp',
      '--transport',
      'sse',
      '--port',
      '9090',
      '--endpoint',
      '/custom-sse',
    ]);

    expect(startServerMock).toHaveBeenCalledWith(expect.any(Object), 'sse', 9090, '/custom-sse');
  });
});
