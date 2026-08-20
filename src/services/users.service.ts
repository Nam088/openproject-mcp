import { IOpenProjectClient } from '../core/openproject-client.js';
import { HalCollection, OpenProjectGroup, OpenProjectUser } from '../types/openproject.types.js';
import { IUsersService } from './contracts/index.js';

export class UsersService implements IUsersService {
  constructor(private readonly client: IOpenProjectClient) {}

  public async listUsers(params?: {
    filters?: string | Array<Record<string, unknown>>;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectUser>> {
    const queryParams: Record<string, unknown> = {};
    if (params?.filters) {
      queryParams.filters =
        typeof params.filters === 'string' ? params.filters : JSON.stringify(params.filters);
    }
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.offset) queryParams.offset = params.offset;

    return this.client.get<HalCollection<OpenProjectUser>>('/users', queryParams, {
      useCache: true,
    });
  }

  public async getUser(idOrMe: number | 'me'): Promise<OpenProjectUser> {
    return this.client.get<OpenProjectUser>(`/users/${idOrMe}`, undefined, { useCache: true });
  }

  public async createUser(data: {
    login: string;
    firstName: string;
    lastName: string;
    email: string;
    admin?: boolean;
    status?: 'active' | 'invited' | 'locked';
  }): Promise<OpenProjectUser> {
    const payload: Record<string, unknown> = {
      login: data.login,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
    };
    if (data.admin !== undefined) payload.admin = data.admin;
    if (data.status) payload.status = data.status;

    return this.client.post<OpenProjectUser>('/users', payload);
  }

  public async updateUser(
    id: number,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      admin?: boolean;
    }
  ): Promise<OpenProjectUser> {
    return this.client.patch<OpenProjectUser>(`/users/${id}`, data);
  }

  public async deleteUser(id: number): Promise<unknown> {
    return this.client.delete(`/users/${id}`);
  }

  public async listMemberships(params?: {
    projectId?: string | number;
    userId?: number;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<unknown>> {
    const filters: Array<Record<string, unknown>> = [];
    if (params?.projectId) {
      const resolved = this.client.resolveProjectId(params.projectId);
      filters.push({ project: { operator: '=', values: [resolved] } });
    }
    if (params?.userId) {
      filters.push({ principal: { operator: '=', values: [String(params.userId)] } });
    }

    const queryParams: Record<string, unknown> = {};
    if (filters.length > 0) queryParams.filters = JSON.stringify(filters);
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.offset) queryParams.offset = params.offset;

    return this.client.get<HalCollection<unknown>>('/memberships', queryParams, { useCache: true });
  }

  public async addMembership(data: {
    projectId: string | number;
    principalId: number;
    roleIds: number[];
  }): Promise<unknown> {
    const resolved = this.client.resolveProjectId(data.projectId);
    const payload = {
      _links: {
        project: { href: `/api/v3/projects/${resolved}` },
        principal: { href: `/api/v3/principals/${data.principalId}` },
        roles: data.roleIds.map((rId) => ({ href: `/api/v3/roles/${rId}` })),
      },
    };
    return this.client.post('/memberships', payload);
  }

  public async updateMembership(id: number, data: { roleIds: number[] }): Promise<unknown> {
    const payload = {
      _links: {
        roles: data.roleIds.map((rId) => ({ href: `/api/v3/roles/${rId}` })),
      },
    };
    return this.client.patch(`/memberships/${id}`, payload);
  }

  public async deleteMembership(id: number): Promise<unknown> {
    return this.client.delete(`/memberships/${id}`);
  }

  public async listRoles(): Promise<unknown[]> {
    const res = await this.client.get<any>('/roles', undefined, { useCache: true });
    return res._embedded?.elements || [];
  }

  public async listGroups(): Promise<OpenProjectGroup[]> {
    const res = await this.client.get<any>('/groups', undefined, { useCache: true });
    return res._embedded?.elements || [];
  }

  public async getGroup(id: number): Promise<OpenProjectGroup> {
    return this.client.get<OpenProjectGroup>(`/groups/${id}`, undefined, { useCache: true });
  }

  public async createGroup(data: { name: string }): Promise<OpenProjectGroup> {
    return this.client.post<OpenProjectGroup>('/groups', data);
  }

  public async updateGroup(id: number, data: { name: string }): Promise<OpenProjectGroup> {
    return this.client.patch<OpenProjectGroup>(`/groups/${id}`, data);
  }

  public async deleteGroup(id: number): Promise<unknown> {
    return this.client.delete(`/groups/${id}`);
  }

  public async listPrincipals(params?: { pageSize?: number; offset?: number }): Promise<unknown[]> {
    const res = await this.client.get<any>('/principals', params, { useCache: true });
    return res._embedded?.elements || [];
  }
}
