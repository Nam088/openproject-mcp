import { IOpenProjectClient } from '../core/openproject-client.js';
import {
  HalCollection,
  OpenProjectCategory,
  OpenProjectProject,
  OpenProjectStatus,
  OpenProjectType,
  OpenProjectUser,
  OpenProjectVersion,
  OpenProjectWorkPackage,
} from '../types/openproject.types.js';
import { IProjectsService } from './contracts/index.js';

export function parseDurationToHours(isoDuration?: string | null): number {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) {
    const num = parseFloat(isoDuration);
    return isNaN(num) ? 0 : num;
  }
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return hours + minutes / 60;
}

export class ProjectsService implements IProjectsService {
  constructor(private readonly client: IOpenProjectClient) {}

  public async getProject(idOrIdentifier: string | number): Promise<OpenProjectProject> {
    const resolved = this.client.resolveProjectId(idOrIdentifier);
    return this.client.get<OpenProjectProject>(`/projects/${resolved}`, undefined, {
      useCache: true,
    });
  }

  public async listProjects(params?: {
    filters?: string | Array<Record<string, unknown>>;
    sortBy?: string;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectProject>> {
    const queryParams: Record<string, unknown> = {};
    if (params?.filters) {
      queryParams.filters =
        typeof params.filters === 'string' ? params.filters : JSON.stringify(params.filters);
    }
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.offset) queryParams.offset = params.offset;

    return this.client.get<HalCollection<OpenProjectProject>>('/projects', queryParams, {
      useCache: true,
    });
  }

  public async createProject(data: {
    name: string;
    identifier?: string;
    description?: string;
    public?: boolean;
    parentId?: number;
  }): Promise<OpenProjectProject> {
    const payload: Record<string, unknown> = {
      name: data.name,
    };
    if (data.identifier) payload.identifier = data.identifier;
    if (data.public !== undefined) payload.public = data.public;
    if (data.description) {
      payload.description = {
        format: 'markdown',
        raw: data.description,
      };
    }
    if (data.parentId) {
      payload._links = {
        parent: { href: `/api/v3/projects/${data.parentId}` },
      };
    }

    return this.client.post<OpenProjectProject>('/projects', payload);
  }

  public async updateProject(
    idOrIdentifier: string | number,
    data: {
      name?: string;
      description?: string;
      public?: boolean;
      active?: boolean;
    }
  ): Promise<OpenProjectProject> {
    const resolved = this.client.resolveProjectId(idOrIdentifier);
    const payload: Record<string, unknown> = {};

    if (data.name !== undefined) payload.name = data.name;
    if (data.public !== undefined) payload.public = data.public;
    if (data.active !== undefined) payload.active = data.active;
    if (data.description !== undefined) {
      payload.description = {
        format: 'markdown',
        raw: data.description,
      };
    }

    return this.client.patch<OpenProjectProject>(`/projects/${resolved}`, payload);
  }

  public async deleteProject(idOrIdentifier: string | number): Promise<unknown> {
    const resolved = this.client.resolveProjectId(idOrIdentifier);
    return this.client.delete(`/projects/${resolved}`);
  }

  public async listProjectStatuses(idOrIdentifier?: string | number): Promise<OpenProjectStatus[]> {
    const resolved = this.client.resolveProjectId(idOrIdentifier);
    const res = await this.client.get<any>(`/projects/${resolved}/available_statuses`, undefined, {
      useCache: true,
    });
    return res._embedded?.elements || [];
  }

  public async listAvailableAssignees(
    idOrIdentifier?: string | number
  ): Promise<OpenProjectUser[]> {
    const resolved = this.client.resolveProjectId(idOrIdentifier);
    const res = await this.client.get<any>(`/projects/${resolved}/available_assignees`, undefined, {
      useCache: true,
    });
    return res._embedded?.elements || [];
  }

  public async listAvailableStatuses(
    idOrIdentifier?: string | number
  ): Promise<OpenProjectStatus[]> {
    return this.listProjectStatuses(idOrIdentifier);
  }

  public async listProjectCategories(
    idOrIdentifier?: string | number
  ): Promise<OpenProjectCategory[]> {
    const resolved = this.client.resolveProjectId(idOrIdentifier);
    const res = await this.client.get<any>(`/projects/${resolved}/categories`, undefined, {
      useCache: true,
    });
    return res._embedded?.elements || [];
  }

  public async listProjectVersions(
    idOrIdentifier?: string | number
  ): Promise<OpenProjectVersion[]> {
    const resolved = this.client.resolveProjectId(idOrIdentifier);
    const res = await this.client.get<any>(`/projects/${resolved}/versions`, undefined, {
      useCache: true,
    });
    return res._embedded?.elements || [];
  }

  public async listProjectTypes(idOrIdentifier?: string | number): Promise<OpenProjectType[]> {
    const resolved = this.client.resolveProjectId(idOrIdentifier);
    const res = await this.client.get<any>(`/projects/${resolved}/types`, undefined, {
      useCache: true,
    });
    return res._embedded?.elements || [];
  }

  public async getSprintSummary(
    projectId?: string | number,
    versionId?: number
  ): Promise<{
    versionName?: string;
    totalTasks: number;
    closedTasks: number;
    openTasks: number;
    estimatedHours: number;
    spentHours: number;
    progressPercentage: number;
    tasks: OpenProjectWorkPackage[];
  }> {
    const resolved = this.client.resolveProjectId(projectId);
    const filters: Array<Record<string, unknown>> = [
      { project: { operator: '=', values: [resolved] } },
    ];
    if (versionId) {
      filters.push({ version: { operator: '=', values: [String(versionId)] } });
    }

    const res = await this.client.get<HalCollection<OpenProjectWorkPackage>>('/work_packages', {
      filters: JSON.stringify(filters),
      pageSize: 100,
    });

    const tasks = res._embedded?.elements || [];
    let estimatedHours = 0;
    let spentHours = 0;
    let closedTasks = 0;

    for (const task of tasks) {
      estimatedHours += parseDurationToHours(task.estimatedTime);
      spentHours += parseDurationToHours(task.spentTime);

      const isClosed =
        (task as any)._embedded?.status?.isClosed ||
        (task._links?.status as any)?.title?.toLowerCase() === 'closed';
      if (isClosed) {
        closedTasks++;
      }
    }

    const totalTasks = tasks.length;
    const openTasks = totalTasks - closedTasks;
    const progressPercentage = totalTasks > 0 ? Math.round((closedTasks / totalTasks) * 100) : 0;

    let versionName: string | undefined;
    if (versionId) {
      try {
        const v = await this.client.get<OpenProjectVersion>(`/versions/${versionId}`);
        versionName = v.name;
      } catch {
        // ignore
      }
    }

    return {
      versionName,
      totalTasks,
      closedTasks,
      openTasks,
      estimatedHours: parseFloat(estimatedHours.toFixed(2)),
      spentHours: parseFloat(spentHours.toFixed(2)),
      progressPercentage,
      tasks,
    };
  }
}
