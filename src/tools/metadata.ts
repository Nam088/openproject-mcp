import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { projectIdSchema } from './common/schemas.js';
import { executeTool } from './common/tool-helper.js';

export function registerMetadataTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'list_statuses',
    description: 'List all global workflow statuses defined in the OpenProject instance.',
    parameters: z.object({}),
    execute: executeTool('list_statuses', async () => {
      return services.metadata.listStatuses();
    }),
  });

  server.addTool({
    name: 'get_status',
    description: 'Get details of a specific workflow status by ID.',
    parameters: z.object({
      id: z.number().describe('Status ID.'),
    }),
    execute: executeTool('get_status', async (args) => {
      return services.metadata.getStatus(args.id);
    }),
  });

  server.addTool({
    name: 'list_all_types',
    description:
      'List all global work package types (e.g. Task, Bug, Feature, Milestone, User Story).',
    parameters: z.object({}),
    execute: executeTool('list_all_types', async () => {
      return services.metadata.listTypes();
    }),
  });

  server.addTool({
    name: 'get_type',
    description: 'Get details of a work package type by ID.',
    parameters: z.object({
      id: z.number().describe('Type ID.'),
    }),
    execute: executeTool('get_type', async (args) => {
      return services.metadata.getType(args.id);
    }),
  });

  server.addTool({
    name: 'list_priorities',
    description:
      'List all available work package priority levels (e.g. Low, Normal, High, Immediate).',
    parameters: z.object({}),
    execute: executeTool('list_priorities', async () => {
      return services.metadata.listPriorities();
    }),
  });

  server.addTool({
    name: 'get_priority',
    description: 'Get details of a priority level by ID.',
    parameters: z.object({
      id: z.number().describe('Priority ID.'),
    }),
    execute: executeTool('get_priority', async (args) => {
      return services.metadata.getPriority(args.id);
    }),
  });

  server.addTool({
    name: 'list_all_categories',
    description: 'List categories globally or scoped to a project.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_all_categories', async (args) => {
      return services.metadata.listCategories(args.project_id);
    }),
  });

  server.addTool({
    name: 'get_category',
    description: 'Get details of a category by ID.',
    parameters: z.object({
      id: z.number().describe('Category ID.'),
    }),
    execute: executeTool('get_category', async (args) => {
      return services.metadata.getCategory(args.id);
    }),
  });
}
