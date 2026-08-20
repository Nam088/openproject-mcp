import { FastMCP } from 'fastmcp';
import { describe, it, vi } from 'vitest';
import { OpenProjectClient } from '../../src/core/openproject-client.js';
import { createServiceContainer } from '../../src/services/index.js';
import { registerAttachmentsTools } from '../../src/tools/attachments.js';
import { registerDeveloperTools } from '../../src/tools/developer.js';
import { registerMetadataTools } from '../../src/tools/metadata.js';
import { registerProjectsTools } from '../../src/tools/projects.js';
import { registerQueriesTools } from '../../src/tools/queries.js';
import { registerRelationsTools } from '../../src/tools/relations.js';
import { registerTimeEntriesTools } from '../../src/tools/time-entries.js';
import { registerUsersTools } from '../../src/tools/users.js';
import { registerVersionsTools } from '../../src/tools/versions.js';
import { registerWorkPackagesTools } from '../../src/tools/work-packages.js';

describe('All OpenProject Tools Execution Suite', () => {
  it('registers and executes all 60+ tools properly', async () => {
    const client = new OpenProjectClient({
      host: 'https://community.openproject.org',
      apiKey: 'test-key',
      defaultProjectId: '14',
      readOnlyMode: false,
    });

    const services = createServiceContainer(client);
    const server = new FastMCP({ name: 'test-server', version: '1.0.0' });

    const toolExecutors: Record<string, Function> = {};
    vi.spyOn(server, 'addTool').mockImplementation((toolDef: any) => {
      toolExecutors[toolDef.name] = toolDef.execute;
    });

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

    // Mock client responses
    vi.spyOn(client, 'get').mockResolvedValue({
      id: 1,
      name: 'test',
      subject: 'test wp',
      lockVersion: 1,
      _embedded: { elements: [{ id: 1 }] },
    } as any);
    vi.spyOn(client, 'post').mockResolvedValue({ id: 1 } as any);
    vi.spyOn(client, 'patch').mockResolvedValue({ id: 1 } as any);
    vi.spyOn(client, 'patchWorkPackageWithLock').mockResolvedValue({ id: 1 } as any);
    vi.spyOn(client, 'delete').mockResolvedValue({ success: true } as any);
    vi.spyOn(client, 'getRaw').mockResolvedValue({
      data: Buffer.from('data'),
      contentType: 'text/plain',
      filename: 'test.txt',
    } as any);

    // 1. Work Packages
    await toolExecutors['get_work_package']({ id: 1 });
    await toolExecutors['list_work_packages']({});
    await toolExecutors['create_work_package']({ subject: 'New', project_id: '14' });
    await toolExecutors['update_work_package']({ id: 1, subject: 'Updated' });
    await toolExecutors['delete_work_package']({ id: 1 });
    await toolExecutors['get_work_package_schema']({});
    await toolExecutors['list_work_package_children']({ id: 1 });
    await toolExecutors['list_work_package_ancestors']({ id: 1 });
    await toolExecutors['list_comments']({ id: 1 });
    await toolExecutors['add_comment']({ id: 1, comment: 'Nice' });
    await toolExecutors['list_work_packages_assigned_to']({ user_id: 'me', state: 'open' });
    await toolExecutors['list_work_packages_created_by']({ user_id: 'me', state: 'open' });
    await toolExecutors['list_overdue_work_packages']({ project_id: '14' });
    await toolExecutors['list_work_packages_by_date']({ date: '2026-06-18' });
    await toolExecutors['list_work_packages_for_version']({ version_id: 1 });
    await toolExecutors['export_work_packages']({ format: 'json' });

    // 2. Time Entries
    await toolExecutors['create_time_entry']({
      work_package_id: 1,
      hours: 1.5,
      spent_on: '2026-06-18',
      activity_id: 3,
    });
    await toolExecutors['list_time_entries']({});
    await toolExecutors['get_time_entry']({ id: 1 });
    await toolExecutors['update_time_entry']({ id: 1, hours: 2 });
    await toolExecutors['delete_time_entry']({ id: 1 });
    await toolExecutors['list_time_entry_activities']({});
    await toolExecutors['get_time_entry_activity']({ id: 3 });
    await toolExecutors['get_time_entries_schema']({});
    await toolExecutors['get_daily_time_summary']({ date: '2026-06-18' });
    await toolExecutors['audit_unlogged_work']({ from: '2026-06-01', to: '2026-06-05' });

    // 3. Projects
    await toolExecutors['get_project']({ id: '14' });
    await toolExecutors['list_projects']({});
    await toolExecutors['create_project']({ name: 'Project' });
    await toolExecutors['update_project']({ id: '14', name: 'Updated' });
    await toolExecutors['delete_project']({ id: '14' });
    await toolExecutors['list_project_statuses']({ project_id: '14' });
    await toolExecutors['list_available_assignees']({ project_id: '14' });
    await toolExecutors['list_available_statuses']({ project_id: '14' });
    await toolExecutors['list_categories']({ project_id: '14' });
    await toolExecutors['list_versions']({ project_id: '14' });
    await toolExecutors['list_types']({ project_id: '14' });
    await toolExecutors['get_sprint_summary']({ project_id: '14' });

    // 4. Relations
    await toolExecutors['list_relations']({});
    await toolExecutors['get_relation']({ id: 1 });
    await toolExecutors['create_relation']({ from_id: 1, to_id: 2, type: 'relates' });
    await toolExecutors['delete_relation']({ id: 1 });

    // 5. Metadata
    await toolExecutors['list_statuses']({});
    await toolExecutors['get_status']({ id: 1 });
    await toolExecutors['list_all_types']({});
    await toolExecutors['get_type']({ id: 1 });
    await toolExecutors['list_priorities']({});
    await toolExecutors['get_priority']({ id: 1 });
    await toolExecutors['list_all_categories']({});
    await toolExecutors['get_category']({ id: 1 });

    // 6. Users
    await toolExecutors['list_users']({});
    await toolExecutors['get_user']({ id: 'me' });
    await toolExecutors['create_user']({
      login: 'u',
      first_name: 'F',
      last_name: 'L',
      email: 'f@l.com',
    });
    await toolExecutors['update_user']({ id: 1, first_name: 'F2' });
    await toolExecutors['delete_user']({ id: 1 });
    await toolExecutors['list_memberships']({});
    await toolExecutors['add_membership']({ project_id: '14', principal_id: 1, role_ids: [1] });
    await toolExecutors['update_membership']({ id: 1, role_ids: [2] });
    await toolExecutors['delete_membership']({ id: 1 });
    await toolExecutors['list_roles']({});
    await toolExecutors['list_groups']({});
    await toolExecutors['get_group']({ id: 1 });
    await toolExecutors['create_group']({ name: 'G' });
    await toolExecutors['update_group']({ id: 1, name: 'G2' });
    await toolExecutors['delete_group']({ id: 1 });
    await toolExecutors['list_principals']({});

    // 7. Versions
    await toolExecutors['list_all_versions']({});
    await toolExecutors['get_version']({ id: 1 });
    await toolExecutors['create_version']({ name: 'V', project_id: '14' });
    await toolExecutors['update_version']({ id: 1, name: 'V2' });
    await toolExecutors['delete_version']({ id: 1 });

    // 8. Attachments
    await toolExecutors['get_attachment']({ id: 1 });
    await toolExecutors['delete_attachment']({ id: 1 });
    await toolExecutors['view_attachment_content']({ id: 1 });

    // 9. Queries
    await toolExecutors['list_queries']({});
    await toolExecutors['get_query']({ id: 1 });
    await toolExecutors['list_notifications']({});
    await toolExecutors['mark_notifications_read']({ notification_ids: [1] });
    await toolExecutors['list_watchers']({ work_package_id: 1 });
    await toolExecutors['add_watcher']({ work_package_id: 1, user_id: 2 });
    await toolExecutors['remove_watcher']({ work_package_id: 1, user_id: 2 });
    await toolExecutors['list_budgets']({});
    await toolExecutors['get_budget']({ id: 1 });

    // 10. Developer Productivity Suite
    await toolExecutors['quick_start_task']({ work_package_id: 1 });
    await toolExecutors['quick_complete_task']({ work_package_id: 1, spent_hours: 2 });
    await toolExecutors['get_developer_daily_standup']({});
    await toolExecutors['get_git_branch_name']({ work_package_id: 1 });
    await toolExecutors['get_git_commit_template']({ work_package_id: 1 });
    await toolExecutors['get_task_dependency_graph']({ work_package_id: 1 });
    await toolExecutors['generate_qa_checklist']({ work_package_id: 1 });
  });
});
