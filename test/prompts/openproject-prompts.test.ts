import { FastMCP } from 'fastmcp';
import { describe, expect, it, vi } from 'vitest';
import { OpenProjectClient } from '../../src/core/openproject-client.js';
import { registerOpenProjectPrompts } from '../../src/prompts/index.js';
import { createServiceContainer } from '../../src/services/index.js';

describe('OpenProject AI Prompts Suite', () => {
  it('registers and executes all 4 prompt templates', async () => {
    const client = new OpenProjectClient({
      host: 'https://community.openproject.org',
      apiKey: 'test-key',
      defaultProjectId: '14',
      readOnlyMode: false,
    });

    const services = createServiceContainer(client);
    const server = new FastMCP({ name: 'test-server', version: '1.0.0' });

    const promptLoaders: Record<string, Function> = {};
    vi.spyOn(server, 'addPrompt').mockImplementation((promptDef: any) => {
      promptLoaders[promptDef.name] = promptDef.load;
    });

    registerOpenProjectPrompts(server, services);

    vi.spyOn(services.workPackages, 'getWorkPackage').mockResolvedValue({
      id: 10,
      subject: 'Feature Auth',
      description: { format: 'markdown', raw: 'Implement login' },
    } as any);

    vi.spyOn(services.workPackages, 'listWorkPackageActivities').mockResolvedValue([]);

    vi.spyOn(services.projects, 'getSprintSummary').mockResolvedValue({
      versionName: 'Sprint 24',
      totalTasks: 5,
      closedTasks: 3,
      openTasks: 2,
      estimatedHours: 20,
      spentHours: 15,
      progressPercentage: 60,
      tasks: [],
    });

    const prompt1 = await promptLoaders['task_breakdown_and_estimate']({ work_package_id: '10' });
    expect(prompt1).toContain('Feature Auth');
    expect(prompt1).toContain('Work Breakdown Structure');

    const prompt2 = await promptLoaders['sprint_planning']({ project_id: '14', version_id: '1' });
    expect(prompt2).toContain('Sprint 24');
    expect(prompt2).toContain('Velocity Analysis');

    const prompt3 = await promptLoaders['generate_sprint_report']({
      project_id: '14',
      version_id: '1',
    });
    expect(prompt3).toContain('Executive Sprint Completion Report');

    const prompt4 = await promptLoaders['triage_work_package']({ work_package_id: '10' });
    expect(prompt4).toContain('Root Cause & Solution');
  });
});
