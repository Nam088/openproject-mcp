import { IOpenProjectClient } from '../core/openproject-client.js';
import { OpenProjectVersion } from '../types/openproject.types.js';
import { IVersionsService } from './contracts/index.js';

export class VersionsService implements IVersionsService {
  constructor(private readonly client: IOpenProjectClient) {}

  public async listVersions(projectId?: string | number): Promise<OpenProjectVersion[]> {
    if (projectId) {
      const resolved = this.client.resolveProjectId(projectId);
      const res = await this.client.get<any>(`/projects/${resolved}/versions`, undefined, {
        useCache: true,
      });
      return res._embedded?.elements || [];
    }
    const res = await this.client.get<any>('/versions', undefined, { useCache: true });
    return res._embedded?.elements || [];
  }

  public async getVersion(id: number): Promise<OpenProjectVersion> {
    return this.client.get<OpenProjectVersion>(`/versions/${id}`, undefined, { useCache: true });
  }

  public async createVersion(
    name: string,
    projectId?: string | number,
    data?: {
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: 'open' | 'locked' | 'closed';
    }
  ): Promise<OpenProjectVersion> {
    const resolved = this.client.resolveProjectId(projectId);
    const payload: Record<string, unknown> = {
      name,
      _links: {
        definingProject: { href: `/api/v3/projects/${resolved}` },
      },
    };
    if (data?.startDate) payload.startDate = data.startDate;
    if (data?.endDate) payload.endDate = data.endDate;
    if (data?.status) payload.status = data.status;
    if (data?.description) {
      payload.description = { format: 'markdown', raw: data.description };
    }

    return this.client.post<OpenProjectVersion>('/versions', payload);
  }

  public async updateVersion(
    id: number,
    data: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: 'open' | 'locked' | 'closed';
    }
  ): Promise<OpenProjectVersion> {
    const payload: Record<string, unknown> = {};
    if (data.name) payload.name = data.name;
    if (data.startDate) payload.startDate = data.startDate;
    if (data.endDate) payload.endDate = data.endDate;
    if (data.status) payload.status = data.status;
    if (data.description) {
      payload.description = { format: 'markdown', raw: data.description };
    }

    return this.client.patch<OpenProjectVersion>(`/versions/${id}`, payload);
  }

  public async deleteVersion(id: number): Promise<unknown> {
    return this.client.delete(`/versions/${id}`);
  }
}
