import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenProjectClient } from '../../src/core/openproject-client.js';
import { createServiceContainer, ServiceContainer } from '../../src/services/index.js';
import { parseDurationToHours } from '../../src/services/projects.service.js';
import { formatIsoDuration } from '../../src/services/time-entries.service.js';

describe('OpenProject Services Complete Suite', () => {
  let client: OpenProjectClient;
  let services: ServiceContainer;

  beforeEach(() => {
    client = new OpenProjectClient({
      host: 'https://community.openproject.org',
      apiKey: 'test-key',
      defaultProjectId: '14',
      readOnlyMode: false,
    });

    vi.spyOn(client, 'get').mockResolvedValue({
      id: 1,
      name: 'test',
      subject: 'WP 1',
      lockVersion: 1,
      _links: { parent: { href: null } },
      _embedded: { elements: [{ id: 1, subject: 'WP 1' }] },
    } as any);

    vi.spyOn(client, 'post').mockResolvedValue({ id: 2, subject: 'Created' } as any);
    vi.spyOn(client, 'patch').mockResolvedValue({ id: 1, subject: 'Patched' } as any);
    vi.spyOn(client, 'patchWorkPackageWithLock').mockResolvedValue({
      id: 1,
      subject: 'Updated',
    } as any);
    vi.spyOn(client, 'delete').mockResolvedValue({ success: true } as any);
    vi.spyOn(client, 'getRaw').mockResolvedValue({
      data: Buffer.from('mock-bytes'),
      contentType: 'text/csv',
      filename: 'export.csv',
    } as any);

    services = createServiceContainer(client);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats ISO 8601 duration correctly in TimeEntriesService', () => {
    expect(formatIsoDuration(1)).toBe('PT1H');
    expect(formatIsoDuration(1.5)).toBe('PT1H30M');
    expect(formatIsoDuration(0.5)).toBe('PT30M');
    expect(formatIsoDuration('PT2H45M')).toBe('PT2H45M');
    expect(formatIsoDuration('2.25')).toBe('PT2H15M');
    expect(formatIsoDuration(-1)).toBe('PT1H');
  });

  it('parses duration to decimal hours in ProjectsService', () => {
    expect(parseDurationToHours('PT1H')).toBe(1);
    expect(parseDurationToHours('PT1H30M')).toBe(1.5);
    expect(parseDurationToHours('PT45M')).toBe(0.75);
    expect(parseDurationToHours('2.5')).toBe(2.5);
    expect(parseDurationToHours(undefined)).toBe(0);
    expect(parseDurationToHours(null)).toBe(0);
  });

  it('tests all WorkPackagesService operations with filters and fields', async () => {
    expect(await services.workPackages.getWorkPackage(1)).toBeDefined();
    expect(
      await services.workPackages.listWorkPackages({
        filters: [{ status: { operator: 'o', values: [] } }],
        sortBy: 'id:asc',
        pageSize: 10,
        offset: 1,
        groupBy: 'status',
        showHierarchies: true,
      })
    ).toBeDefined();

    expect(
      await services.workPackages.createWorkPackage('New WP', '14', {
        description: 'desc',
        typeId: 1,
        statusId: 1,
        priorityId: 8,
        assigneeId: 10,
        responsibleId: 11,
        startDate: '2026-01-01',
        dueDate: '2026-01-10',
        estimatedTime: 'PT1H',
        percentageDone: 50,
        parentId: 2,
      })
    ).toBeDefined();

    expect(
      await services.workPackages.updateWorkPackage(1, {
        subject: 'Updated',
        description: 'New Desc',
        statusId: 7,
        typeId: 1,
        priorityId: 9,
        assigneeId: null,
        responsibleId: null,
        startDate: null,
        dueDate: null,
        estimatedTime: null,
        remainingTime: 'PT30M',
        percentageDone: 80,
        parentId: null,
        lockVersion: 2,
      })
    ).toBeDefined();

    expect(await services.workPackages.deleteWorkPackage(1)).toBeDefined();
    expect(await services.workPackages.getWorkPackageSchema('1-1')).toBeDefined();
    expect(await services.workPackages.listWorkPackageChildren(1)).toBeDefined();
    expect(await services.workPackages.listWorkPackageAncestors(1)).toBeDefined();
    expect(await services.workPackages.listWorkPackageActivities(1)).toBeDefined();
    expect(await services.workPackages.addWorkPackageComment(1, 'Nice', 1)).toBeDefined();
    expect(await services.workPackages.listWorkPackagesAssignedTo('me', 'closed')).toBeDefined();
    expect(await services.workPackages.listWorkPackagesAssignedTo('me', 'all')).toBeDefined();
    expect(await services.workPackages.listWorkPackagesCreatedBy('me', 'closed')).toBeDefined();
    expect(await services.workPackages.listWorkPackagesCreatedBy('me', 'all')).toBeDefined();
    expect(await services.workPackages.listOverdueWorkPackages('14')).toBeDefined();
    expect(await services.workPackages.listWorkPackagesByDate('2026-06-18', '14')).toBeDefined();
    expect(await services.workPackages.listWorkPackagesForVersion(1, '14')).toBeDefined();
    expect(await services.workPackages.exportWorkPackages('json')).toBeDefined();
    expect(await services.workPackages.exportWorkPackages('csv')).toBeDefined();
  });

  it('tests all TimeEntriesService operations', async () => {
    expect(
      await services.timeEntries.createTimeEntry({
        workPackageId: 1,
        projectId: '14',
        hours: 1.5,
        spentOn: '2026-06-18',
        activityId: 3,
        comment: 'Worked',
        userId: 1,
      })
    ).toBeDefined();

    expect(
      await services.timeEntries.listTimeEntries({
        workPackageId: 1,
        projectId: '14',
        userId: 1,
        spentOn: '2026-06-18',
        from: '2026-06-01',
        to: '2026-06-30',
        activityId: 3,
      })
    ).toBeDefined();

    expect(await services.timeEntries.listTimeEntries({ from: '2026-06-01' })).toBeDefined();
    expect(await services.timeEntries.listTimeEntries({ to: '2026-06-30' })).toBeDefined();

    expect(await services.timeEntries.getTimeEntry(10)).toBeDefined();
    expect(
      await services.timeEntries.updateTimeEntry(10, {
        hours: 2,
        spentOn: '2026-06-19',
        activityId: 4,
        comment: 'Updated',
      })
    ).toBeDefined();
    expect(await services.timeEntries.deleteTimeEntry(10)).toBeDefined();
    expect(await services.timeEntries.listTimeEntryActivities('14')).toBeDefined();
    expect(await services.timeEntries.getTimeEntryActivity(3)).toBeDefined();
    expect(await services.timeEntries.getTimeEntriesSchema()).toBeDefined();

    // Daily time summary & Audit unlogged work
    const dailySummary = await services.timeEntries.getDailyTimeSummary(
      '2026-06-18',
      'me',
      8,
      '14'
    );
    expect(dailySummary).toBeDefined();
    expect(dailySummary.date).toBe('2026-06-18');
    expect(dailySummary.targetHours).toBe(8);

    const audit = await services.timeEntries.auditUnloggedWork({
      from: '2026-06-01',
      to: '2026-06-05',
      userId: 1,
      dailyTargetHours: 8,
      includeWeekends: true,
      projectId: '14',
    });
    expect(audit).toBeDefined();
    expect(audit.daysSummary.length).toBe(5);
  });

  it('tests all ProjectsService operations and Sprint Summary', async () => {
    vi.spyOn(client, 'get').mockImplementation(async (url: string) => {
      if (url.includes('/versions/1')) {
        return { id: 1, name: 'Sprint 24' } as any;
      }
      return {
        id: 14,
        name: 'Demo Project',
        _embedded: {
          elements: [
            {
              id: 1,
              subject: 'Task 1',
              estimatedTime: 'PT2H',
              spentTime: 'PT1H30M',
              _embedded: { status: { isClosed: true } },
            },
            {
              id: 2,
              subject: 'Task 2',
              estimatedTime: 'PT3H',
              spentTime: 'PT1H',
              _embedded: { status: { isClosed: false } },
            },
          ],
        },
      } as any;
    });

    const summary = await services.projects.getSprintSummary('14', 1);
    expect(summary.totalTasks).toBe(2);
    expect(summary.closedTasks).toBe(1);
    expect(summary.openTasks).toBe(1);
    expect(summary.estimatedHours).toBe(5);
    expect(summary.spentHours).toBe(2.5);
    expect(summary.progressPercentage).toBe(50);
    expect(summary.versionName).toBe('Sprint 24');

    expect(await services.projects.getProject('14')).toBeDefined();
    expect(
      await services.projects.listProjects({ filters: '[]', sortBy: 'name:asc' })
    ).toBeDefined();
    expect(
      await services.projects.createProject({
        name: 'New Project',
        identifier: 'new-proj',
        description: 'desc',
        public: true,
        parentId: 1,
      })
    ).toBeDefined();
    expect(
      await services.projects.updateProject('14', {
        name: 'Updated',
        description: 'new desc',
        public: false,
        active: true,
      })
    ).toBeDefined();
    expect(await services.projects.deleteProject('14')).toBeDefined();
    expect(await services.projects.listProjectStatuses('14')).toBeDefined();
    expect(await services.projects.listAvailableAssignees('14')).toBeDefined();
    expect(await services.projects.listAvailableStatuses('14')).toBeDefined();
    expect(await services.projects.listProjectCategories('14')).toBeDefined();
    expect(await services.projects.listProjectVersions('14')).toBeDefined();
    expect(await services.projects.listProjectTypes('14')).toBeDefined();
  });

  it('tests Relations, Metadata, Users, Versions, Attachments, and Queries services', async () => {
    // Relations
    expect(await services.relations.listRelations({ filters: '[]' })).toBeDefined();
    expect(await services.relations.getRelation(1)).toBeDefined();
    expect(
      await services.relations.createRelation({
        fromId: 1,
        toId: 2,
        type: 'blocks',
        description: 'blocks next',
        delay: 2,
      })
    ).toBeDefined();
    expect(await services.relations.deleteRelation(1)).toBeDefined();

    // Metadata
    expect(await services.metadata.listStatuses()).toBeDefined();
    expect(await services.metadata.getStatus(1)).toBeDefined();
    expect(await services.metadata.listTypes()).toBeDefined();
    expect(await services.metadata.getType(1)).toBeDefined();
    expect(await services.metadata.listPriorities()).toBeDefined();
    expect(await services.metadata.getPriority(1)).toBeDefined();
    expect(await services.metadata.listCategories()).toBeDefined();
    expect(await services.metadata.listCategories('14')).toBeDefined();
    expect(await services.metadata.getCategory(1)).toBeDefined();

    // Users & Memberships
    expect(await services.users.listUsers()).toBeDefined();
    expect(await services.users.getUser('me')).toBeDefined();
    expect(
      await services.users.createUser({
        login: 'test',
        firstName: 'T',
        lastName: 'U',
        email: 't@example.com',
        admin: true,
        status: 'active',
      })
    ).toBeDefined();
    expect(
      await services.users.updateUser(1, {
        firstName: 'New',
        lastName: 'Last',
        email: 'new@example.com',
        admin: false,
      })
    ).toBeDefined();
    expect(await services.users.deleteUser(1)).toBeDefined();
    expect(await services.users.listMemberships({ projectId: '14', userId: 1 })).toBeDefined();
    expect(
      await services.users.addMembership({ projectId: '14', principalId: 1, roleIds: [3] })
    ).toBeDefined();
    expect(await services.users.updateMembership(1, { roleIds: [4] })).toBeDefined();
    expect(await services.users.deleteMembership(1)).toBeDefined();
    expect(await services.users.listRoles()).toBeDefined();
    expect(await services.users.listGroups()).toBeDefined();
    expect(await services.users.getGroup(1)).toBeDefined();
    expect(await services.users.createGroup({ name: 'Developers' })).toBeDefined();
    expect(await services.users.updateGroup(1, { name: 'Devs' })).toBeDefined();
    expect(await services.users.deleteGroup(1)).toBeDefined();
    expect(await services.users.listPrincipals({ pageSize: 10 })).toBeDefined();

    // Versions
    expect(await services.versions.listVersions()).toBeDefined();
    expect(await services.versions.listVersions('14')).toBeDefined();
    expect(await services.versions.getVersion(1)).toBeDefined();
    expect(
      await services.versions.createVersion('Sprint 25', '14', {
        description: 'Goals',
        startDate: '2026-06-01',
        endDate: '2026-06-15',
        status: 'open',
      })
    ).toBeDefined();
    expect(
      await services.versions.updateVersion(1, {
        name: 'Sprint 25 Updated',
        description: 'Updated goals',
        startDate: '2026-06-02',
        endDate: '2026-06-16',
        status: 'locked',
      })
    ).toBeDefined();
    expect(await services.versions.deleteVersion(1)).toBeDefined();

    // Attachments
    expect(await services.attachments.getAttachment(1)).toBeDefined();
    expect(await services.attachments.deleteAttachment(1)).toBeDefined();
    expect(await services.attachments.viewAttachmentContent(1)).toBeDefined();

    // Queries & Notifications
    expect(await services.queries.listQueries()).toBeDefined();
    expect(await services.queries.getQuery(1)).toBeDefined();
    expect(await services.queries.listNotifications()).toBeDefined();
    expect(await services.queries.markNotificationsRead([1, 2])).toBeDefined();
    expect(await services.queries.listWatchers(1)).toBeDefined();
    expect(await services.queries.addWatcher(1, 2)).toBeDefined();
    expect(await services.queries.removeWatcher(1, 2)).toBeDefined();
    expect(await services.queries.listBudgets()).toBeDefined();
    expect(await services.queries.listBudgets('14')).toBeDefined();
    expect(await services.queries.getBudget(1)).toBeDefined();
  });

  it('tests all DeveloperService productivity features', async () => {
    // 1. quickStartTask
    const startRes = await services.developer.quickStartTask({
      workPackageId: 1,
      statusId: 7,
      assignToMe: true,
      percentageDone: 20,
    });
    expect(startRes).toBeDefined();
    expect(startRes.gitBranchName).toContain('OP-1');
    expect(startRes.commitTemplate).toContain('refs OP#1');

    // 2. quickCompleteTask
    const completeRes = await services.developer.quickCompleteTask({
      workPackageId: 1,
      spentHours: 2.5,
      activityId: 3,
      comment: 'Done implementation',
    });
    expect(completeRes).toBeDefined();
    expect(completeRes.message).toContain('Successfully resolved');

    // 3. getDeveloperDailyStandup
    const standup = await services.developer.getDeveloperDailyStandup({
      date: '2026-08-20',
      userId: 'me',
      projectId: '14',
    });
    expect(standup).toBeDefined();
    expect(standup.standupDate).toBe('2026-08-20');
    expect(standup.markdownReport).toContain('Daily Standup');

    // 4. getGitBranchName & getGitCommitTemplate
    const branchName = await services.developer.getGitBranchName(1);
    expect(branchName).toBeDefined();

    const commitTemplate = await services.developer.getGitCommitTemplate({
      workPackageId: 1,
      type: 'feat',
      scope: 'auth',
      message: 'support PKCE',
    });
    expect(commitTemplate).toContain('feat(auth): support PKCE (refs OP#1)');

    // 5. getTaskDependencyGraph
    const graph = await services.developer.getTaskDependencyGraph(1);
    expect(graph).toBeDefined();
    expect(graph.mermaidDiagram).toContain('flowchart TD');

    // 6. generateQaChecklist
    const qa = await services.developer.generateQaChecklist(1);
    expect(qa).toBeDefined();
    expect(qa.checklistMarkdown).toContain('QA & Verification Checklist');
  });
});
