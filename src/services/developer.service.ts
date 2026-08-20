import { IOpenProjectClient } from '../core/openproject-client.js';
import { OpenProjectWorkPackage } from '../types/openproject.types.js';
import {
  IDeveloperService,
  IMetadataService,
  IProjectsService,
  IRelationsService,
  ITimeEntriesService,
  IUsersService,
  IWorkPackagesService,
} from './contracts/index.js';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 45);
}

export class DeveloperService implements IDeveloperService {
  constructor(
    private readonly client: IOpenProjectClient,
    private readonly workPackages: IWorkPackagesService,
    private readonly timeEntries: ITimeEntriesService,
    private readonly projects: IProjectsService,
    private readonly relations: IRelationsService,
    private readonly metadata: IMetadataService,
    private readonly users: IUsersService
  ) {}

  public async quickStartTask(params: {
    workPackageId: number;
    statusId?: number;
    assignToMe?: boolean;
    percentageDone?: number;
    comment?: string;
  }): Promise<{
    workPackage: OpenProjectWorkPackage;
    gitBranchName: string;
    commitTemplate: string;
    message: string;
  }> {
    const wp = await this.workPackages.getWorkPackage(params.workPackageId);

    // Determine In-Progress status ID if not explicitly provided
    let statusId = params.statusId;
    if (!statusId) {
      try {
        const statuses = await this.metadata.listStatuses();
        const inProgressStatus = statuses.find(
          (s: any) =>
            s.name?.toLowerCase().includes('in progress') ||
            s.name?.toLowerCase().includes('development') ||
            s.name?.toLowerCase().includes('in dev') ||
            s.name?.toLowerCase().includes('doing')
        );
        if (inProgressStatus) {
          statusId = (inProgressStatus as any).id;
        } else {
          statusId = 7; // Default OpenProject 'In Progress' ID
        }
      } catch {
        statusId = 7;
      }
    }

    // Determine current user ID if assignToMe
    let assigneeId: number | undefined;
    if (params.assignToMe ?? true) {
      try {
        const me = await this.users.getUser('me');
        assigneeId = me.id;
      } catch {
        // keep current assignee
      }
    }

    const updatedWp = await this.workPackages.updateWorkPackage(params.workPackageId, {
      statusId,
      assigneeId,
      percentageDone: params.percentageDone ?? (wp.percentageDone === 0 ? 10 : wp.percentageDone),
    });

    if (params.comment) {
      try {
        await this.workPackages.addWorkPackageComment(params.workPackageId, params.comment);
      } catch {
        // ignore
      }
    }

    const gitBranchName = await this.getGitBranchName(params.workPackageId);
    const commitTemplate = await this.getGitCommitTemplate({
      workPackageId: params.workPackageId,
      type: (wp._links?.type as any)?.title?.toLowerCase() === 'bug' ? 'fix' : 'feat',
    });

    return {
      workPackage: updatedWp,
      gitBranchName,
      commitTemplate,
      message: `Successfully started OP#${wp.id}. Status moved to In Progress, assigned to you, and git branch prepared: ${gitBranchName}`,
    };
  }

