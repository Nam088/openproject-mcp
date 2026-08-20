import { Command } from 'commander';
import pc from 'picocolors';
import { loadConfig, OpenProjectConfig } from './config.js';
import { logger } from './core/logger.js';
import { OpenProjectClient } from './core/openproject-client.js';
import { createServiceContainer } from './services/index.js';

export function createCli(
  startServer: (
    config: OpenProjectConfig,
    transportType: 'stdio' | 'sse' | 'httpStream',
    port?: number,
    endpoint?: string
  ) => Promise<void>
): Command {
  const program = new Command();

  program
    .name('openproject-mcp')
    .description('Enterprise Model Context Protocol (MCP) Server for OpenProject REST API v3')
    .version('1.0.0');

  program
    .option('--host <url>', 'OpenProject host URL (e.g. https://community.openproject.org)')
    .option('--api-key <key>', 'OpenProject API Key')
    .option('--oauth-token <token>', 'OpenProject OAuth 2.0 Bearer Token')
    .option('--default-project <id>', 'Default project ID or identifier')
    .option('--read-only', 'Run server in read-only mode')
    .option('--transport <type>', 'Transport mode: stdio, sse, or httpStream', 'stdio')
    .option('--port <number>', 'Port for sse / httpStream transport', '8081')
    .option('--endpoint <path>', 'Endpoint path for SSE transport', '/sse')
    .action(async (options) => {
      const config = loadConfig({
        host: options.host,
        apiKey: options.apiKey,
        oauthToken: options.oauthToken,
        defaultProjectId: options.defaultProject,
        readOnlyMode: options.readOnly ? true : undefined,
      });

      const transportType = (options.transport || 'stdio') as 'stdio' | 'sse' | 'httpStream';
      const port = options.port ? parseInt(options.port, 10) : 8081;
      const endpoint = options.endpoint || '/sse';

      await startServer(config, transportType, port, endpoint);
    });

  // Doctor Diagnostic command
  program
    .command('doctor')
    .description('Run comprehensive health check & diagnostics on OpenProject API connection')
    .action(async () => {
      const config = loadConfig();
      logger.raw(pc.bold(pc.cyan('\n=== OpenProject MCP Diagnostic Doctor ===\n')));
      logger.raw(`${pc.bold('Host URL:')}        ${config.host}`);
      logger.raw(
        `${pc.bold('Auth Key:')}        ${
          config.apiKey
            ? `${config.apiKey.slice(0, 4)}... (configured)`
            : config.oauthToken
              ? 'OAuth Bearer Token (configured)'
              : pc.red('Not configured')
        }`
      );
      logger.raw(
        `${pc.bold('Default Project:')} ${config.defaultProjectId || pc.yellow('None (must specify in tools)')}`
      );
      logger.raw(
        `${pc.bold('Read-Only Mode:')}  ${config.readOnlyMode ? pc.yellow('Enabled') : pc.green('Disabled')}`
      );

      const client = new OpenProjectClient(config);

      logger.raw(`\nTesting connection to ${config.host}... `, false);
      try {
        const user = await client.get<any>('/users/me');
        logger.raw(pc.green('SUCCESS'));
        logger.raw(`  • Name:     ${user.name || 'N/A'}`);
        logger.raw(`  • Login:    ${user.login || 'N/A'}`);
        logger.raw(`  • Email:    ${user.email || 'N/A'}`);
        logger.raw(`  • Admin:    ${user.admin ? pc.green('Yes') : 'No'}`);
      } catch (err: any) {
        logger.raw(pc.red('FAILED'));
        logger.raw(`  ${pc.red(err.message)}`);
      }

      if (config.defaultProjectId) {
        logger.raw(`\nTesting access to project '${config.defaultProjectId}'... `, false);
        try {
          const project = await client.get<any>(`/projects/${config.defaultProjectId}`);
          logger.raw(pc.green('SUCCESS'));
          logger.raw(`  • Name:       ${project.name}`);
          logger.raw(`  • Identifier: ${project.identifier}`);
          logger.raw(`  • Active:     ${project.active ? pc.green('Yes') : 'No'}`);
        } catch (err: any) {
          logger.raw(pc.red('FAILED'));
          logger.raw(`  ${pc.red(err.message)}`);
        }
      }

      logger.raw(pc.bold(pc.green('\n✓ Diagnostic complete.\n')));
    });

  // Tools command
  program
    .command('tools')
    .description('List all available OpenProject MCP tools')
    .action(() => {
      logger.raw(pc.bold(pc.cyan('\n=== OpenProject MCP Registered Tools (60+ Active) ===\n')));
      const dummyConfig = loadConfig();
      const client = new OpenProjectClient(dummyConfig);
      const _services = createServiceContainer(client);

      const toolList = [
        'get_work_package',
        'list_work_packages',
        'create_work_package',
        'update_work_package',
        'delete_work_package',
        'get_work_package_schema',
        'list_work_package_children',
        'list_work_package_ancestors',
        'list_comments',
        'add_comment',
        'list_work_packages_assigned_to',
        'list_work_packages_created_by',
        'list_overdue_work_packages',
        'list_work_packages_by_date',
        'list_work_packages_for_version',
        'export_work_packages',
        'create_time_entry',
        'list_time_entries',
        'get_time_entry',
        'update_time_entry',
        'delete_time_entry',
        'list_time_entry_activities',
        'get_time_entry_activity',
        'get_time_entries_schema',
        'get_project',
        'list_projects',
        'create_project',
        'update_project',
        'delete_project',
        'list_project_statuses',
        'list_available_assignees',
        'list_available_statuses',
        'list_categories',
        'list_versions',
        'list_types',
        'get_sprint_summary',
        'list_relations',
        'get_relation',
        'create_relation',
        'delete_relation',
        'list_statuses',
        'get_status',
        'list_all_types',
        'get_type',
        'list_priorities',
        'get_priority',
        'list_all_categories',
        'get_category',
        'list_users',
        'get_user',
        'create_user',
        'update_user',
        'delete_user',
        'list_memberships',
        'add_membership',
        'update_membership',
        'delete_membership',
        'list_roles',
        'list_groups',
        'get_group',
        'create_group',
        'update_group',
        'delete_group',
        'list_principals',
        'list_all_versions',
        'get_version',
        'create_version',
        'update_version',
        'delete_version',
        'get_attachment',
        'delete_attachment',
        'view_attachment_content',
        'list_queries',
        'get_query',
        'list_notifications',
        'mark_notifications_read',
        'list_watchers',
        'add_watcher',
        'remove_watcher',
        'list_budgets',
        'get_budget',
      ];

      toolList.forEach((t, i) => {
        logger.raw(`  ${pc.cyan((i + 1).toString().padStart(2, ' '))}. ${pc.bold(t)}`);
      });
      logger.raw(`\n${pc.green(`Total: ${toolList.length} tools registered.`)}\n`);
    });

  // Setup command
  program
    .command('setup')
    .description(
      'Generate client configuration snippets for Claude Desktop, Cursor, or Antigravity'
    )
    .option('--client <type>', 'Client type: claude, cursor, or antigravity', 'claude')
    .action((options) => {
      const configJson = {
        mcpServers: {
          openproject: {
            command: 'node',
            args: ['/path/to/openproject-mcp/dist/index.js'],
            env: {
              OPENPROJECT_HOST: 'https://community.openproject.org',
              OPENPROJECT_API_KEY: 'your_api_key_here',
              OPENPROJECT_DEFAULT_PROJECT_ID: '14',
            },
          },
        },
      };

      logger.raw(
        pc.bold(pc.cyan(`\n=== Setup Configuration for ${options.client.toUpperCase()} ===\n`))
      );
      logger.raw(JSON.stringify(configJson, null, 2));
      logger.raw('\n');
    });

  return program;
}
