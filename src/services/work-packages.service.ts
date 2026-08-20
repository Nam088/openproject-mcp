import TurndownService from 'turndown';
// @ts-expect-error missing type definitions for turndown-plugin-gfm
import { gfm } from 'turndown-plugin-gfm';
import { IOpenProjectClient } from '../core/openproject-client.js';
import { HalCollection, OpenProjectWorkPackage } from '../types/openproject.types.js';
import { IWorkPackagesService } from './contracts/index.js';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});
turndownService.use(gfm);

// Custom rules for OpenProject CKEditor rich markup
turndownService.addRule('opCell', {
  filter: ['td', 'th'],
  replacement: (content) => {
    const trimmed = content.replace(/\n+/g, ' ').trim();
    return ' | ' + trimmed + ' ';
  },
});
turndownService.addRule('opRow', {
  filter: 'tr',
  replacement: (content) => content + ' |\n',
});
turndownService.addRule('opTable', {
  filter: 'table',
  replacement: (content) => '\n\n' + content.trim() + '\n\n',
});
turndownService.addRule('opFigure', {
  filter: 'figure',
  replacement: (content) => content,
});
turndownService.addRule('opImage', {
  filter: (node) => node.nodeName === 'IMG' && Boolean((node as any).getAttribute?.('src')),
  replacement: (_content, node) => {
    const el = node as any;
    const src = el.getAttribute?.('src') || '';
    const alt = el.getAttribute?.('alt') || 'image';
    return ` ![${alt}](${src}) `;
  },
});

function cleanHtmlToMarkdown(text?: string | null): string | null {
  if (!text) return null;
  if (!text.includes('<') || !text.includes('>')) return text.trim();
  try {
    const converted = turndownService.turndown(text);
    return converted
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '') // strip any leftover unknown HTML tags
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return text.trim();
  }
}

function getNestedPath(obj: unknown, path: string): unknown {
  let cur: any = obj;
  for (const seg of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[seg];
  }
  return cur;
}

export function formatWorkPackage(
  wp: OpenProjectWorkPackage | Record<string, any>,
  options?: { compact?: boolean; fields?: string[] }
): Record<string, unknown> {
  if (!options?.compact && (!options?.fields || options.fields.length === 0)) {
    return wp as Record<string, unknown>;
  }

  const raw: Record<string, any> = wp;
  const links = raw._links || {};
  const embedded = raw._embedded || {};

  const rawDesc =
    raw.description?.raw ?? (typeof raw.description === 'string' ? raw.description : null);
  const formattedDesc = options?.compact ? cleanHtmlToMarkdown(rawDesc) : rawDesc;

  const compactData: Record<string, unknown> = {
    id: raw.id,
    subject: raw.subject,
    type: getNestedPath(embedded, 'type.name') ?? links.type?.title ?? null,
    status: getNestedPath(embedded, 'status.name') ?? links.status?.title ?? null,
    priority: getNestedPath(embedded, 'priority.name') ?? links.priority?.title ?? null,
    project: getNestedPath(embedded, 'project.name') ?? links.project?.title ?? null,
    assignee: links.assignee?.title ?? null,
    responsible: links.responsible?.title ?? null,
    author: links.author?.title ?? null,
    version: getNestedPath(embedded, 'version.name') ?? links.version?.title ?? null,
    startDate: raw.startDate ?? null,
    dueDate: raw.dueDate ?? null,
    estimatedTime: raw.estimatedTime ?? null,
    spentTime: raw.spentTime ?? null,
    percentageDone: raw.percentageDone ?? null,
    lockVersion: raw.lockVersion,
    parent: links.parent?.title ?? links.parent?.href ?? null,
    description: formattedDesc,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };

  // Add custom fields
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('customField')) {
      const linkTitle = links[key]?.title;
      compactData[key] = linkTitle ?? value;
    }
  }

  if (options?.fields && options.fields.length > 0) {
    const projected: Record<string, unknown> = {};
    for (const f of options.fields) {
      if (f in compactData) {
        projected[f] = compactData[f];
      } else {
        projected[f] = getNestedPath(raw, f) ?? null;
      }
    }
    return projected;
  }

  return compactData;
}

