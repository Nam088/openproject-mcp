import {
  HalCollection,
  OpenProjectCategory,
  OpenProjectGroup,
  OpenProjectNotification,
  OpenProjectPriority,
  OpenProjectProject,
  OpenProjectQuery,
  OpenProjectRelation,
  OpenProjectStatus,
  OpenProjectTimeEntry,
  OpenProjectType,
  OpenProjectUser,
  OpenProjectVersion,
  OpenProjectWorkPackage,
} from '../../types/openproject.types.js';

export interface IWorkPackagesService {
  getWorkPackage<T = any>(
    id: number,
    options?: { compact?: boolean; fields?: string[] }
  ): Promise<T>;
  listWorkPackages<T = any>(params?: {
    filters?: string | Array<Record<string, unknown>>;
    sortBy?: string | string[];
    pageSize?: number;
    offset?: number;
    groupBy?: string;
    showHierarchies?: boolean;
    compact?: boolean;
    fields?: string[];
  }): Promise<T>;
  createWorkPackage(
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
  ): Promise<OpenProjectWorkPackage>;
  updateWorkPackage(
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
  ): Promise<OpenProjectWorkPackage>;
  deleteWorkPackage(id: number): Promise<unknown>;
  getWorkPackageSchema(schemaIdOrType?: string): Promise<unknown>;
  listWorkPackageChildren(id: number): Promise<OpenProjectWorkPackage[]>;
  listWorkPackageAncestors(id: number): Promise<OpenProjectWorkPackage[]>;
  listWorkPackageActivities(id: number): Promise<unknown[]>;
  addWorkPackageComment(id: number, comment: string, lockVersion?: number): Promise<unknown>;
  updateWorkPackageComment(activityId: number, comment: string): Promise<unknown>;
  listWorkPackagesAssignedTo(
    userId: number | 'me',
    state?: 'open' | 'closed' | 'all'
  ): Promise<OpenProjectWorkPackage[]>;
  listWorkPackagesCreatedBy(
    userId: number | 'me',
    state?: 'open' | 'closed' | 'all'
  ): Promise<OpenProjectWorkPackage[]>;
  listOverdueWorkPackages(projectId?: string | number): Promise<OpenProjectWorkPackage[]>;
  listWorkPackagesByDate(
    date: string,
    projectId?: string | number
  ): Promise<OpenProjectWorkPackage[]>;
  listWorkPackagesForVersion(
    versionId: number,
    projectId?: string | number
  ): Promise<OpenProjectWorkPackage[]>;
  exportWorkPackages(
    format: 'json' | 'csv' | 'pdf',
    params?: Record<string, unknown>
  ): Promise<unknown>;
}

