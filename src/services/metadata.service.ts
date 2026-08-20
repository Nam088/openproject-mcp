import { IOpenProjectClient } from '../core/openproject-client.js';
import {
  OpenProjectCategory,
  OpenProjectPriority,
  OpenProjectStatus,
  OpenProjectType,
} from '../types/openproject.types.js';
import { IMetadataService } from './contracts/index.js';

export class MetadataService implements IMetadataService {
  constructor(private readonly client: IOpenProjectClient) {}

  public async listStatuses(): Promise<OpenProjectStatus[]> {
    const res = await this.client.get<any>('/statuses', undefined, { useCache: true });
    return res._embedded?.elements || [];
  }

  public async getStatus(id: number): Promise<OpenProjectStatus> {
    return this.client.get<OpenProjectStatus>(`/statuses/${id}`, undefined, { useCache: true });
  }

  public async listTypes(): Promise<OpenProjectType[]> {
    const res = await this.client.get<any>('/types', undefined, { useCache: true });
    return res._embedded?.elements || [];
  }

  public async getType(id: number): Promise<OpenProjectType> {
    return this.client.get<OpenProjectType>(`/types/${id}`, undefined, { useCache: true });
  }

  public async listPriorities(): Promise<OpenProjectPriority[]> {
    const res = await this.client.get<any>('/priorities', undefined, { useCache: true });
    return res._embedded?.elements || [];
  }

  public async getPriority(id: number): Promise<OpenProjectPriority> {
    return this.client.get<OpenProjectPriority>(`/priorities/${id}`, undefined, { useCache: true });
  }

  public async listCategories(projectId?: string | number): Promise<OpenProjectCategory[]> {
    if (projectId) {
      const resolved = this.client.resolveProjectId(projectId);
      const res = await this.client.get<any>(`/projects/${resolved}/categories`, undefined, {
        useCache: true,
      });
      return res._embedded?.elements || [];
    }
    const res = await this.client.get<any>('/categories', undefined, { useCache: true });
    return res._embedded?.elements || [];
  }

  public async getCategory(id: number): Promise<OpenProjectCategory> {
    return this.client.get<OpenProjectCategory>(`/categories/${id}`, undefined, { useCache: true });
  }
}