export class WorkPackagesService implements IWorkPackagesService {
  constructor(private readonly client: IOpenProjectClient) {}

  public async getWorkPackage<T = any>(
    id: number,
    options?: { compact?: boolean; fields?: string[] }
  ): Promise<T> {
    const data = await this.client.get<OpenProjectWorkPackage>(`/work_packages/${id}`, undefined, {
      useCache: true,
    });
    return formatWorkPackage(data, options) as unknown as T;
  }

  public async listWorkPackages<T = any>(params?: {
    filters?: string | Array<Record<string, unknown>>;
    sortBy?: string | string[];
    pageSize?: number;
    offset?: number;
    groupBy?: string;
    showHierarchies?: boolean;
    compact?: boolean;
    fields?: string[];
  }): Promise<T> {
    const queryParams: Record<string, unknown> = {};
    if (params?.filters) {
      queryParams.filters =
        typeof params.filters === 'string' ? params.filters : JSON.stringify(params.filters);
    }
    if (params?.sortBy) {
      queryParams.sortBy =
        typeof params.sortBy === 'string' ? params.sortBy : JSON.stringify(params.sortBy);
    }
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.offset) queryParams.offset = params.offset;
    if (params?.groupBy) queryParams.groupBy = params.groupBy;
    if (params?.showHierarchies !== undefined) queryParams.showHierarchies = params.showHierarchies;

    const res = await this.client.get<HalCollection<OpenProjectWorkPackage>>(
      '/work_packages',
      queryParams,
      {
        useCache: true,
      }
    );

    if (params?.compact || (params?.fields && params.fields.length > 0)) {
      const elements = res._embedded?.elements || [];
      return {
        total: res.total,
        count: res.count,
        pageSize: res.pageSize,
        offset: res.offset,
        elements: elements.map((wp) =>
          formatWorkPackage(wp, { compact: params.compact, fields: params.fields })
        ),
      } as unknown as T;
    }

