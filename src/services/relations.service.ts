import { IOpenProjectClient } from '../core/openproject-client.js';
import { HalCollection, OpenProjectRelation } from '../types/openproject.types.js';
import { IRelationsService } from './contracts/index.js';

export class RelationsService implements IRelationsService {
  constructor(private readonly client: IOpenProjectClient) {}

  public async listRelations(params?: {
    filters?: string | Array<Record<string, unknown>>;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectRelation>> {
    const queryParams: Record<string, unknown> = {};
    if (params?.filters) {
      queryParams.filters =
        typeof params.filters === 'string' ? params.filters : JSON.stringify(params.filters);
    }
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.offset) queryParams.offset = params.offset;

    return this.client.get<HalCollection<OpenProjectRelation>>('/relations', queryParams, {
      useCache: true,
    });
  }

  public async getRelation(id: number): Promise<OpenProjectRelation> {
    return this.client.get<OpenProjectRelation>(`/relations/${id}`, undefined, { useCache: true });
  }

  public async createRelation(data: {
    fromId: number;
    toId: number;
    type:
      | 'relates'
      | 'duplicates'
      | 'duplicated'
      | 'blocks'
      | 'blocked'
      | 'precedes'
      | 'follows'
      | 'includes'
      | 'partof'
      | 'requires'
      | 'required';
    description?: string;
    delay?: number;
  }): Promise<OpenProjectRelation> {
    const payload: Record<string, unknown> = {
      type: data.type,
      _links: {
        from: { href: `/api/v3/work_packages/${data.fromId}` },
        to: { href: `/api/v3/work_packages/${data.toId}` },
      },
    };
    if (data.description) payload.description = data.description;
    if (data.delay !== undefined) payload.delay = data.delay;

    return this.client.post<OpenProjectRelation>('/relations', payload);
  }

  public async deleteRelation(id: number): Promise<unknown> {
    return this.client.delete(`/relations/${id}`);
  }
}
