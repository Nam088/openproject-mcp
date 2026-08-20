import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { paginationSchema } from './common/schemas.js';
import { executeTool } from './common/tool-helper.js';

export function registerRelationsTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'list_relations',
    description:
      'List work package relationships (blocks, blocked by, relates to, duplicates, etc.).',
    parameters: z.object({
      filters: z.string().optional().describe('Optional JSON filter expression.'),
      ...paginationSchema,
    }),
    execute: executeTool('list_relations', async (args) => {
      return services.relations.listRelations(args);
    }),
  });

  server.addTool({
    name: 'get_relation',
    description: 'Retrieve details of a work package relationship by ID.',
    parameters: z.object({
      id: z.number().describe('Relation ID.'),
    }),
    execute: executeTool('get_relation', async (args) => {
      return services.relations.getRelation(args.id);
    }),
  });

  server.addTool({
    name: 'create_relation',
    description:
      'Create a relationship link between two work packages (e.g. relates, blocks, precedes, duplicates).',
    parameters: z.object({
      from_id: z.number().describe('Source work package ID.'),
      to_id: z.number().describe('Target work package ID.'),
      type: z
        .enum([
          'relates',
          'duplicates',
          'duplicated',
          'blocks',
          'blocked',
          'precedes',
          'follows',
          'includes',
          'partof',
          'requires',
          'required',
        ])
        .default('relates')
        .describe('Type of relationship link.'),
      description: z.string().optional().describe('Description or note for the relationship.'),
      delay: z.number().optional().describe('Delay in days (for precedes/follows).'),
    }),
    execute: executeTool('create_relation', async (args) => {
      return services.relations.createRelation({
        fromId: args.from_id,
        toId: args.to_id,
        type: args.type,
        description: args.description,
        delay: args.delay,
      });
    }),
  });

  server.addTool({
    name: 'delete_relation',
    description: 'Remove a relationship between work packages.',
    parameters: z.object({
      id: z.number().describe('Relation ID to delete.'),
    }),
    execute: executeTool('delete_relation', async (args) => {
      return services.relations.deleteRelation(args.id);
    }),
  });
}
