import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { paginationSchema, projectIdSchema, workPackageIdSchema } from './common/schemas.js';
import { executeTool } from './common/tool-helper.js';

export function registerTimeEntriesTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'create_time_entry',
    description:
      'Log spent time on an OpenProject work package or project. Accepts hours as decimal number (e.g. 1.5) or ISO duration (PT1H30M).',
    parameters: z.object({
      work_package_id: workPackageIdSchema
        .optional()
        .describe('Work package ID to log time against.'),
      project_id: projectIdSchema,
      hours: z
        .union([z.number(), z.string()])
        .describe('Hours spent, e.g. 1.5, "1.5", or "PT1H30M".'),
      spent_on: z.string().describe('Date spent in YYYY-MM-DD format (e.g. "2026-06-18").'),
      activity_id: z
        .number()
        .describe(
          'Activity ID (e.g. 3: Development, 4: Testing). Call list_time_entry_activities to find valid IDs.'
        ),
      comment: z.string().optional().describe('Markdown comment explaining work performed.'),
      user_id: z
        .number()
        .optional()
        .describe('Optional user ID (admin only, defaults to authenticated user).'),
    }),
    execute: executeTool('create_time_entry', async (args) => {
      return services.timeEntries.createTimeEntry({
        workPackageId: args.work_package_id,
        projectId: args.project_id,
        hours: args.hours,
        spentOn: args.spent_on,
        activityId: args.activity_id,
        comment: args.comment,
        userId: args.user_id,
      });
    }),
  });

  server.addTool({
    name: 'list_time_entries',
    description:
      'List logged spent time entries with project, work package, user, date range, and activity filters.',
    parameters: z.object({
      work_package_id: z.number().optional().describe('Filter by work package ID.'),
      project_id: projectIdSchema,
      user_id: z.number().optional().describe('Filter by user ID.'),
      spent_on: z.string().optional().describe('Filter by exact date (YYYY-MM-DD).'),
      from_date: z.string().optional().describe('Filter from date inclusive (YYYY-MM-DD).'),
      to_date: z.string().optional().describe('Filter to date inclusive (YYYY-MM-DD).'),
      activity_id: z.number().optional().describe('Filter by activity ID.'),
      ...paginationSchema,
    }),
    execute: executeTool('list_time_entries', async (args) => {
      return services.timeEntries.listTimeEntries({
        workPackageId: args.work_package_id,
        projectId: args.project_id,
        userId: args.user_id,
        spentOn: args.spent_on,
        from: args.from_date,
        to: args.to_date,
        activityId: args.activity_id,
        pageSize: args.pageSize,
        offset: args.offset,
      });
    }),
  });

  server.addTool({
    name: 'get_time_entry',
    description: 'Retrieve details of a single logged spent time entry by ID.',
    parameters: z.object({
      id: z.number().describe('Time entry ID.'),
    }),
    execute: executeTool('get_time_entry', async (args) => {
      return services.timeEntries.getTimeEntry(args.id);
    }),
  });

  server.addTool({
    name: 'update_time_entry',
    description: 'Update logged hours, date, activity, or comment of an existing time entry.',
    parameters: z.object({
      id: z.number().describe('Time entry ID to update.'),
      hours: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Updated hours (e.g. 2 or "PT2H").'),
      spent_on: z.string().optional().describe('Updated date (YYYY-MM-DD).'),
      activity_id: z.number().optional().describe('Updated activity ID.'),
      comment: z.string().optional().describe('Updated comment body.'),
    }),
    execute: executeTool('update_time_entry', async (args) => {
      return services.timeEntries.updateTimeEntry(args.id, {
        hours: args.hours,
        spentOn: args.spent_on,
        activityId: args.activity_id,
        comment: args.comment,
      });
    }),
  });

  server.addTool({
    name: 'delete_time_entry',
    description: 'Delete a logged time entry by ID.',
    parameters: z.object({
      id: z.number().describe('Time entry ID to delete.'),
    }),
    execute: executeTool('delete_time_entry', async (args) => {
      return services.timeEntries.deleteTimeEntry(args.id);
    }),
  });

  server.addTool({
    name: 'list_time_entry_activities',
    description:
      'List available time logging activities (e.g. Development, Testing, Management) globally or for a project.',
    parameters: z.object({
      project_id: projectIdSchema,
    }),
    execute: executeTool('list_time_entry_activities', async (args) => {
      return services.timeEntries.listTimeEntryActivities(args.project_id);
    }),
  });

  server.addTool({
    name: 'get_time_entry_activity',
    description: 'Get details of a time entry activity category by ID.',
    parameters: z.object({
      id: z.number().describe('Activity ID.'),
    }),
    execute: executeTool('get_time_entry_activity', async (args) => {
      return services.timeEntries.getTimeEntryActivity(args.id);
    }),
  });

  server.addTool({
    name: 'get_time_entries_schema',
    description: 'Retrieve the validation schema and field definitions for logging time entries.',
    parameters: z.object({}),
    execute: executeTool('get_time_entries_schema', async () => {
      return services.timeEntries.getTimeEntriesSchema();
    }),
  });

  server.addTool({
    name: 'get_daily_time_summary',
    description:
      'Audits spent time logged for a specific date (or today), compares against target hours (e.g. 8h), identifies unlogged active assigned tasks, and provides intelligent logging suggestions.',
    parameters: z.object({
      date: z.string().optional().describe('Date to check in YYYY-MM-DD format (default: today).'),
      user_id: z
        .union([z.number(), z.literal('me')])
        .default('me')
        .describe('User ID or "me".'),
      target_hours: z.number().default(8).describe('Target hours for the day (default: 8).'),
      project_id: projectIdSchema,
    }),
    execute: executeTool('get_daily_time_summary', async (args) => {
      return services.timeEntries.getDailyTimeSummary(
        args.date,
        args.user_id,
        args.target_hours,
        args.project_id
      );
    }),
  });

  server.addTool({
    name: 'audit_unlogged_work',
    description:
      'Audits a date range (e.g. this week or custom range) for missing or under-logged days, detects assigned work packages with 0 logged hours, and provides automated recommendations for time logging.',
    parameters: z.object({
      from: z.string().describe('Start date inclusive in YYYY-MM-DD format.'),
      to: z.string().describe('End date inclusive in YYYY-MM-DD format.'),
      user_id: z
        .union([z.number(), z.literal('me')])
        .default('me')
        .describe('User ID or "me".'),
      daily_target_hours: z.number().default(8).describe('Daily target hours (default: 8).'),
      include_weekends: z
        .boolean()
        .default(false)
        .describe('Whether to audit weekend days (default: false).'),
      project_id: projectIdSchema,
    }),
    execute: executeTool('audit_unlogged_work', async (args) => {
      return services.timeEntries.auditUnloggedWork({
        from: args.from,
        to: args.to,
        userId: args.user_id,
        dailyTargetHours: args.daily_target_hours,
        includeWeekends: args.include_weekends,
        projectId: args.project_id,
      });
    }),
  });
}
