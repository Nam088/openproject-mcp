import { describe, expect, it, vi } from 'vitest';
import { OpenProjectClient } from '../../src/core/openproject-client.js';

describe('OpenProjectClient Full Coverage', () => {
  it('covers GET with cache, POST, PATCH with auto lockVersion, PUT, DELETE, and getRaw', async () => {
    const client = new OpenProjectClient({
      host: 'https://community.openproject.org',
      apiKey: 'test-key',
      defaultProjectId: '14',
      readOnlyMode: false,
    });

    const getSpy = vi
      .spyOn(client.transport, 'get')
      .mockImplementation(async (url: string, config?: any) => {
        if (config?.responseType === 'arraybuffer') {
          return {
            data: Buffer.from('binary-content'),
            headers: {
              'content-type': 'application/pdf',
              'content-disposition': 'attachment; filename="report.pdf"',
            },
          } as any;
        }
        return {
          data: { id: 100, lockVersion: 3, subject: 'Test WP' },
          headers: {},
        } as any;
      });

    const postSpy = vi.spyOn(client.transport, 'post').mockResolvedValue({
      data: { id: 101 },
      headers: {},
    } as any);

    const patchSpy = vi.spyOn(client.transport, 'patch').mockResolvedValue({
      data: { id: 100, lockVersion: 4, subject: 'Updated WP' },
      headers: {},
    } as any);

    const putSpy = vi.spyOn(client.transport, 'put').mockResolvedValue({
      data: { id: 100 },
      headers: {},
    } as any);

    const deleteSpy = vi.spyOn(client.transport, 'delete').mockResolvedValue({
      data: { success: true },
      headers: {},
    } as any);

    // 1. GET with cache
    const res1 = await client.get('/work_packages/100', undefined, { useCache: true });
    expect(res1).toEqual({ id: 100, lockVersion: 3, subject: 'Test WP' });
    expect(getSpy).toHaveBeenCalledTimes(1);

    const resCached = await client.get('/work_packages/100', undefined, { useCache: true });
    expect(resCached).toEqual({ id: 100, lockVersion: 3, subject: 'Test WP' });
    expect(getSpy).toHaveBeenCalledTimes(1); // hit cache

    // 2. Auto lockVersion Patch
    const patched = await client.patchWorkPackageWithLock(100, { subject: 'Updated WP' });
    expect(patched).toEqual({ id: 100, lockVersion: 4, subject: 'Updated WP' });
    expect(patchSpy).toHaveBeenCalledWith('/work_packages/100', {
      subject: 'Updated WP',
      lockVersion: 3,
    });

    // 3. POST, PUT, DELETE, getRaw
    const postRes = await client.post('/work_packages', { subject: 'New' });
    expect(postRes).toEqual({ id: 101 });
    expect(postSpy).toHaveBeenCalled();

    const putRes = await client.put('/projects/14', { name: 'New Name' });
    expect(putRes).toEqual({ id: 100 });
    expect(putSpy).toHaveBeenCalled();

    const delRes = await client.delete('/work_packages/100');
    expect(delRes).toEqual({ success: true });
    expect(deleteSpy).toHaveBeenCalled();

    const raw = await client.getRaw('/attachments/5/content');
    expect(raw.contentType).toBe('application/pdf');
    expect(raw.filename).toBe('report.pdf');
    expect(raw.data.toString()).toBe('binary-content');

    client.clearCache();
  });
});
