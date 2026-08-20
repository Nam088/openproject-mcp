import { FastMCP } from 'fastmcp';
import { ServiceContainer } from '../services/index.js';

export function registerOpenProjectPrompts(server: FastMCP, services: ServiceContainer): void {
  server.addPrompt({
    name: 'task_breakdown_and_estimate',
    description:
      'Inspects an OpenProject task/bug/feature, breaks it down into actionable sub-tasks, and produces precise ISO 8601 duration estimates and testing checklists.',
    arguments: [
      {
        name: 'work_package_id',
        description: 'The OpenProject Work Package ID to analyze and break down.',
        required: true,
      },
    ],
    load: async (args) => {
      const wpId = parseInt(args.work_package_id || '0', 10);
      const wp = await services.workPackages.getWorkPackage(wpId);
      const comments = await services.workPackages.listWorkPackageActivities(wpId);

      const promptText = `
You are a Principal Software Engineer and Technical Lead.
Please analyze the following OpenProject Work Package and create a thorough technical breakdown, work estimation, and delivery plan.

### Work Package Metadata
- **ID**: OP#${wp.id}
- **Subject**: ${wp.subject}
- **Type**: ${(wp._embedded as any)?.type?.name || (wp._links?.type as any)?.title || 'Task'}
- **Current Status**: ${(wp._embedded as any)?.status?.name || (wp._links?.status as any)?.title || 'New'}
- **Estimated Time**: ${wp.estimatedTime || 'Not set'}
- **Spent Time**: ${wp.spentTime || '0h'}
- **Percentage Done**: ${wp.percentageDone ?? 0}%

### Description:
${wp.description?.raw || wp.description?.html || '(No description provided)'}

### Recent Activity / Comments (${comments.length}):
${JSON.stringify(comments.slice(0, 5), null, 2)}

---

### Instructions:
1. **Architectural & Requirement Analysis**: Summarize core technical requirements, dependencies, and potential risks.
2. **Work Breakdown Structure (WBS)**: Break down the implementation into concrete sub-tasks with estimated hours formatted in ISO 8601 duration (e.g. \`PT1H30M\`).
3. **Step-by-step Implementation Plan**: Code changes, files to touch, database migrations, and API contracts.
4. **Testing Strategy**: Unit, integration, and manual QA acceptance criteria.
5. **OpenProject Description Update Payload**: Output ready-to-use Markdown updates to append to the work package.
`;

      return promptText.trim();
    },
  });

  server.addPrompt({
    name: 'sprint_planning',
    description:
      'Analyzes project backlog, sprint goals, and resource capacity to optimize sprint work allocation.',
    arguments: [
      {
        name: 'project_id',
        description: 'Project ID or identifier.',
        required: true,
      },
      {
        name: 'version_id',
        description: 'Optional Sprint / Version ID.',
        required: false,
      },
    ],
    load: async (args) => {
      const summary = await services.projects.getSprintSummary(
        args.project_id,
        args.version_id ? parseInt(args.version_id, 10) : undefined
      );

      const promptText = `
You are an Agile Scrum Master and Lead Architect.
Review the following OpenProject Sprint metrics and produce an actionable Sprint Plan & Velocity Analysis.

### Sprint Summary
- **Sprint / Version**: ${summary.versionName || 'Current Active Backlog'}
- **Total Work Packages**: ${summary.totalTasks}
- **Open Work Packages**: ${summary.openTasks}
- **Closed Work Packages**: ${summary.closedTasks}
- **Total Estimated Hours**: ${summary.estimatedHours}h
- **Total Spent Hours**: ${summary.spentHours}h
- **Progress**: ${summary.progressPercentage}%

### Work Packages in Sprint:
${JSON.stringify(
  summary.tasks.map((t) => ({
    id: t.id,
    subject: t.subject,
    status: (t._links?.status as any)?.title,
    estimatedTime: t.estimatedTime,
    spentTime: t.spentTime,
    percentageDone: t.percentageDone,
  })),
  null,
  2
)}

---

### Instructions:
1. **Sprint Health & Burndown Assessment**: Analyze whether the sprint is on track based on estimated vs spent hours.
2. **Bottleneck & Risk Identification**: Highlight blocked, overdue, or unassigned tasks.
3. **Prioritized Execution Recommendations**: Suggest next tasks to tackle to maximize velocity and sprint goal attainment.
`;

      return promptText.trim();
    },
  });

  server.addPrompt({
    name: 'generate_sprint_report',
    description:
      'Generates an executive sprint completion report with key metrics and achievements.',
    arguments: [
      {
        name: 'project_id',
        description: 'Project ID or identifier.',
        required: true,
      },
      {
        name: 'version_id',
        description: 'Target Sprint/Version ID.',
        required: false,
      },
    ],
    load: async (args) => {
      const summary = await services.projects.getSprintSummary(
        args.project_id,
        args.version_id ? parseInt(args.version_id, 10) : undefined
      );

      return `
You are a Delivery Manager.
Generate a structured Executive Sprint Completion Report in GitHub-flavored Markdown for:

- **Sprint**: ${summary.versionName || 'Sprint Review'}
- **Completion Rate**: ${summary.progressPercentage}% (${summary.closedTasks}/${summary.totalTasks} closed)
- **Effort Logged**: ${summary.spentHours}h spent against ${summary.estimatedHours}h estimated.

Format the report with:
1. Executive Summary & Highlights
2. Completed Key Deliverables (Features & Bug Fixes)
3. Spillovers & Blockers (if any)
4. Retrospective Lessons Learned & Action Items for Next Sprint
`.trim();
    },
  });

  server.addPrompt({
    name: 'triage_work_package',
    description:
      'Triages a newly reported bug or task with root cause template, repro steps, and relationship links.',
    arguments: [
      {
        name: 'work_package_id',
        description: 'Work package ID to triage.',
        required: true,
      },
    ],
    load: async (args) => {
      const wpId = parseInt(args.work_package_id || '0', 10);
      const wp = await services.workPackages.getWorkPackage(wpId);

      return `
You are a Senior QA Engineer & Developer Triaging Lead.
Please triage the following OpenProject work package:

- **ID**: OP#${wp.id}
- **Subject**: ${wp.subject}
- **Description**:
${wp.description?.raw || '(No description)'}

Instructions:
1. Classify severity, priority, and reproducibility.
2. Format Root Cause & Solution draft.
3. Provide recommended status update (e.g. Ready to Test, In Progress) and time estimate in ISO 8601 duration format.
`.trim();
    },
  });
}
