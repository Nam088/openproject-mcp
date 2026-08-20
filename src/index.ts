import { FastMCP } from 'fastmcp';
import { createCli } from './cli.js';
import { loadConfig, OpenProjectConfig } from './config.js';
import { logger } from './core/logger.js';
import { OpenProjectClient } from './core/openproject-client.js';
import { registerOpenProjectPrompts } from './prompts/index.js';
import { registerOpenProjectResources } from './resources/index.js';
import { createServiceContainer } from './services/index.js';
import { registerAttachmentsTools } from './tools/attachments.js';
import { registerDeveloperTools } from './tools/developer.js';
import { registerMetadataTools } from './tools/metadata.js';
import { registerProjectsTools } from './tools/projects.js';
import { registerQueriesTools } from './tools/queries.js';
import { registerRelationsTools } from './tools/relations.js';
import { registerTimeEntriesTools } from './tools/time-entries.js';
import { registerUsersTools } from './tools/users.js';
import { registerVersionsTools } from './tools/versions.js';
import { registerWorkPackagesTools } from './tools/work-packages.js';

export function createServer(config?: OpenProjectConfig): FastMCP {
  const activeConfig = config || loadConfig();
  const client = new OpenProjectClient(activeConfig);
  const services = createServiceContainer(client);

  const server = new FastMCP({
    name: 'openproject-mcp',
    version: '1.0.0',
  });

  // Register all 10 tool suites (90 tools)
  registerWorkPackagesTools(server, services);
  registerTimeEntriesTools(server, services);
  registerProjectsTools(server, services);
  registerRelationsTools(server, services);
  registerMetadataTools(server, services);
  registerUsersTools(server, services);
  registerVersionsTools(server, services);
  registerAttachmentsTools(server, services);
  registerQueriesTools(server, services);
  registerDeveloperTools(server, services);

  // Register AI Prompts & Resources
  registerOpenProjectPrompts(server, services);
  registerOpenProjectResources(server, services);

  return server;
}

export type OpenProjectTransportMode = 'stdio' | 'sse' | 'httpStream';

export async function startServer(
  config: OpenProjectConfig,
  transportType: OpenProjectTransportMode = 'stdio',
  port = 8081,
  endpoint = '/sse'
): Promise<void> {
  const server = createServer(config);
  const cleanEndpoint = (endpoint.startsWith('/') ? endpoint : `/${endpoint}`) as `/${string}`;

  if (transportType === 'sse' || transportType === 'httpStream') {
    logger.info(`Starting OpenProject MCP Server on port ${port}${cleanEndpoint}...`);
    await server.start({
      transportType: 'httpStream',
      httpStream: {
        port,
        endpoint: cleanEndpoint,
      },
    });
  } else {
    logger.debug('Starting OpenProject MCP Server with stdio transport...');
    await server.start({
      transportType: 'stdio',
    });
  }
}

async function main(): Promise<void> {
  const cli = createCli(startServer);
  await cli.parseAsync(process.argv);
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  main().catch((error) => {
    logger.error(`Fatal server error: ${error.message}`);
    process.exit(1);
  });
}
