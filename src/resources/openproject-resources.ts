import { FastMCP } from 'fastmcp';
import { ServiceContainer } from '../services/index.js';

export function registerOpenProjectResources(server: FastMCP, services: ServiceContainer): void {
  server.addResourceTemplate({
    uriTemplate: 'openproject://projects/{project_id}',
    name: 'OpenProject Project Context',
    description: 'Real-time project metadata, status, description, assignees, and enabled types.',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'project_id',
        description: 'Project ID or identifier.',
        required: true,
      },
    ],
    load: async (params) => {
      const project = await services.projects.getProject(params.project_id);
      return {
        text: JSON.stringify(project, null, 2),
      };
    },
  });

  server.addResourceTemplate({
    uriTemplate: 'openproject://work_packages/{work_package_id}',
    name: 'OpenProject Work Package Context',
    description:
      'Real-time work package details, lockVersion, estimated/spent time, and description.',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'work_package_id',
        description: 'Work package ID.',
        required: true,
      },
    ],
    load: async (params) => {
      const wpId = parseInt(params.work_package_id, 10);
      const wp = await services.workPackages.getWorkPackage(wpId);
      return {
        text: JSON.stringify(wp, null, 2),
      };
    },
  });

  server.addResourceTemplate({
    uriTemplate: 'openproject://time_entries/{time_entry_id}',
    name: 'OpenProject Time Entry Context',
    description: 'Detailed logged spent time entry with hours, date, user, and comment.',
    mimeType: 'application/json',
    arguments: [
      {
        name: 'time_entry_id',
        description: 'Time entry ID.',
        required: true,
      },
    ],
    load: async (params) => {
      const entryId = parseInt(params.time_entry_id, 10);
      const entry = await services.timeEntries.getTimeEntry(entryId);
      return {
        text: JSON.stringify(entry, null, 2),
      };
    },
  });
}