  public async quickCompleteTask(params: {
    workPackageId: number;
    statusId?: number;
    spentHours?: number | string;
    activityId?: number;
    comment?: string;
    spentOn?: string;
  }): Promise<{
    workPackage: OpenProjectWorkPackage;
    timeEntry?: unknown;
    message: string;
  }> {
    const wp = await this.workPackages.getWorkPackage(params.workPackageId);

    // Determine Resolved / Tested / Closed status ID
    let statusId = params.statusId;
    if (!statusId) {
      try {
        const statuses = await this.metadata.listStatuses();
        const resolvedStatus = statuses.find(
          (s: any) =>
            s.name?.toLowerCase().includes('resolved') ||
            s.name?.toLowerCase().includes('ready for test') ||
            s.name?.toLowerCase().includes('tested') ||
            s.name?.toLowerCase().includes('closed')
        );
        if (resolvedStatus) {
          statusId = (resolvedStatus as any).id;
        } else {
          statusId = 12; // Default OpenProject 'Resolved' ID
        }
      } catch {
        statusId = 12;
      }
    }

    // 1. Update Work Package status & 100% done
    const updatedWp = await this.workPackages.updateWorkPackage(params.workPackageId, {
      statusId,
      percentageDone: 100,
    });

    // 2. Add comment if provided
    if (params.comment) {
      try {
        await this.workPackages.addWorkPackageComment(params.workPackageId, params.comment);
      } catch {
        // ignore
      }
    }

    // 3. Log spent time if provided
    let timeEntry: unknown;
    if (params.spentHours) {
      const today = params.spentOn || new Date().toISOString().split('T')[0];
      const activityId = params.activityId || 3; // Default 3: Development

      try {
        timeEntry = await this.timeEntries.createTimeEntry({
          workPackageId: params.workPackageId,
          hours: params.spentHours,
          spentOn: today,
          activityId,
          comment: params.comment || `Implementation of OP#${wp.id}: ${wp.subject}`,
        });
      } catch {
        // Log warning
      }
    }

    return {
      workPackage: updatedWp,
      timeEntry,
      message: `Successfully resolved OP#${wp.id} (Status: ${(updatedWp._links?.status as any)?.title || 'Resolved'}, 100% Done)${
        params.spentHours ? ` and logged ${params.spentHours}h spent time.` : '.'
      }`,
    };
  }