    return res as unknown as T;
  }

  public async createWorkPackage(
    subject: string,
    projectId?: string | number,
    data?: {
      description?: string;
      typeId?: number;
      statusId?: number;
      priorityId?: number;
      assigneeId?: number;
      responsibleId?: number;
      startDate?: string;
      dueDate?: string;
      estimatedTime?: string;
      percentageDone?: number;
      parentId?: number;
      customFields?: Record<string, unknown>;
    }
  ): Promise<OpenProjectWorkPackage> {
    const resolvedProjectId = this.client.resolveProjectId(projectId);

    const payload: Record<string, unknown> = {
      subject,
      ...data?.customFields,
    };

    if (data?.description) {
      payload.description = {
        format: 'markdown',
        raw: data.description,
      };
    }
    if (data?.startDate) payload.startDate = data.startDate;
    if (data?.dueDate) payload.dueDate = data.dueDate;
    if (data?.estimatedTime) payload.estimatedTime = data.estimatedTime;
    if (data?.percentageDone !== undefined) payload.percentageDone = data.percentageDone;

    const links: Record<string, unknown> = {
      project: { href: `/api/v3/projects/${resolvedProjectId}` },
    };

    if (data?.typeId) links.type = { href: `/api/v3/types/${data.typeId}` };
    if (data?.statusId) links.status = { href: `/api/v3/statuses/${data.statusId}` };
    if (data?.priorityId) links.priority = { href: `/api/v3/priorities/${data.priorityId}` };
    if (data?.assigneeId) links.assignee = { href: `/api/v3/users/${data.assigneeId}` };
    if (data?.responsibleId) links.responsible = { href: `/api/v3/users/${data.responsibleId}` };
    if (data?.parentId) links.parent = { href: `/api/v3/work_packages/${data.parentId}` };

    payload._links = links;

    return this.client.post<OpenProjectWorkPackage>(
      `/projects/${resolvedProjectId}/work_packages`,
      payload
    );
  }

  public async updateWorkPackage(
    id: number,
    payload: {
      subject?: string;
      description?: string | { format: 'markdown' | 'plain'; raw: string };
      statusId?: number;
      typeId?: number;
      priorityId?: number;
      assigneeId?: number;
      responsibleId?: number;
      startDate?: string | null;
      dueDate?: string | null;
      estimatedTime?: string | null;
      remainingTime?: string | null;
      percentageDone?: number | null;
      parentId?: number | null;
      lockVersion?: number;
      customFields?: Record<string, unknown>;
      _links?: Record<string, unknown>;
    }
  ): Promise<OpenProjectWorkPackage> {
    const patchPayload: Record<string, unknown> = {
      ...payload.customFields,
    };

    if (payload.subject !== undefined) patchPayload.subject = payload.subject;
    if (payload.description !== undefined) {
      patchPayload.description =
        typeof payload.description === 'string'
          ? { format: 'markdown', raw: payload.description }
          : payload.description;
    }
    if (payload.startDate !== undefined) patchPayload.startDate = payload.startDate;
    if (payload.dueDate !== undefined) patchPayload.dueDate = payload.dueDate;
    if (payload.estimatedTime !== undefined) patchPayload.estimatedTime = payload.estimatedTime;
    if (payload.remainingTime !== undefined) patchPayload.remainingTime = payload.remainingTime;
    if (payload.percentageDone !== undefined) patchPayload.percentageDone = payload.percentageDone;
    if (payload.lockVersion !== undefined) patchPayload.lockVersion = payload.lockVersion;

    const links: Record<string, unknown> = {
      ...(payload._links || {}),
    };

    if (payload.statusId !== undefined)
      links.status = { href: `/api/v3/statuses/${payload.statusId}` };
    if (payload.typeId !== undefined) links.type = { href: `/api/v3/types/${payload.typeId}` };
    if (payload.priorityId !== undefined)
      links.priority = { href: `/api/v3/priorities/${payload.priorityId}` };
    if (payload.assigneeId !== undefined) {
      links.assignee = payload.assigneeId
        ? { href: `/api/v3/users/${payload.assigneeId}` }
        : { href: null };
    }
    if (payload.responsibleId !== undefined) {
      links.responsible = payload.responsibleId
        ? { href: `/api/v3/users/${payload.responsibleId}` }
        : { href: null };
    }
    if (payload.parentId !== undefined) {
      links.parent = payload.parentId
        ? { href: `/api/v3/work_packages/${payload.parentId}` }
        : { href: null };
    }

    if (Object.keys(links).length > 0) {
      patchPayload._links = links;
    }

    return this.client.patchWorkPackageWithLock(id, patchPayload);
  }

  public async deleteWorkPackage(id: number): Promise<unknown> {
    return this.client.delete(`/work_packages/${id}`);
  }

  public async getWorkPackageSchema(schemaIdOrType = '1-1'): Promise<unknown> {
    return this.client.get(`/work_packages/schemas/${schemaIdOrType}`, undefined, {
      useCache: true,
    });
  }

  public async listWorkPackageChildren(id: number): Promise<OpenProjectWorkPackage[]> {
    const filters = [{ parent: { operator: '=', values: [String(id)] } }];
    const res = await this.listWorkPackages({ filters, pageSize: 100 });
    return res._embedded?.elements || [];
  }

  public async listWorkPackageAncestors(id: number): Promise<OpenProjectWorkPackage[]> {
    const current = await this.getWorkPackage(id);
    const ancestors: OpenProjectWorkPackage[] = [];
    const visited = new Set<number>([id]);
    let parentHref = (current._links?.parent as any)?.href;

    while (parentHref) {
      const parentId = parseInt(parentHref.split('/').pop() || '0', 10);
      if (!parentId || visited.has(parentId)) break;
      visited.add(parentId);
      const parent = await this.getWorkPackage(parentId);
      ancestors.push(parent);
      parentHref = (parent._links?.parent as any)?.href;
    }

    return ancestors;
  }

  public async listWorkPackageActivities(id: number): Promise<unknown[]> {
    const res = await this.client.get<any>(`/work_packages/${id}/activities`);
    return res._embedded?.elements || [];
  }

  public async addWorkPackageComment(
    id: number,
    comment: string,
    lockVersion?: number
  ): Promise<unknown> {
    const payload: Record<string, unknown> = {
      comment: {
        format: 'markdown',
        raw: comment,
      },
    };
    if (lockVersion !== undefined) {
      payload.lockVersion = lockVersion;
    }
    return this.client.patchWorkPackageWithLock(id, payload);
  }

  public async updateWorkPackageComment(activityId: number, comment: string): Promise<unknown> {
    return this.client.patch(`/activities/${activityId}`, {
      comment: {
        format: 'markdown',
        raw: comment,
      },
    });
  }

  public async listWorkPackagesAssignedTo(
    userId: number | 'me',
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<OpenProjectWorkPackage[]> {
    const filters: Array<Record<string, unknown>> = [
      { assignee: { operator: '=', values: [String(userId)] } },
    ];
    if (state === 'open') {
      filters.push({ status: { operator: 'o', values: [] } });
    } else if (state === 'closed') {
      filters.push({ status: { operator: 'c', values: [] } });
    }

    const res = await this.listWorkPackages({ filters, pageSize: 100 });
    return res._embedded?.elements || [];
  }

  public async listWorkPackagesCreatedBy(
    userId: number | 'me',
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<OpenProjectWorkPackage[]> {
    const filters: Array<Record<string, unknown>> = [
      { author: { operator: '=', values: [String(userId)] } },
    ];
    if (state === 'open') {
      filters.push({ status: { operator: 'o', values: [] } });
    } else if (state === 'closed') {
      filters.push({ status: { operator: 'c', values: [] } });
    }

    const res = await this.listWorkPackages({ filters, pageSize: 100 });
    return res._embedded?.elements || [];
  }

  public async listOverdueWorkPackages(
    projectId?: string | number
  ): Promise<OpenProjectWorkPackage[]> {
    const today = new Date().toISOString().split('T')[0];
    const filters: Array<Record<string, unknown>> = [
      { dueDate: { operator: '<', values: [today] } },
      { status: { operator: 'o', values: [] } },
    ];
    if (projectId) {
      filters.push({ project: { operator: '=', values: [String(projectId)] } });
    }

    const res = await this.listWorkPackages({
      filters,
      pageSize: 100,
      sortBy: '[["dueDate", "asc"]]',
    });
    return res._embedded?.elements || [];
  }

  public async listWorkPackagesByDate(
    date: string,
    projectId?: string | number
  ): Promise<OpenProjectWorkPackage[]> {
    const filters: Array<Record<string, unknown>> = [
      { dueDate: { operator: '=', values: [date] } },
    ];
    if (projectId) {
      filters.push({ project: { operator: '=', values: [String(projectId)] } });
    }

    const res = await this.listWorkPackages({ filters, pageSize: 100 });
    return res._embedded?.elements || [];
  }

  public async listWorkPackagesForVersion(
    versionId: number,
    projectId?: string | number
  ): Promise<OpenProjectWorkPackage[]> {
    const filters: Array<Record<string, unknown>> = [
      { version: { operator: '=', values: [String(versionId)] } },
    ];
    if (projectId) {
      filters.push({ project: { operator: '=', values: [String(projectId)] } });
    }

    const res = await this.listWorkPackages({ filters, pageSize: 100 });
    return res._embedded?.elements || [];
  }

  public async exportWorkPackages(
    format: 'json' | 'csv' | 'pdf' = 'json',
    params?: Record<string, unknown>
  ): Promise<unknown> {
    if (format === 'json') {
      return this.listWorkPackages(params as any);
    }
    return this.client.getRaw(`/work_packages.${format}`);
  }
}