export interface ITimeEntriesService {
  createTimeEntry(data: {
    workPackageId?: number;
    projectId?: string | number;
    hours: number | string;
    spentOn: string;
    activityId: number;
    comment?: string;
    userId?: number;
  }): Promise<OpenProjectTimeEntry>;
  listTimeEntries(params?: {
    workPackageId?: number;
    projectId?: string | number;
    userId?: number;
    spentOn?: string;
    from?: string;
    to?: string;
    activityId?: number;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectTimeEntry>>;
  getTimeEntry(id: number): Promise<OpenProjectTimeEntry>;
  updateTimeEntry(
    id: number,
    data: {
      hours?: number | string;
      spentOn?: string;
      activityId?: number;
      comment?: string;
    }
  ): Promise<OpenProjectTimeEntry>;
  deleteTimeEntry(id: number): Promise<unknown>;
  listTimeEntryActivities(projectId?: string | number): Promise<unknown[]>;
  getTimeEntryActivity(id: number): Promise<unknown>;
  getTimeEntriesSchema(): Promise<unknown>;
  getDailyTimeSummary(
    date?: string,
    userId?: number | 'me',
    targetHours?: number,
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
  }>;
  auditUnloggedWork(params: {
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
  }>;
}

export interface IProjectsService {
  getProject(idOrIdentifier: string | number): Promise<OpenProjectProject>;
  listProjects(params?: {
    filters?: string | Array<Record<string, unknown>>;
    sortBy?: string;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectProject>>;
  createProject(data: {
    name: string;
    identifier?: string;
    description?: string;
    public?: boolean;
    parentId?: number;
  }): Promise<OpenProjectProject>;
  updateProject(
    idOrIdentifier: string | number,
    data: {
      name?: string;
      description?: string;
      public?: boolean;
      active?: boolean;
    }
  ): Promise<OpenProjectProject>;
  deleteProject(idOrIdentifier: string | number): Promise<unknown>;
  listProjectStatuses(idOrIdentifier?: string | number): Promise<OpenProjectStatus[]>;
  listAvailableAssignees(idOrIdentifier?: string | number): Promise<OpenProjectUser[]>;
  listAvailableStatuses(idOrIdentifier?: string | number): Promise<OpenProjectStatus[]>;
  listProjectCategories(idOrIdentifier?: string | number): Promise<OpenProjectCategory[]>;
  listProjectVersions(idOrIdentifier?: string | number): Promise<OpenProjectVersion[]>;
  listProjectTypes(idOrIdentifier?: string | number): Promise<OpenProjectType[]>;
  getSprintSummary(
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
  }>;
}

export interface IRelationsService {
  listRelations(params?: {
    filters?: string | Array<Record<string, unknown>>;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectRelation>>;
  getRelation(id: number): Promise<OpenProjectRelation>;
  createRelation(data: {
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
  }): Promise<OpenProjectRelation>;
  deleteRelation(id: number): Promise<unknown>;
}

export interface IMetadataService {
  listStatuses(): Promise<OpenProjectStatus[]>;
  getStatus(id: number): Promise<OpenProjectStatus>;
  listTypes(): Promise<OpenProjectType[]>;
  getType(id: number): Promise<OpenProjectType>;
  listPriorities(): Promise<OpenProjectPriority[]>;
  getPriority(id: number): Promise<OpenProjectPriority>;
  listCategories(projectId?: string | number): Promise<OpenProjectCategory[]>;
  getCategory(id: number): Promise<OpenProjectCategory>;
}

export interface IUsersService {
  listUsers(params?: {
    filters?: string | Array<Record<string, unknown>>;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectUser>>;
  getUser(idOrMe: number | 'me'): Promise<OpenProjectUser>;
  createUser(data: {
    login: string;
    firstName: string;
    lastName: string;
    email: string;
    admin?: boolean;
    status?: 'active' | 'invited' | 'locked';
  }): Promise<OpenProjectUser>;
  updateUser(
    id: number,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      admin?: boolean;
    }
  ): Promise<OpenProjectUser>;
  deleteUser(id: number): Promise<unknown>;
  listMemberships(params?: {
    projectId?: string | number;
    userId?: number;
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<unknown>>;
  addMembership(data: {
    projectId: string | number;
    principalId: number;
    roleIds: number[];
  }): Promise<unknown>;
  updateMembership(id: number, data: { roleIds: number[] }): Promise<unknown>;
  deleteMembership(id: number): Promise<unknown>;
  listRoles(): Promise<unknown[]>;
  listGroups(): Promise<OpenProjectGroup[]>;
  getGroup(id: number): Promise<OpenProjectGroup>;
  createGroup(data: { name: string }): Promise<OpenProjectGroup>;
  updateGroup(id: number, data: { name: string }): Promise<OpenProjectGroup>;
  deleteGroup(id: number): Promise<unknown>;
  listPrincipals(params?: { pageSize?: number; offset?: number }): Promise<unknown[]>;
}

export interface IVersionsService {
  listVersions(projectId?: string | number): Promise<OpenProjectVersion[]>;
  getVersion(id: number): Promise<OpenProjectVersion>;
  createVersion(
    name: string,
    projectId?: string | number,
    data?: {
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: 'open' | 'locked' | 'closed';
    }
  ): Promise<OpenProjectVersion>;
  updateVersion(
    id: number,
    data: {
      name?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      status?: 'open' | 'locked' | 'closed';
    }
  ): Promise<OpenProjectVersion>;
  deleteVersion(id: number): Promise<unknown>;
}

export interface IAttachmentsService {
  listAttachments(workPackageId: number): Promise<unknown[]>;
  getAttachment(id: number): Promise<unknown>;
  deleteAttachment(id: number): Promise<unknown>;
  viewAttachmentContent(
    id: number
  ): Promise<{ data: Buffer; contentType: string; filename?: string }>;
  uploadAttachment(data: {
    workPackageId: number;
    filePath?: string;
    contentBase64?: string;
    filename: string;
    description?: string;
    contentType?: string;
  }): Promise<unknown>;
}

export interface IQueriesService {
  listQueries(params?: {
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectQuery>>;
  getQuery(id: number): Promise<OpenProjectQuery>;
  listNotifications(params?: {
    pageSize?: number;
    offset?: number;
  }): Promise<HalCollection<OpenProjectNotification>>;
  markNotificationsRead(notificationIds: number[]): Promise<unknown>;
  listWatchers(workPackageId: number): Promise<OpenProjectUser[]>;
  addWatcher(workPackageId: number, userId: number): Promise<unknown>;
  removeWatcher(workPackageId: number, userId: number): Promise<unknown>;
  listBudgets(projectId?: string | number): Promise<unknown[]>;
  getBudget(id: number): Promise<unknown>;
}

export interface IDeveloperService {
  quickStartTask(params: {
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
  }>;
  quickCompleteTask(params: {
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
  }>;
  getDeveloperDailyStandup(params?: {
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
  }>;
  getGitBranchName(workPackageId: number, prefix?: string): Promise<string>;
  getGitCommitTemplate(params: {
    workPackageId: number;
    type?: 'feat' | 'fix' | 'refactor' | 'test' | 'docs' | 'chore';
    scope?: string;
    message?: string;
  }): Promise<string>;
  getTaskDependencyGraph(workPackageId: number): Promise<{
    workPackageId: number;
    subject: string;
    mermaidDiagram: string;
    relationsCount: number;
  }>;
  generateQaChecklist(workPackageId: number): Promise<{
    workPackageId: number;
    subject: string;
    checklistMarkdown: string;
  }>;
}
