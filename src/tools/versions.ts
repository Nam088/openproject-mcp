import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { projectIdSchema } from './common/schemas.js';
import { executeTool } from './common/tool-helper.js';

export function registerVersionsTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'list_all_versions',
    description: 'List sprint versions and milestone releases globally or for a project.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_all_versions', async (args) => {
      return services.versions.listVersions(args.project_id);
    }),
  });

  server.addTool({
    name: 'get_version',
    description: 'Retrieve details of a sprint or version milestone by ID.',
    parameters: z.object({
      id: z.number().describe('Version ID.'),
    }),
    execute: executeTool('get_version', async (args) => {
      return services.versions.getVersion(args.id);
    }),
  });

  server.addTool({
    name: 'create_version',
    description: 'Create a new sprint version / release milestone in a project.',
    parameters: z.object({
      name: z.string().min(1).describe('Version name (e.g. "Sprint 24" or "Release v2.0").'),
      project_id: projectIdSchema,
      description: z
        .string()
        .optional()
        .describe('Version description or release goals in Markdown.'),
      start_date: z.string().optional().describe('Sprint start date (YYYY-MM-DD).'),
      end_date: z.string().optional().describe('Sprint target completion date (YYYY-MM-DD).'),
      status: z.enum(['open', 'locked', 'closed']).optional().describe('Initial status.'),
    }),
    execute: executeTool('create_version', async (args) => {
      return services.versions.createVersion(args.name, args.project_id, {
        description: args.description,
        startDate: args.start_date,
        endDate: args.end_date,
        status: args.status,
      });
    }),
  });

  server.addTool({
    name: 'update_version',
    description: 'Update sprint version details (name, dates, status, description).',
    parameters: z.object({
      id: z.number().describe('Version ID to update.'),
      name: z.string().optional().describe('Updated name.'),
      description: z.string().optional().describe('Updated description.'),
      start_date: z.string().optional().describe('Updated start date (YYYY-MM-DD).'),
      end_date: z.string().optional().describe('Updated target date (YYYY-MM-DD).'),
      status: z.enum(['open', 'locked', 'closed']).optional().describe('Updated status.'),
    }),
    execute: executeTool('update_version', async (args) => {
      return services.versions.updateVersion(args.id, {
        name: args.name,
        description: args.description,
        startDate: args.start_date,
        endDate: args.end_date,
        status: args.status,
      });
    }),
  });

  server.addTool({
    name: 'delete_version',
    description: 'Delete a sprint version / milestone.',
    parameters: z.object({
      id: z.number().describe('Version ID to delete.'),
    }),
    execute: executeTool('delete_version', async (args) => {
      return services.versions.deleteVersion(args.id);
    }),
  });
}
