import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { paginationSchema, projectIdSchema, workPackageIdSchema } from './common/schemas.js';
import { executeTool } from './common/tool-helper.js';

export function registerWorkPackagesTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'get_work_package',
    description:
      'Retrieve details of an OpenProject work package (task, bug, feature, user story) by ID.',
    parameters: z.object({
      id: workPackageIdSchema,
      compact: z
        .boolean()
        .optional()
        .describe(
          'If true, returns a clean, compact payload with key fields (subject, status, type, priority, assignee, dates, markdown description) and strips heavy html markup.'
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          'Optional projection array of field names to return (e.g. ["id", "subject", "status", "lockVersion", "assignee"]).'
        ),
    }),
    execute: executeTool('get_work_package', async (args) => {
      return services.workPackages.getWorkPackage(args.id, {
        compact: args.compact,
        fields: args.fields,
      });
    }),
  });

  server.addTool({
    name: 'list_work_packages',
    description:
      'List work packages with optional filtering, sorting, pagination, and hierarchy settings.',
    parameters: z.object({
      filters: z
        .string()
        .optional()
        .describe(
          'JSON filter string or array, e.g. [{"project":{"operator":"=","values":["14"]}}]'
        ),
      sortBy: z.string().optional().describe('Sort expression, e.g. [["id","asc"]] or "id:asc"'),
      groupBy: z.string().optional().describe('Group by property, e.g. "status"'),
      showHierarchies: z
        .boolean()
        .optional()
        .describe('Whether to display work package parent/child hierarchies.'),
      compact: z
        .boolean()
        .optional()
        .describe('If true, returns compact elements stripping heavy HTML description markup.'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Optional projection array of field names to return for each work package.'),
      ...paginationSchema,
    }),
    execute: executeTool('list_work_packages', async (args) => {
      return services.workPackages.listWorkPackages(args);
    }),
  });

  server.addTool({
    name: 'create_work_package',
    description: 'Create a new work package (task/bug/feature) in an OpenProject project.',
    parameters: z.object({
      subject: z.string().min(1).describe('The subject or title of the work package.'),
      project_id: projectIdSchema,
      description: z.string().optional().describe('Description in Markdown format.'),
      type_id: z
        .number()
        .optional()
        .describe('Work package type ID (e.g. 1 for Task, 2 for Bug, 3 for Feature).'),
      status_id: z.number().optional().describe('Status ID (e.g. 1 for New, 7 for In Progress).'),
      priority_id: z
        .number()
        .optional()
        .describe('Priority ID (e.g. 8 for Normal, 9 for High, 10 for Immediate).'),
      assignee_id: z.number().optional().describe('User ID assigned to this work package.'),
      responsible_id: z.number().optional().describe('User ID responsible for this work package.'),
      start_date: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      due_date: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
      estimated_time: z
        .string()
        .optional()
        .describe('Estimated duration in ISO 8601 format (e.g. "PT2H", "PT30M").'),
      percentage_done: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Percentage of work completed (0 - 100).'),
      parent_id: z.number().optional().describe('Parent work package ID for sub-tasks.'),
    }),
    execute: executeTool('create_work_package', async (args) => {
      return services.workPackages.createWorkPackage(args.subject, args.project_id, {
        description: args.description,
        typeId: args.type_id,
        statusId: args.status_id,
        priorityId: args.priority_id,
        assigneeId: args.assignee_id,
        responsibleId: args.responsible_id,
        startDate: args.start_date,
        dueDate: args.due_date,
        estimatedTime: args.estimated_time,
        percentageDone: args.percentage_done,
        parentId: args.parent_id,
      });
    }),
  });

  server.addTool({
    name: 'update_work_package',
    description:
      'Update a work package. Automatically resolves optimistic lockVersion for conflict-free updates.',
    parameters: z.object({
      id: workPackageIdSchema,
      subject: z.string().optional().describe('Updated subject or title.'),
      description: z.string().optional().describe('Updated description in Markdown format.'),
      status_id: z
        .number()
        .optional()
        .describe(
          'Updated status ID (e.g. 7: In progress, 8: In-Review, 22: Ready to Test, 12: Done).'
        ),
      type_id: z.number().optional().describe('Updated type ID.'),
      priority_id: z.number().optional().describe('Updated priority ID.'),
      assignee_id: z
        .number()
        .nullable()
        .optional()
        .describe('Assigned user ID, or null to unassign.'),
      responsible_id: z
        .number()
        .nullable()
        .optional()
        .describe('Responsible user ID, or null to unassign.'),
      start_date: z
        .string()
        .nullable()
        .optional()
        .describe('Start date (YYYY-MM-DD), or null to clear.'),
      due_date: z
        .string()
        .nullable()
        .optional()
        .describe('Due date (YYYY-MM-DD), or null to clear.'),
      estimated_time: z
        .string()
        .nullable()
        .optional()
        .describe('Estimated time in ISO 8601 duration (e.g. "PT1H30M") or null.'),
      remaining_time: z
        .string()
        .nullable()
        .optional()
        .describe('Remaining time in ISO 8601 duration (e.g. "PT30M") or null.'),
      percentage_done: z
        .number()
        .min(0)
        .max(100)
        .nullable()
        .optional()
        .describe('Percentage done (0 - 100).'),
      parent_id: z
        .number()
        .nullable()
        .optional()
        .describe('Parent work package ID, or null to remove parent.'),
      lock_version: z
        .number()
        .optional()
        .describe('Optional lockVersion (if omitted, server automatically fetches latest).'),
    }),
    execute: executeTool('update_work_package', async (args) => {
      return services.workPackages.updateWorkPackage(args.id, {
        subject: args.subject,
        description: args.description,
        statusId: args.status_id,
        typeId: args.type_id,
        priorityId: args.priority_id,
        assigneeId: args.assignee_id === null ? undefined : args.assignee_id,
        responsibleId: args.responsible_id === null ? undefined : args.responsible_id,
        startDate: args.start_date,
        dueDate: args.due_date,
        estimatedTime: args.estimated_time,
        remainingTime: args.remaining_time,
        percentageDone: args.percentage_done,
        parentId: args.parent_id,
        lockVersion: args.lock_version,
      });
    }),
  });

  server.addTool({
    name: 'delete_work_package',
    description: 'Delete a work package by ID.',
    parameters: z.object({
      id: workPackageIdSchema,
    }),
    execute: executeTool('delete_work_package', async (args) => {
      return services.workPackages.deleteWorkPackage(args.id);
    }),
  });

  server.addTool({
    name: 'get_work_package_schema',
    description:
      'Retrieve the schema / field definition for a work package type or specific project schema.',
    parameters: z.object({
      schema_id_or_type: z
        .string()
        .optional()
        .describe('Schema ID (e.g. "1-1") or type ID. Default: "1-1".'),
    }),
    execute: executeTool('get_work_package_schema', async (args) => {
      return services.workPackages.getWorkPackageSchema(args.schema_id_or_type);
    }),
  });

  server.addTool({
    name: 'list_work_package_children',
    description: 'List all direct child sub-tasks for a given work package.',
    parameters: z.object({
      id: workPackageIdSchema,
    }),
    execute: executeTool('list_work_package_children', async (args) => {
      return services.workPackages.listWorkPackageChildren(args.id);
    }),
  });

  server.addTool({
    name: 'list_work_package_ancestors',
    description: 'List all ancestor parent work packages up to the root.',
    parameters: z.object({
      id: workPackageIdSchema,
    }),
    execute: executeTool('list_work_package_ancestors', async (args) => {
      return services.workPackages.listWorkPackageAncestors(args.id);
    }),
  });

  server.addTool({
    name: 'list_comments',
    description: 'List activity stream, history, and comments for a work package.',
    parameters: z.object({
      id: workPackageIdSchema,
    }),
    execute: executeTool('list_comments', async (args) => {
      return services.workPackages.listWorkPackageActivities(args.id);
    }),
  });

  server.addTool({
    name: 'add_comment',
    description: 'Add a new comment/activity note to an existing work package.',
    parameters: z.object({
      id: workPackageIdSchema,
      comment: z.string().min(1).describe('Comment body in Markdown format.'),
      lock_version: z
        .number()
        .optional()
        .describe('Optional lockVersion. If omitted, automatically resolved.'),
    }),
    execute: executeTool('add_comment', async (args) => {
      return services.workPackages.addWorkPackageComment(args.id, args.comment, args.lock_version);
    }),
  });

  server.addTool({
    name: 'update_comment',
    description: 'Update the text of an existing comment/activity note by its activity ID.',
    parameters: z.object({
      activity_id: z.number().describe('Activity ID of the comment to update.'),
      comment: z.string().min(1).describe('New comment body in Markdown format.'),
    }),
    execute: executeTool('update_comment', async (args) => {
      return services.workPackages.updateWorkPackageComment(args.activity_id, args.comment);
    }),
  });

  server.addTool({
    name: 'list_work_packages_assigned_to',
    description:
      'List work packages assigned to a specific user or currently authenticated user ("me").',
    parameters: z.object({
      user_id: z
        .union([z.number(), z.literal('me')])
        .default('me')
        .describe('User ID or "me".'),
      state: z
        .enum(['open', 'closed', 'all'])
        .default('open')
        .describe('State filter (open, closed, or all).'),
    }),
    execute: executeTool('list_work_packages_assigned_to', async (args) => {
      return services.workPackages.listWorkPackagesAssignedTo(args.user_id, args.state);
    }),
  });

  server.addTool({
    name: 'list_work_packages_created_by',
    description: 'List work packages created by/authored by a specific user or "me".',
    parameters: z.object({
      user_id: z
        .union([z.number(), z.literal('me')])
        .default('me')
        .describe('User ID or "me".'),
      state: z
        .enum(['open', 'closed', 'all'])
        .default('open')
        .describe('State filter (open, closed, or all).'),
    }),
    execute: executeTool('list_work_packages_created_by', async (args) => {
      return services.workPackages.listWorkPackagesCreatedBy(args.user_id, args.state);
    }),
  });

  server.addTool({
    name: 'list_overdue_work_packages',
    description: 'List all overdue open work packages where dueDate < today.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_overdue_work_packages', async (args) => {
      return services.workPackages.listOverdueWorkPackages(args.project_id);
    }),
  });

  server.addTool({
    name: 'list_work_packages_by_date',
    description: 'List work packages due on a specific calendar date (YYYY-MM-DD).',
    parameters: z.object({
      date: z.string().describe('Target due date in YYYY-MM-DD format.'),
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_work_packages_by_date', async (args) => {
      return services.workPackages.listWorkPackagesByDate(args.date, args.project_id);
    }),
  });

  server.addTool({
    name: 'list_work_packages_for_version',
    description: 'List work packages assigned to a specific sprint or milestone version.',
    parameters: z.object({
      version_id: z.number().describe('Target sprint/version ID.'),
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_work_packages_for_version', async (args) => {
      return services.workPackages.listWorkPackagesForVersion(args.version_id, args.project_id);
    }),
  });

  server.addTool({
    name: 'export_work_packages',
    description: 'Export work packages as JSON, CSV, or PDF format.',
    parameters: z.object({
      format: z.enum(['json', 'csv', 'pdf']).default('json').describe('Export format.'),
      filters: z.string().optional().describe('Optional JSON filter expression.'),
    }),
    execute: executeTool('export_work_packages', async (args) => {
      return services.workPackages.exportWorkPackages(
        args.format,
        args.filters ? { filters: args.filters } : undefined
      );
    }),
  });
}
