import { IOpenProjectClient } from '../core/openproject-client.js';
import { AttachmentsService } from './attachments.service.js';
import {
  IAttachmentsService,
  IDeveloperService,
  IMetadataService,
  IProjectsService,
  IQueriesService,
  IRelationsService,
  ITimeEntriesService,
  IUsersService,
  IVersionsService,
  IWorkPackagesService,
} from './contracts/index.js';
import { DeveloperService } from './developer.service.js';
import { MetadataService } from './metadata.service.js';
import { ProjectsService } from './projects.service.js';
import { QueriesService } from './queries.service.js';
import { RelationsService } from './relations.service.js';
import { TimeEntriesService } from './time-entries.service.js';
import { UsersService } from './users.service.js';
import { VersionsService } from './versions.service.js';
import { WorkPackagesService } from './work-packages.service.js';

export * from './attachments.service.js';
export * from './contracts/index.js';
export * from './developer.service.js';
export * from './metadata.service.js';
export * from './projects.service.js';
export * from './queries.service.js';
export * from './relations.service.js';
export * from './time-entries.service.js';
export * from './users.service.js';
export * from './versions.service.js';
export * from './work-packages.service.js';

export interface ServiceContainer {
  workPackages: IWorkPackagesService;
  timeEntries: ITimeEntriesService;
  projects: IProjectsService;
  relations: IRelationsService;
  metadata: IMetadataService;
  users: IUsersService;
  versions: IVersionsService;
  attachments: IAttachmentsService;
  queries: IQueriesService;
  developer: IDeveloperService;
}

export function createServiceContainer(client: IOpenProjectClient): ServiceContainer {
  const workPackages = new WorkPackagesService(client);
  const timeEntries = new TimeEntriesService(client);
  const projects = new ProjectsService(client);
  const relations = new RelationsService(client);
  const metadata = new MetadataService(client);
  const users = new UsersService(client);
  const versions = new VersionsService(client);
  const attachments = new AttachmentsService(client);
  const queries = new QueriesService(client);

  const developer = new DeveloperService(
    client,
    workPackages,
    timeEntries,
    projects,
    relations,
    metadata,
    users
  );

  return {
    workPackages,
    timeEntries,
    projects,
    relations,
    metadata,
    users,
    versions,
    attachments,
    queries,
    developer,
  };
}