  public async getDeveloperDailyStandup(params?: {
    date?: string;
    userId?: number | 'me';
    projectId?: string | number;
  }): Promise<{
    standupDate: string;
    yesterdaySummary: {
      loggedHours: number;
      completedTasks: Array<{ id: number; subject: string }>;
      commentsAdded: number;
    };
    todaySummary: {
      inProgressTasks: Array<{
        id: number;
        subject: string;
        estimatedTime?: string | null;
        percentageDone?: number;
      }>;
    };
    blockersSummary: {
      blockedTasks: Array<{
        id: number;
        subject: string;
        blockedBy: Array<{ id: number; subject?: string }>;
      }>;
    };
    markdownReport: string;
  }> {
    const todayStr = params?.date || new Date().toISOString().split('T')[0];
    const yesterday = new Date(todayStr);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // 1. Fetch yesterday's logged time
    let yesterdayLoggedHours = 0;
    try {
      const yesterdaySummary = await this.timeEntries.getDailyTimeSummary(
        yesterdayStr,
        params?.userId || 'me',
        8,
        params?.projectId
      );
      yesterdayLoggedHours = yesterdaySummary.totalLoggedHours;
    } catch {
      yesterdayLoggedHours = 0;
    }

    // 2. Fetch Open / In-Progress Tasks assigned to user
    const assignedTasks = await this.workPackages.listWorkPackagesAssignedTo(
      params?.userId === undefined || params?.userId === 'me' ? 'me' : params.userId,
      'open'
    );

    const inProgressTasks = assignedTasks.map((t) => ({
      id: t.id,
      subject: t.subject,
      estimatedTime: t.estimatedTime,
      percentageDone: t.percentageDone ?? 0,
    }));

    // 3. Find recently closed tasks for yesterday
    const completedTasks: Array<{ id: number; subject: string }> = [];
    try {
      const closedTasks = await this.workPackages.listWorkPackagesAssignedTo(
        params?.userId === undefined || params?.userId === 'me' ? 'me' : params.userId,
        'closed'
      );
      for (const t of closedTasks.slice(0, 3)) {
        completedTasks.push({ id: t.id, subject: t.subject });
      }
    } catch {
      // ignore
    }

    // 4. Check for Blockers
    const blockedTasks: Array<{
      id: number;
      subject: string;
      blockedBy: Array<{ id: number; subject?: string }>;
    }> = [];

    for (const t of inProgressTasks.slice(0, 5)) {
      try {
        const relationsRes = await this.relations.listRelations({
          filters: JSON.stringify([{ to: { operator: '=', values: [String(t.id)] } }]),
        });
        const blockingRelations = (relationsRes._embedded?.elements || []).filter(
          (r: any) => r.type === 'blocks' || r.type === 'precedes'
        );
        if (blockingRelations.length > 0) {
          blockedTasks.push({
            id: t.id,
            subject: t.subject,
            blockedBy: blockingRelations.map((r: any) => ({
              id: parseInt((r._links?.from as any)?.href?.split('/').pop() || '0', 10),
              subject: (r._links?.from as any)?.title,
            })),
          });
        }
      } catch {
        // ignore
      }
    }

    const markdownReport = `
### ☕ Daily Standup Report (${todayStr})

#### 1. Yesterday (Completed & Time Logged):
- **Effort Logged**: ${yesterdayLoggedHours}h (${yesterdayStr})
${
  completedTasks.length > 0
    ? completedTasks.map((t) => `- Completed OP#${t.id}: ${t.subject}`).join('\n')
    : '- Worked on ongoing feature developments and code reviews.'
}

#### 2. Today (In-Progress & Goals):
${
  inProgressTasks.length > 0
    ? inProgressTasks
        .slice(0, 4)
        .map(
          (t) =>
            `- OP#${t.id}: ${t.subject} (${t.percentageDone}% done, Est: ${t.estimatedTime || 'N/A'})`
        )
        .join('\n')
    : '- No active assigned tasks. Planning sprint backlog.'
}

#### 3. Blockers:
${
  blockedTasks.length > 0
    ? blockedTasks
        .map(
          (b) =>
            `- ⚠️ OP#${b.id} is blocked by ${b.blockedBy.map((o) => `OP#${o.id} (${o.subject || 'Task'})`).join(', ')}`
        )
        .join('\n')
    : '- ✅ No blockers.'
}
`.trim();

    return {
      standupDate: todayStr,
      yesterdaySummary: {
        loggedHours: yesterdayLoggedHours,
        completedTasks,
        commentsAdded: 0,
      },
      todaySummary: {
        inProgressTasks,
      },
      blockersSummary: {
        blockedTasks,
      },
      markdownReport,
    };
  }

  public async getGitBranchName(workPackageId: number, prefix?: string): Promise<string> {
    const wp = await this.workPackages.getWorkPackage(workPackageId);
    const typeName = (wp._links?.type as any)?.title?.toLowerCase() || 'feature';
    const branchPrefix = prefix || (typeName.includes('bug') ? 'fix' : 'feat');
    const slug = slugify(wp.subject || `task-${wp.id}`);
    return `${branchPrefix}/OP-${wp.id}-${slug}`;
  }

  public async getGitCommitTemplate(params: {
    workPackageId: number;
    type?: 'feat' | 'fix' | 'refactor' | 'test' | 'docs' | 'chore';
    scope?: string;
    message?: string;
  }): Promise<string> {
    const wp = await this.workPackages.getWorkPackage(params.workPackageId);
    const type =
      params.type ||
      ((wp._links?.type as any)?.title?.toLowerCase().includes('bug') ? 'fix' : 'feat');
    const scope = params.scope ? `(${params.scope})` : '';
    const message =
      params.message || (wp.subject || `Task #${wp.id}`).replace(/^[A-Z0-9_-]+:\s*/i, '').trim();

