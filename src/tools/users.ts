import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { paginationSchema, projectIdSchema } from './common/schemas.js';
import { executeTool } from './common/tool-helper.js';

export function registerUsersTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'list_users',
    description: 'List users in the OpenProject instance with optional filtering and pagination.',
    parameters: z.object({
      filters: z.string().optional().describe('Optional JSON filter expression.'),
      ...paginationSchema,
    }),
    execute: executeTool('list_users', async (args) => {
      return services.users.listUsers(args);
    }),
  });

  server.addTool({
    name: 'get_user',
    description: 'Retrieve user details by ID or "me" for authenticated user.',
    parameters: z.object({
      id: z.union([z.number(), z.literal('me')]).describe('User ID or "me".'),
    }),
    execute: executeTool('get_user', async (args) => {
      return services.users.getUser(args.id);
    }),
  });

  server.addTool({
    name: 'create_user',
    description: 'Create a new user account (admin permissions required).',
    parameters: z.object({
      login: z.string().min(1).describe('Login username.'),
      first_name: z.string().min(1).describe('First name.'),
      last_name: z.string().min(1).describe('Last name.'),
      email: z.string().email().describe('Email address.'),
      admin: z.boolean().optional().describe('Grant administrator rights.'),
      status: z
        .enum(['active', 'invited', 'locked'])
        .optional()
        .describe('Initial account status.'),
    }),
    execute: executeTool('create_user', async (args) => {
      return services.users.createUser({
        login: args.login,
        firstName: args.first_name,
        lastName: args.last_name,
        email: args.email,
        admin: args.admin,
        status: args.status,
      });
    }),
  });

  server.addTool({
    name: 'update_user',
    description: 'Update user account information.',
    parameters: z.object({
      id: z.number().describe('User ID to update.'),
      first_name: z.string().optional().describe('Updated first name.'),
      last_name: z.string().optional().describe('Updated last name.'),
      email: z.string().email().optional().describe('Updated email address.'),
      admin: z.boolean().optional().describe('Set administrator status.'),
    }),
    execute: executeTool('update_user', async (args) => {
      return services.users.updateUser(args.id, {
        firstName: args.first_name,
        lastName: args.last_name,
        email: args.email,
        admin: args.admin,
      });
    }),
  });

  server.addTool({
    name: 'delete_user',
    description: 'Delete a user account permanently (admin permissions required).',
    parameters: z.object({
      id: z.number().describe('User ID to delete.'),
    }),
    execute: executeTool('delete_user', async (args) => {
      return services.users.deleteUser(args.id);
    }),
  });

  server.addTool({
    name: 'list_memberships',
    description:
      'List project memberships (assigned users, roles) across projects or within a project.',
    parameters: z.object({
      project_id: projectIdSchema,
      user_id: z.number().optional().describe('Filter by user/principal ID.'),
      ...paginationSchema,
    }),
    execute: executeTool('list_memberships', async (args) => {
      return services.users.listMemberships({
        projectId: args.project_id,
        userId: args.user_id,
        pageSize: args.pageSize,
        offset: args.offset,
      });
    }),
  });

  server.addTool({
    name: 'add_membership',
    description: 'Assign a user or group to a project with one or more roles.',
    parameters: z.object({
      project_id: z.union([z.string(), z.number()]).describe('Target project ID or identifier.'),
      principal_id: z.number().describe('User ID or Group ID to assign.'),
      role_ids: z.array(z.number()).min(1).describe('Array of Role IDs to grant.'),
    }),
    execute: executeTool('add_membership', async (args) => {
      return services.users.addMembership({
        projectId: args.project_id,
        principalId: args.principal_id,
        roleIds: args.role_ids,
      });
    }),
  });

  server.addTool({
    name: 'update_membership',
    description: 'Update the roles assigned to an existing project membership.',
    parameters: z.object({
      id: z.number().describe('Membership ID.'),
      role_ids: z.array(z.number()).min(1).describe('Updated list of Role IDs.'),
    }),
    execute: executeTool('update_membership', async (args) => {
      return services.users.updateMembership(args.id, { roleIds: args.role_ids });
    }),
  });

  server.addTool({
    name: 'delete_membership',
    description: 'Remove a user or group membership from a project.',
    parameters: z.object({
      id: z.number().describe('Membership ID to remove.'),
    }),
    execute: executeTool('delete_membership', async (args) => {
      return services.users.deleteMembership(args.id);
    }),
  });

  server.addTool({
    name: 'list_roles',
    description: 'List all permission roles defined in the OpenProject instance.',
    parameters: z.object({}),
    execute: executeTool('list_roles', async () => {
      return services.users.listRoles();
    }),
  });

  server.addTool({
    name: 'list_groups',
    description: 'List user groups defined in OpenProject.',
    parameters: z.object({}),
    execute: executeTool('list_groups', async () => {
      return services.users.listGroups();
    }),
  });

  server.addTool({
    name: 'get_group',
    description: 'Get details of a user group by ID.',
    parameters: z.object({
      id: z.number().describe('Group ID.'),
    }),
    execute: executeTool('get_group', async (args) => {
      return services.users.getGroup(args.id);
    }),
  });

  server.addTool({
    name: 'create_group',
    description: 'Create a new user group.',
    parameters: z.object({
      name: z.string().min(1).describe('Name of the new user group.'),
    }),
    execute: executeTool('create_group', async (args) => {
      return services.users.createGroup({ name: args.name });
    }),
  });

  server.addTool({
    name: 'update_group',
    description: 'Update the name of a user group.',
    parameters: z.object({
      id: z.number().describe('Group ID.'),
      name: z.string().min(1).describe('Updated group name.'),
    }),
    execute: executeTool('update_group', async (args) => {
      return services.users.updateGroup(args.id, { name: args.name });
    }),
  });

  server.addTool({
    name: 'delete_group',
    description: 'Delete a user group.',
    parameters: z.object({
      id: z.number().describe('Group ID to delete.'),
    }),
    execute: executeTool('delete_group', async (args) => {
      return services.users.deleteGroup(args.id);
    }),
  });

  server.addTool({
    name: 'list_principals',
    description: 'List all principals (users and groups) in the system.',
    parameters: z.object({
      ...paginationSchema,
    }),
    execute: executeTool('list_principals', async (args) => {
      return services.users.listPrincipals(args);
    }),
  });
}
