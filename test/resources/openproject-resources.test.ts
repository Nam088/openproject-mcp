import { FastMCP } from 'fastmcp';
import { describe, expect, it, vi } from 'vitest';
import { OpenProjectClient } from '../../src/core/openproject-client.js';
import { registerOpenProjectResources } from '../../src/resources/index.js';
import { createServiceContainer } from '../../src/services/index.js';

describe('OpenProject Resources Suite', () => {
  it('registers and resolves dynamic URI resource templates', async () => {
    const client = new OpenProjectClient({
      host: 'https://community.openproject.org',
      apiKey: 'test-key',
      defaultProjectId: '14',
      readOnlyMode: false,
    });

    const services = createServiceContainer(client);
    const server = new FastMCP({ name: 'test-server', version: '1.0.0' });

    const resourceLoaders: Record<string, Function> = {};
    vi.spyOn(server, 'addResourceTemplate').mockImplementation((resDef: any) => {
      resourceLoaders[resDef.uriTemplate] = resDef.load;
    });

    registerOpenProjectResources(server, services);

    vi.spyOn(services.projects, 'getProject').mockResolvedValue({ id: 14, name: 'Proj' } as any);
    vi.spyOn(services.workPackages, 'getWorkPackage').mockResolvedValue({
      id: 1,
      subject: 'WP',
    } as any);
    vi.spyOn(services.timeEntries, 'getTimeEntry').mockResolvedValue({
      id: 5,
      hours: 'PT1H',
    } as any);

    const resProject = await resourceLoaders['openproject://projects/{project_id}']({
      project_id: '14',
    });
    expect(JSON.parse(resProject.text).name).toBe('Proj');

    const resWP = await resourceLoaders['openproject://work_packages/{work_package_id}']({
      work_package_id: '1',
    });
    expect(JSON.parse(resWP.text).subject).toBe('WP');

    const resTE = await resourceLoaders['openproject://time_entries/{time_entry_id}']({
      time_entry_id: '5',
    });
    expect(JSON.parse(resTE.text).hours).toBe('PT1H');
  });
});
