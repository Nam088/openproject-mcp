import { describe, expect, it, vi } from 'vitest';
import { AxiosHttpTransport } from '../../src/core/http/http-transport.js';

describe('AxiosHttpTransport Full Coverage', () => {
  it('instantiates with API Key (Basic Auth) or OAuth Token (Bearer Auth)', () => {
    const transportApiKey = new AxiosHttpTransport({
      baseURL: 'https://community.openproject.org',
      apiKey: 'secret-key',
    });
    expect(transportApiKey.client.defaults.headers['Authorization']).toContain('Basic');

    const transportBearer = new AxiosHttpTransport({
      baseURL: 'https://community.openproject.org',
      oauthToken: 'bearer-token',
    });
    expect(transportBearer.client.defaults.headers['Authorization']).toBe('Bearer bearer-token');
  });

  it('delegates GET, POST, PATCH, PUT, and DELETE methods', async () => {
    const transport = new AxiosHttpTransport({
      baseURL: 'https://community.openproject.org',
      apiKey: 'secret-key',
    });

    vi.spyOn(transport.client, 'get').mockResolvedValue({ data: { id: 1 } } as any);
    vi.spyOn(transport.client, 'post').mockResolvedValue({ data: { id: 2 } } as any);
    vi.spyOn(transport.client, 'patch').mockResolvedValue({ data: { id: 3 } } as any);
    vi.spyOn(transport.client, 'put').mockResolvedValue({ data: { id: 4 } } as any);
    vi.spyOn(transport.client, 'delete').mockResolvedValue({ data: { success: true } } as any);

    expect((await transport.get('/test')).data).toEqual({ id: 1 });
    expect((await transport.post('/test', {})).data).toEqual({ id: 2 });
    expect((await transport.patch('/test', {})).data).toEqual({ id: 3 });
    expect((await transport.put('/test', {})).data).toEqual({ id: 4 });
    expect((await transport.delete('/test')).data).toEqual({ success: true });
  });
});
