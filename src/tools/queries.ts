import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { paginationSchema, projectIdSchema, workPackageIdSchema } from './common/schemas.js';
import { executeTool } from './common/tool-helper.js';

export function registerQueriesTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'list_queries',
    description: 'List saved project / global queries (views, filters, custom boards).',
    parameters: z.object({
      ...paginationSchema,
    }),
    execute: executeTool('list_queries', async (args) => {
      return services.queries.listQueries(args);
    }),
  });

  server.addTool({
    name: 'get_query',
    description: 'Get details and filter definitions of a saved query by ID.',
    parameters: z.object({
      id: z.number().describe('Query ID.'),
    }),
    execute: executeTool('get_query', async (args) => {
      return services.queries.getQuery(args.id);
    }),
  });

  server.addTool({
    name: 'list_notifications',
    description: 'List in-app notifications for the authenticated user.',
    parameters: z.object({
      ...paginationSchema,
    }),
    execute: executeTool('list_notifications', async (args) => {
      return services.queries.listNotifications(args);
    }),
  });

  server.addTool({
    name: 'mark_notifications_read',
    description: 'Mark one or more notifications as read in OpenProject.',
    parameters: z.object({
      notification_ids: z
        .array(z.number())
        .min(1)
        .describe('List of notification IDs to mark as read.'),
    }),
    execute: executeTool('mark_notifications_read', async (args) => {
      return services.queries.markNotificationsRead(args.notification_ids);
    }),
  });

  server.addTool({
    name: 'list_watchers',
    description: 'List users watching a work package.',
    parameters: z.object({
      work_package_id: workPackageIdSchema,
    }),
    execute: executeTool('list_watchers', async (args) => {
      return services.queries.listWatchers(args.work_package_id);
    }),
  });

  server.addTool({
    name: 'add_watcher',
    description: 'Add a user as a watcher to a work package.',
    parameters: z.object({
      work_package_id: workPackageIdSchema,
      user_id: z.number().describe('User ID to add as watcher.'),
    }),
    execute: executeTool('add_watcher', async (args) => {
      return services.queries.addWatcher(args.work_package_id, args.user_id);
    }),
  });

  server.addTool({
    name: 'remove_watcher',
    description: 'Remove a user from watching a work package.',
    parameters: z.object({
      work_package_id: workPackageIdSchema,
      user_id: z.number().describe('User ID to remove from watchers.'),
    }),
    execute: executeTool('remove_watcher', async (args) => {
      return services.queries.removeWatcher(args.work_package_id, args.user_id);
    }),
  });

  server.addTool({
    name: 'list_budgets',
    description: 'List project budgets configured in OpenProject.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_budgets', async (args) => {
      return services.queries.listBudgets(args.project_id);
    }),
  });

  server.addTool({
    name: 'get_budget',
    description: 'Get details of a budget by ID.',
    parameters: z.object({
      id: z.number().describe('Budget ID.'),
    }),
    execute: executeTool('get_budget', async (args) => {
      return services.queries.getBudget(args.id);
    }),
  });
}
