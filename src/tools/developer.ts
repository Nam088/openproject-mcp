import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { projectIdSchema, workPackageIdSchema } from './common/schemas.js';
import { executeTool } from './common/tool-helper.js';

export function registerDeveloperTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'quick_start_task',
    description:
      'Developer shortcut to start working on an OpenProject work package in 1 step: moves status to "In Progress", assigns to you, sets progress, and generates git branch name.',
    parameters: z.object({
      work_package_id: workPackageIdSchema.describe('Work package ID to start work on.'),
      status_id: z
        .number()
        .optional()
        .describe('Custom In-Progress status ID (auto-detected if omitted).'),
      assign_to_me: z
        .boolean()
        .default(true)
        .describe('Assign this work package to yourself (default: true).'),
      percentage_done: z
        .number()
        .optional()
        .describe('Initial progress percentage (default: 10%).'),
      comment: z.string().optional().describe('Optional comment to record starting work.'),
    }),
    execute: executeTool('quick_start_task', async (args) => {
      return services.developer.quickStartTask({
        workPackageId: args.work_package_id,
        statusId: args.status_id,
        assignToMe: args.assign_to_me,
        percentageDone: args.percentage_done,
        comment: args.comment,
      });
    }),
  });

  server.addTool({
    name: 'quick_complete_task',
    description:
      'Developer shortcut to complete an OpenProject task in 1 step: moves status to "Resolved / Ready for QA", sets 100% done, logs spent hours, and writes resolution comment.',
    parameters: z.object({
      work_package_id: workPackageIdSchema.describe('Work package ID to resolve/complete.'),
      status_id: z
        .number()
        .optional()
        .describe('Custom Resolved status ID (auto-detected if omitted).'),
      spent_hours: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Hours spent to log immediately (e.g. 2, 1.5, or "PT1H30M").'),
      activity_id: z.number().default(3).describe('Time activity ID (default: 3 for Development).'),
      comment: z.string().optional().describe('Resolution summary comment to post.'),
      spent_on: z.string().optional().describe('Date spent in YYYY-MM-DD (default: today).'),
    }),
    execute: executeTool('quick_complete_task', async (args) => {
      return services.developer.quickCompleteTask({
        workPackageId: args.work_package_id,
        statusId: args.status_id,
        spentHours: args.spent_hours,
        activityId: args.activity_id,
        comment: args.comment,
        spentOn: args.spent_on,
      });
    }),
  });

  server.addTool({
    name: 'get_developer_daily_standup',
    description:
      'Generates a complete Agile Daily Standup report for developers (Yesterday completed tasks & logged hours, Today in-progress tasks, and Blockers).',
    parameters: z.object({
      date: z.string().optional().describe('Standup date in YYYY-MM-DD format (default: today).'),
      user_id: z
        .union([z.number(), z.literal('me')])
        .default('me')
        .describe('User ID or "me".'),
      project_id: projectIdSchema,
    }),
    execute: executeTool('get_developer_daily_standup', async (args) => {
      return services.developer.getDeveloperDailyStandup({
        date: args.date,
        userId: args.user_id,
        projectId: args.project_id,
      });
    }),
  });

  server.addTool({
    name: 'get_git_branch_name',
    description:
      'Generates a standardized, clean git branch name for an OpenProject work package (e.g. "feat/OP-1234-support-oauth-pkce").',
    parameters: z.object({
      work_package_id: workPackageIdSchema.describe('Work package ID.'),
      prefix: z
        .string()
        .optional()
        .describe('Custom branch prefix (e.g. "feature", "bugfix", "chore").'),
    }),
    execute: executeTool('get_git_branch_name', async (args) => {
      const branchName = await services.developer.getGitBranchName(
        args.work_package_id,
        args.prefix
      );
      return {
        workPackageId: args.work_package_id,
        branchName,
        gitCheckoutCommand: `git checkout -b ${branchName}`,
      };
    }),
  });

  server.addTool({
    name: 'get_git_commit_template',
    description:
      'Generates a Conventional Commit message template linking to the OpenProject work package (e.g. "feat(auth): support PKCE [refs OP#1234]").',
    parameters: z.object({
      work_package_id: workPackageIdSchema.describe('Work package ID.'),
      type: z
        .enum(['feat', 'fix', 'refactor', 'test', 'docs', 'chore'])
        .optional()
        .describe('Conventional commit type.'),
      scope: z.string().optional().describe('Commit scope (e.g. "auth", "api", "ui").'),
      message: z.string().optional().describe('Custom commit message summary.'),
    }),
    execute: executeTool('get_git_commit_template', async (args) => {
      const commitMessage = await services.developer.getGitCommitTemplate({
        workPackageId: args.work_package_id,
        type: args.type,
        scope: args.scope,
        message: args.message,
      });
      return {
        workPackageId: args.work_package_id,
        commitMessage,
      };
    }),
  });

  server.addTool({
    name: 'get_task_dependency_graph',
    description:
      'Generates a visual Mermaid flowchart of all parent-child hierarchy and blocking/preceding relationships for a work package.',
    parameters: z.object({
      work_package_id: workPackageIdSchema.describe('Work package ID to diagram.'),
    }),
    execute: executeTool('get_task_dependency_graph', async (args) => {
      return services.developer.getTaskDependencyGraph(args.work_package_id);
    }),
  });

  server.addTool({
    name: 'generate_qa_checklist',
    description:
      'Generates an exhaustive QA and PR verification checklist in Markdown for a work package before merging or deploying.',
    parameters: z.object({
      work_package_id: workPackageIdSchema.describe('Work package ID.'),
    }),
    execute: executeTool('generate_qa_checklist', async (args) => {
      return services.developer.generateQaChecklist(args.work_package_id);
    }),
  });
}