    return `${type}${scope}: ${message} (refs OP#${wp.id})

- Implements work for OpenProject OP#${wp.id}
- Reference: ${wp.subject || `Task #${wp.id}`}
`.trim();
  }

  public async getTaskDependencyGraph(workPackageId: number): Promise<{
    workPackageId: number;
    subject: string;
    mermaidDiagram: string;
    relationsCount: number;
  }> {
    const rootWp = await this.workPackages.getWorkPackage(workPackageId);
    const children = await this.workPackages.listWorkPackageChildren(workPackageId);

    // Fetch relations where this task is either 'from' or 'to'
    let fromRelations: any[] = [];
    let toRelations: any[] = [];
    try {
      const fromRes = await this.relations.listRelations({
        filters: JSON.stringify([{ from: { operator: '=', values: [String(workPackageId)] } }]),
      });
      fromRelations = fromRes._embedded?.elements || [];

      const toRes = await this.relations.listRelations({
        filters: JSON.stringify([{ to: { operator: '=', values: [String(workPackageId)] } }]),
      });
      toRelations = toRes._embedded?.elements || [];
    } catch {
      // ignore
    }

    const lines: string[] = ['flowchart TD'];
    lines.push(
      `  root["OP#${rootWp.id}: ${(rootWp.subject || 'Task').replace(/"/g, "'")}"]:::activeNode`
    );

    // Children
    for (const child of children) {
      lines.push(
        `  c${child.id}["OP#${child.id}: ${(child.subject || 'Child').replace(/"/g, "'")}"]`
      );
      lines.push(`  root -->|child| c${child.id}`);
    }

    // Outgoing relations
    for (const rel of fromRelations) {
      const targetId = parseInt((rel._links?.to as any)?.href?.split('/').pop() || '0', 10);
      const targetTitle = (rel._links?.to as any)?.title?.replace(/"/g, "'") || `Task #${targetId}`;
      lines.push(`  t${targetId}["OP#${targetId}: ${targetTitle}"]`);
      lines.push(`  root -->|${rel.type}| t${targetId}`);
    }

    // Incoming relations
    for (const rel of toRelations) {
      const sourceId = parseInt((rel._links?.from as any)?.href?.split('/').pop() || '0', 10);
      const sourceTitle =
        (rel._links?.from as any)?.title?.replace(/"/g, "'") || `Task #${sourceId}`;
      lines.push(`  s${sourceId}["OP#${sourceId}: ${sourceTitle}"]`);
      lines.push(`  s${sourceId} -->|${rel.type}| root`);
    }

    lines.push('  classDef activeNode fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff;');

    return {
      workPackageId,
      subject: rootWp.subject,
      mermaidDiagram: lines.join('\n'),
      relationsCount: children.length + fromRelations.length + toRelations.length,
    };
  }

  public async generateQaChecklist(workPackageId: number): Promise<{
    workPackageId: number;
    subject: string;
    checklistMarkdown: string;
  }> {
    const wp = await this.workPackages.getWorkPackage(workPackageId);
    const typeName = (wp._links?.type as any)?.title || 'Feature';

    const checklistMarkdown = `
### 🧪 QA & Verification Checklist for OP#${wp.id}: ${wp.subject}
**Type**: ${typeName} | **Status**: ${(wp._links?.status as any)?.title || 'In Test'}

#### 1. Pre-requisites & Environment
- [ ] Tested on target branch / environment.
- [ ] Database migrations applied cleanly without errors.
- [ ] Environment variables (.env) updated and validated.

#### 2. Functional & Acceptance Tests
- [ ] Core happy path scenario works as expected.
- [ ] Invalid inputs / negative validations return appropriate user error messages.
- [ ] Edge cases (empty states, boundary numbers, null fields) handled safely.

#### 3. Code Quality & Regression
- [ ] Unit test suite passing with >= 90% code coverage.
- [ ] ESLint & Prettier checks passed with 0 errors.
- [ ] No regression on related features or parent work packages.

#### 4. Delivery & Documentation
- [ ] Spent time logged accurately in OpenProject.
- [ ] Git commit conforms to Conventional Commits: \`refs OP#${wp.id}\`.
- [ ] Documentation / README updated if API signatures changed.
`.trim();

    return {
      workPackageId,
      subject: wp.subject,
      checklistMarkdown,
    };
  }
}
