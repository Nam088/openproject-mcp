import { IOpenProjectClient } from '../core/openproject-client.js';
import {
  HalCollection,
  OpenProjectNotification,
  OpenProjectQuery,
  OpenProjectUser,
} from '../types/openproject.types.js';
import { IQueriesService } from './contracts/index.js';

export class QueriesService implements IQueriesService {
  constructor(private readonly client: IOpenProjectClient) {}

  public async listQueries(params?: {
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectQuery>> {
    return this.client.get<HalCollection<OpenProjectQuery>>('/queries', params, { useCache: true });
  }

  public async getQuery(id: number): Promise<OpenProjectQuery> {
    return this.client.get<OpenProjectQuery>(`/queries/${id}`, undefined, { useCache: true });
  }

  public async listNotifications(params?: {
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectNotification>> {
    return this.client.get<HalCollection<OpenProjectNotification>>('/notifications', params, {
      useCache: true,
    });
  }

  public async markNotificationsRead(notificationIds: number[]): Promise<unknown> {
    const payload = {
      _links: {
        notifications: notificationIds.map((id) => ({ href: `/api/v3/notifications/${id}` })),
      },
    };
    return this.client.post('/notifications/read_ian', payload);
  }

  public async listWatchers(workPackageId: number): Promise<OpenProjectUser[]> {
    const res = await this.client.get<any>(`/work_packages/${workPackageId}/watchers`, undefined, {
      useCache: true,
    });
    return res._embedded?.elements || [];
  }

  public async addWatcher(workPackageId: number, userId: number): Promise<unknown> {
    const payload = {
      user: { href: `/api/v3/users/${userId}` },
    };
    return this.client.post(`/work_packages/${workPackageId}/watchers`, payload);
  }

  public async removeWatcher(workPackageId: number, userId: number): Promise<unknown> {
    return this.client.delete(`/work_packages/${workPackageId}/watchers/${userId}`);
  }

  public async listBudgets(projectId?: string | number): Promise<unknown[]> {
    if (projectId) {
      const resolved = this.client.resolveProjectId(projectId);
      const res = await this.client.get<any>(`/projects/${resolved}/budgets`, undefined, {
        useCache: true,
      });
      return res._embedded?.elements || [];
    }
    const res = await this.client.get<any>('/budgets', undefined, { useCache: true });
    return res._embedded?.elements || [];
  }

  public async getBudget(id: number): Promise<unknown> {
    return this.client.get(`/budgets/${id}`, undefined, { useCache: true });
  }
}
