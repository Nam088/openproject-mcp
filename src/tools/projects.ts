import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { paginationSchema, projectIdSchema } from './common/schemas.js';
import { executeTool } from './common/tool-helper.js';

export function registerProjectsTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'get_project',
    description: 'Retrieve details of an OpenProject project by ID or identifier.',
    parameters: z.object({
      id: z
        .union([z.string(), z.number()])
        .describe('Project ID or identifier (e.g. 14 or "demo-project").'),
    }),
    execute: executeTool('get_project', async (args) => {
      return services.projects.getProject(args.id);
    }),
  });

  server.addTool({
    name: 'list_projects',
    description: 'List OpenProject projects with optional filtering, sorting, and pagination.',
    parameters: z.object({
      filters: z.string().optional().describe('Optional JSON filter expression.'),
      sortBy: z.string().optional().describe('Sort property and direction, e.g. "name:asc".'),
      ...paginationSchema,
    }),
    execute: executeTool('list_projects', async (args) => {
      return services.projects.listProjects(args);
    }),
  });

  server.addTool({
    name: 'create_project',
    description: 'Create a new project in OpenProject.',
    parameters: z.object({
      name: z.string().min(1).describe('The name of the project.'),
      identifier: z
        .string()
        .optional()
        .describe('Unique URL identifier (lowercase alphanumeric and hyphens).'),
      description: z.string().optional().describe('Project description in Markdown.'),
      public: z.boolean().optional().describe('Whether the project is publicly visible.'),
      parent_id: z.number().optional().describe('Parent project ID for sub-projects.'),
    }),
    execute: executeTool('create_project', async (args) => {
      return services.projects.createProject({
        name: args.name,
        identifier: args.identifier,
        description: args.description,
        public: args.public,
        parentId: args.parent_id,
      });
    }),
  });

  server.addTool({
    name: 'update_project',
    description: 'Update project properties (name, description, active status, visibility).',
    parameters: z.object({
      id: z.union([z.string(), z.number()]).describe('Project ID or identifier.'),
      name: z.string().optional().describe('Updated project name.'),
      description: z.string().optional().describe('Updated description in Markdown.'),
      public: z.boolean().optional().describe('Updated visibility.'),
      active: z.boolean().optional().describe('Whether project is active or archived.'),
    }),
    execute: executeTool('update_project', async (args) => {
      return services.projects.updateProject(args.id, {
        name: args.name,
        description: args.description,
        public: args.public,
        active: args.active,
      });
    }),
  });

  server.addTool({
    name: 'delete_project',
    description: 'Delete a project by ID or identifier.',
    parameters: z.object({
      id: z.union([z.string(), z.number()]).describe('Project ID or identifier to delete.'),
    }),
    execute: executeTool('delete_project', async (args) => {
      return services.projects.deleteProject(args.id);
    }),
  });

  server.addTool({
    name: 'list_project_statuses',
    description: 'List available workflow statuses configured for a project.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_project_statuses', async (args) => {
      return services.projects.listProjectStatuses(args.project_id);
    }),
  });

  server.addTool({
    name: 'list_available_assignees',
    description: 'List users eligible to be assigned work packages within a project.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_available_assignees', async (args) => {
      return services.projects.listAvailableAssignees(args.project_id);
    }),
  });

  server.addTool({
    name: 'list_available_statuses',
    description: 'List all available workflow statuses for a project.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_available_statuses', async (args) => {
      return services.projects.listAvailableStatuses(args.project_id);
    }),
  });

  server.addTool({
    name: 'list_categories',
    description: 'List work package categories in a project.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_categories', async (args) => {
      return services.projects.listProjectCategories(args.project_id);
    }),
  });

  server.addTool({
    name: 'list_versions',
    description: 'List sprint versions and milestone releases in a project.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_versions', async (args) => {
      return services.projects.listProjectVersions(args.project_id);
    }),
  });

  server.addTool({
    name: 'list_types',
    description: 'List work package types enabled for a project.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_types', async (args) => {
      return services.projects.listProjectTypes(args.project_id);
    }),
  });

  server.addTool({
    name: 'get_sprint_summary',
    description:
      'Calculates an aggregated Sprint progress summary: total tasks, closed vs open count, estimated hours, logged spent hours, and percentage progress.',
    parameters: z.object({
      project_id: projectIdSchema,
      version_id: z.number().optional().describe('Optional Sprint/Version ID to filter by.'),
    }),
    execute: executeTool('get_sprint_summary', async (args) => {
      return services.projects.getSprintSummary(args.project_id, args.version_id);
    }),
  });
}
