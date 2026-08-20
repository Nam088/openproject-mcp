import { IOpenProjectClient } from '../core/openproject-client.js';
import {
  HalCollection,
  OpenProjectTimeEntry,
  OpenProjectWorkPackage,
} from '../types/openproject.types.js';
import { ITimeEntriesService } from './contracts/index.js';
import { parseDurationToHours } from './projects.service.js';

export function formatIsoDuration(hoursOrDuration: number | string): string {
  if (typeof hoursOrDuration === 'string' && hoursOrDuration.startsWith('P')) {
    return hoursOrDuration;
  }
  const hoursNum =
    typeof hoursOrDuration === 'string' ? parseFloat(hoursOrDuration) : hoursOrDuration;
  if (isNaN(hoursNum) || hoursNum <= 0) {
    return 'PT1H';
  }
  const totalMinutes = Math.round(hoursNum * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (m === 0) return `PT${h}H`;
  if (h === 0) return `PT${m}M`;
  return `PT${h}H${m}M`;
}

export class TimeEntriesService implements ITimeEntriesService {
  constructor(private readonly client: IOpenProjectClient) {}

  public async createTimeEntry(data: {
    workPackageId?: number;
    projectId?: string | number;
    hours: number | string;
    spentOn: string;
    activityId: number;
    comment?: string;
    userId?: number;
  }): Promise<OpenProjectTimeEntry> {
    const hours = formatIsoDuration(data.hours);

    const payload: Record<string, unknown> = {
      hours,
      spentOn: data.spentOn,
    };

    if (data.comment) {
      payload.comment = {
        format: 'markdown',
        raw: data.comment,
      };
    }

    const links: Record<string, unknown> = {
      activity: { href: `/api/v3/time_entries/activities/${data.activityId}` },
    };

    if (data.workPackageId) {
      links.workPackage = { href: `/api/v3/work_packages/${data.workPackageId}` };
    }

    if (data.projectId) {
      const resolved = this.client.resolveProjectId(data.projectId);
      links.project = { href: `/api/v3/projects/${resolved}` };
    }

    if (data.userId) {
      links.user = { href: `/api/v3/users/${data.userId}` };
    }

    payload._links = links;

    return this.client.post<OpenProjectTimeEntry>('/time_entries', payload);
  }

  public async listTimeEntries(params?: {
    workPackageId?: number;
    projectId?: string | number;
    userId?: number;
    spentOn?: string;
    from?: string;
    to?: string;
    activityId?: number;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectTimeEntry>> {
    const filters: Array<Record<string, unknown>> = [];

    if (params?.workPackageId) {
      filters.push({ work_package: { operator: '=', values: [String(params.workPackageId)] } });
    }
    if (params?.projectId) {
      const resolved = this.client.resolveProjectId(params.projectId);
      filters.push({ project: { operator: '=', values: [resolved] } });
    }
    if (params?.userId) {
      filters.push({ user: { operator: '=', values: [String(params.userId)] } });
    }
    if (params?.spentOn) {
      filters.push({ spent_on: { operator: '=d', values: [params.spentOn] } });
    }
    if (params?.from && params?.to) {
      filters.push({ spent_on: { operator: '<>d', values: [params.from, params.to] } });
    } else if (params?.from) {
      filters.push({ spent_on: { operator: '>=d', values: [params.from] } });
    } else if (params?.to) {
      filters.push({ spent_on: { operator: '<=d', values: [params.to] } });
    }
    if (params?.activityId) {
      filters.push({ activity: { operator: '=', values: [String(params.activityId)] } });
    }

    const queryParams: Record<string, unknown> = {};
    if (filters.length > 0) {
      queryParams.filters = JSON.stringify(filters);
    }
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.offset) queryParams.offset = params.offset;

    return this.client.get<HalCollection<OpenProjectTimeEntry>>('/time_entries', queryParams, {
      useCache: true,
    });
  }

  public async getTimeEntry(id: number): Promise<OpenProjectTimeEntry> {
    return this.client.get<OpenProjectTimeEntry>(`/time_entries/${id}`, undefined, {
      useCache: true,
    });
  }

  public async updateTimeEntry(
    id: number,
    data: {
      hours?: number | string;
      spentOn?: string;
      activityId?: number;
      comment?: string;
    }
  ): Promise<OpenProjectTimeEntry> {
    const payload: Record<string, unknown> = {};

    if (data.hours !== undefined) {
      payload.hours = formatIsoDuration(data.hours);
    }
    if (data.spentOn !== undefined) {
      payload.spentOn = data.spentOn;
    }
    if (data.comment !== undefined) {
      payload.comment = {
        format: 'markdown',
        raw: data.comment,
      };
    }
    if (data.activityId !== undefined) {
      payload._links = {
        activity: { href: `/api/v3/time_entries/activities/${data.activityId}` },
      };
    }

    return this.client.patch<OpenProjectTimeEntry>(`/time_entries/${id}`, payload);
  }

  public async deleteTimeEntry(id: number): Promise<unknown> {
    return this.client.delete(`/time_entries/${id}`);
  }

  public async listTimeEntryActivities(projectId?: string | number): Promise<unknown[]> {
    if (projectId) {
      const resolved = this.client.resolveProjectId(projectId);
      try {
        const res = await this.client.get<any>(
          `/projects/${resolved}/time_entries/activities`,
          undefined,
          {
            useCache: true,
          }
        );
        return res._embedded?.elements || [];
      } catch {
        // Fall back to global activities
      }
    }
    const res = await this.client.get<any>('/time_entries/activities', undefined, {
      useCache: true,
    });
    return res._embedded?.elements || [];
  }

  public async getTimeEntryActivity(id: number): Promise<unknown> {
    return this.client.get(`/time_entries/activities/${id}`, undefined, { useCache: true });
  }

  public async getTimeEntriesSchema(): Promise<unknown> {
    return this.client.get('/time_entries/schema', undefined, { useCache: true });
  }

  /**
   * Returns a breakdown of time logged for a given date, compares against target hours (e.g. 8h),
   * lists tasks worked on vs assigned tasks with zero logged time, and provides suggestions.
   */
  public async getDailyTimeSummary(
    date?: string,
    userId: number | 'me' = 'me',
    targetHours = 8,
    projectId?: string | number
  ): Promise<{
    date: string;
    totalLoggedHours: number;
    targetHours: number;
    remainingHours: number;
    isTargetMet: boolean;
    entries: Array<{
      id: number;
      workPackageId?: number;
      workPackageSubject?: string;
      hours: number;
      activityName?: string;
      comment?: string;
    }>;
    unloggedTasks: Array<{
      id: number;
      subject: string;
      status?: string;
      estimatedTime?: string | null;
      spentTime?: string | null;
    }>;
    recommendations: string[];
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 1. Fetch time entries for this date
    let elements: any[] = [];
    try {
      const timeEntriesRes = await this.listTimeEntries({
        spentOn: targetDate,
        userId: userId === 'me' ? undefined : userId,
        projectId,
        pageSize: 100,
      });
      elements = timeEntriesRes._embedded?.elements || [];
    } catch {
      // Graceful fallback when time entries are forbidden or not enabled
      elements = [];
    }
    let totalLoggedHours = 0;
    const loggedWpIds = new Set<number>();

    const detailedEntries = elements.map((entry: any) => {
      const hoursDec = parseDurationToHours(entry.hours);
      totalLoggedHours += hoursDec;

      let wpId: number | undefined;
      const wpHref = entry._links?.workPackage?.href;
      if (wpHref) {
        wpId = parseInt(wpHref.split('/').pop() || '0', 10);
        if (wpId) loggedWpIds.add(wpId);
      }

      return {
        id: entry.id,
        workPackageId: wpId,
        workPackageSubject: entry._links?.workPackage?.title || `Work Package #${wpId || 'N/A'}`,
        hours: parseFloat(hoursDec.toFixed(2)),
        activityName: entry._links?.activity?.title || 'Activity',
        comment: entry.comment?.raw || entry.comment?.html || undefined,
      };
    });

    totalLoggedHours = parseFloat(totalLoggedHours.toFixed(2));
    const remainingHours = parseFloat(Math.max(0, targetHours - totalLoggedHours).toFixed(2));
    const isTargetMet = totalLoggedHours >= targetHours;

    // 2. Fetch assigned open/in-progress tasks to identify unlogged tasks
    const wpFilters: Array<Record<string, unknown>> = [{ status: { operator: 'o', values: [] } }];
    if (userId !== 'me') {
      wpFilters.push({ assignee: { operator: '=', values: [String(userId)] } });
    }
    if (projectId) {
      const resolved = this.client.resolveProjectId(projectId);
      wpFilters.push({ project: { operator: '=', values: [resolved] } });
    }

    let unloggedTasks: Array<{
      id: number;
      subject: string;
      status?: string;
      estimatedTime?: string | null;
      spentTime?: string | null;
    }> = [];

    try {
      const wpRes = await this.client.get<HalCollection<OpenProjectWorkPackage>>(
        '/work_packages',
        { filters: JSON.stringify(wpFilters), pageSize: 50 },
        { useCache: true }
      );
      const allWps = wpRes._embedded?.elements || [];
      unloggedTasks = allWps
        .filter((wp) => !loggedWpIds.has(wp.id))
        .slice(0, 10)
        .map((wp) => ({
          id: wp.id,
          subject: wp.subject,
          status: (wp._links?.status as any)?.title || (wp as any)._embedded?.status?.name,
          estimatedTime: wp.estimatedTime,
          spentTime: wp.spentTime,
        }));
    } catch {
      // ignore
    }

    // 3. Generate recommendations
    const recommendations: string[] = [];
    if (totalLoggedHours === 0) {
      recommendations.push(
        `No time has been logged yet for ${targetDate}. Target is ${targetHours}h.`
      );
    } else if (remainingHours > 0) {
      recommendations.push(
        `Logged ${totalLoggedHours}h / ${targetHours}h target. Still need to log ${remainingHours}h.`
      );
    } else {
      recommendations.push(
        `Great job! Daily target of ${targetHours}h is fulfilled (${totalLoggedHours}h logged).`
      );
    }

    if (unloggedTasks.length > 0 && remainingHours > 0) {
      recommendations.push(
        `Consider logging remaining time on active assigned tasks: ${unloggedTasks
          .slice(0, 3)
          .map((t) => `OP#${t.id} (${t.subject})`)
          .join(', ')}.`
      );
    }

    return {
      date: targetDate,
      totalLoggedHours,
      targetHours,
      remainingHours,
      isTargetMet,
      entries: detailedEntries,
      unloggedTasks,
      recommendations,
    };
  }

  /**
   * Audits a date range for unlogged or under-logged days and produces suggested time entry actions.
   */
  public async auditUnloggedWork(params: {
    from: string;
    to: string;
    userId?: number | 'me';
    dailyTargetHours?: number;
    includeWeekends?: boolean;
    projectId?: string | number;
  }): Promise<{
    dateRange: { from: string; to: string };
    totalLoggedHours: number;
    totalTargetHours: number;
    missingHoursTotal: number;
    daysSummary: Array<{
      date: string;
      dayOfWeek: string;
      isWeekend: boolean;
      loggedHours: number;
      targetHours: number;
      status: 'complete' | 'under_logged' | 'missing' | 'weekend';
      tasksLogged: number[];
    }>;
    suggestedWorkPackagesToLog: Array<{
      workPackageId: number;
      subject: string;
      suggestedDates: string[];
    }>;
  }> {
    const dailyTarget = params.dailyTargetHours ?? 8;
    const includeWeekends = params.includeWeekends ?? false;

    // Fetch all entries in range
    let entries: any[] = [];
    try {
      const entriesRes = await this.listTimeEntries({
        from: params.from,
        to: params.to,
        userId: params.userId === 'me' ? undefined : params.userId,
        projectId: params.projectId,
        pageSize: 250,
      });
      entries = entriesRes._embedded?.elements || [];
    } catch {
      entries = [];
    }

    // Map entries by date
    const entriesByDate = new Map<string, { totalHours: number; wpIds: Set<number> }>();
    for (const entry of entries) {
      const date = entry.spentOn;
      const hours = parseDurationToHours(entry.hours);
      if (!entriesByDate.has(date)) {
        entriesByDate.set(date, { totalHours: 0, wpIds: new Set<number>() });
      }
      const dayData = entriesByDate.get(date)!;
      dayData.totalHours += hours;
      const wpHref = (entry._links?.workPackage as any)?.href;
      if (wpHref) {
        const wpId = parseInt(wpHref.split('/').pop() || '0', 10);
        if (wpId) dayData.wpIds.add(wpId);
      }
    }

    // Iterate through dates from `params.from` to `params.to`
    const daysSummary: Array<{
      date: string;
      dayOfWeek: string;
      isWeekend: boolean;
      loggedHours: number;
      targetHours: number;
      status: 'complete' | 'under_logged' | 'missing' | 'weekend';
      tasksLogged: number[];
    }> = [];

    let totalLoggedHours = 0;
    let totalTargetHours = 0;
    const underLoggedDates: string[] = [];

    const startDate = new Date(params.from);
    const endDate = new Date(params.to);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayIndex = d.getDay();
      const isWeekend = dayIndex === 0 || dayIndex === 6;
      const dayOfWeek = dayNames[dayIndex];

      const dayData = entriesByDate.get(dateStr) || { totalHours: 0, wpIds: new Set<number>() };
      const loggedHours = parseFloat(dayData.totalHours.toFixed(2));
      totalLoggedHours += loggedHours;

      if (isWeekend && !includeWeekends) {
        daysSummary.push({
          date: dateStr,
          dayOfWeek,
          isWeekend: true,
          loggedHours,
          targetHours: 0,
          status: 'weekend',
          tasksLogged: Array.from(dayData.wpIds),
        });
      } else {
        totalTargetHours += dailyTarget;
        let status: 'complete' | 'under_logged' | 'missing' = 'complete';
        if (loggedHours === 0) {
          status = 'missing';
          underLoggedDates.push(dateStr);
        } else if (loggedHours < dailyTarget) {
          status = 'under_logged';
          underLoggedDates.push(dateStr);
        }

        daysSummary.push({
          date: dateStr,
          dayOfWeek,
          isWeekend,
          loggedHours,
          targetHours: dailyTarget,
          status,
          tasksLogged: Array.from(dayData.wpIds),
        });
      }
    }

    totalLoggedHours = parseFloat(totalLoggedHours.toFixed(2));
    const missingHoursTotal = parseFloat(
      Math.max(0, totalTargetHours - totalLoggedHours).toFixed(2)
    );

    // Fetch assigned tasks to suggest for the under-logged dates
    let suggestedWorkPackagesToLog: Array<{
      workPackageId: number;
      subject: string;
      suggestedDates: string[];
    }> = [];

    if (underLoggedDates.length > 0) {
      try {
        const wpFilters: Array<Record<string, unknown>> = [
          { status: { operator: 'o', values: [] } },
        ];
        if (params.userId && params.userId !== 'me') {
          wpFilters.push({ assignee: { operator: '=', values: [String(params.userId)] } });
        }
        if (params.projectId) {
          const resolved = this.client.resolveProjectId(params.projectId);
          wpFilters.push({ project: { operator: '=', values: [resolved] } });
        }

        const wpRes = await this.client.get<HalCollection<OpenProjectWorkPackage>>(
          '/work_packages',
          { filters: JSON.stringify(wpFilters), pageSize: 10 },
          { useCache: true }
        );

        const openWps = wpRes._embedded?.elements || [];
        suggestedWorkPackagesToLog = openWps.slice(0, 5).map((wp) => ({
          workPackageId: wp.id,
          subject: wp.subject,
          suggestedDates: underLoggedDates.slice(0, 5),
        }));
      } catch {
        // ignore
      }
    }

    return {
      dateRange: { from: params.from, to: params.to },
      totalLoggedHours,
      totalTargetHours,
      missingHoursTotal,
      daysSummary,
      suggestedWorkPackagesToLog,
    };
  }
}
