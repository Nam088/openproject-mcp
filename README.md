# OpenProject MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![FastMCP](https://img.shields.io/badge/FastMCP-4.x-brightgreen.svg)](https://github.com/punkpeye/fastmcp)
[![OpenProject API](https://img.shields.io/badge/OpenProject%20API-v3-blue.svg)](https://www.openproject.org/docs/api/)
[![Test Coverage](https://img.shields.io/badge/Coverage-91.1%25-success.svg)](https://vitest.dev/)
[![Tools Count](https://img.shields.io/badge/Tools-90%20Registered-blueviolet.svg)](#-registered-tools-catalog)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An enterprise-grade, high-performance [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for **OpenProject REST API v3**, built with **Node.js/TypeScript** and **FastMCP**.

This server provides **100% full coverage of OpenProject REST API v3** with **90 Type-Safe MCP Tools across 10 Suites**, **4 AI Workflow Prompts**, **3 Dynamic URI Resource Templates**, built-in **Optimistic Locking (`lockVersion`) auto-resolution**, **ISO 8601 Duration Parsing**, **LRU In-Memory Caching**, **Dual Transports (stdio & httpStream)**, and **Strict Clean Architecture**.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [Prerequisites](#-prerequisites)
- [Installation & Quick Start](#-installation--quick-start)
- [Configuration Reference](#-configuration-reference)
- [Client Integration Guides](#-client-integration-guides)
  - [Claude Desktop](#1-claude-desktop)
  - [Cursor IDE](#2-cursor-ide)
  - [Google Antigravity & Agentic Tools](#3-google-antigravity--agentic-tools)
- [CLI Diagnostics & Subcommands](#-cli-diagnostics--subcommands)
- [AI Prompts & Resource Templates](#-ai-prompts--resource-templates)
- [Registered Tools Catalog](#-registered-tools-catalog)
  - [Developer Productivity Suite](#10-developer-productivity-suite-7-tools)
  - [Time Tracking & Auditing Suite](#2-time-tracking--auditing-suite-10-tools)
  - [Work Packages Suite](#1-work-packages-suite-16-tools)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [License](#-license)

---

## 🚀 Key Features

- **90 Type-Safe MCP Tools across 10 Domain Suites**: Developer Productivity Suite, Work Packages, Time Tracking & Spent Hours, Projects, Relations, Metadata (Statuses, Types, Priorities, Categories), Users & Memberships, Versions & Sprints, Attachments, and Saved Queries / Notifications.
- **Developer 1-Click Shortcuts**:
  - `quick_start_task`: Moves task to _In Progress_, assigns to you, sets initial progress %, and prepares a standardized Git branch.
  - `quick_complete_task`: Moves task to _Resolved/Ready for QA_, sets 100% done, logs spent hours, and posts resolution comment in 1 atomic operation.
  - `get_developer_daily_standup`: Auto-generates your Agile Daily Standup report (Yesterday effort & completed tasks, Today in-progress tasks, Blockers).
  - `get_task_dependency_graph`: Renders interactive **Mermaid flowchart** of parents, sub-tasks, and blocking relations.
  - `generate_qa_checklist`: Auto-generates exhaustive QA & PR acceptance checklists.
- **Automatic `lockVersion` Resolution**: Never suffer from `409 Conflict` optimistic locking errors when updating tasks; the server automatically fetches and merges the latest `lockVersion` before patching.
- **Comprehensive Time Tracking & ISO Duration Auditing**: Native support for ISO 8601 Durations (`PT1H`, `PT30M`), decimal hours (`1.5` $\rightarrow$ `PT1H30M`), daily target auditing (`get_daily_time_summary`), and weekly unlogged work detection (`audit_unlogged_work`).
- **4 AI Engineering Prompts**:
  - `task_breakdown_and_estimate`: WBS breakdown with ISO durations and QA acceptance checklists.
  - `sprint_planning`: Backlog capacity planning, velocity analysis, and task prioritization.
  - `generate_sprint_report`: Executive delivery and sprint completion reporting.
  - `triage_work_package`: Root cause analysis, reproduction steps, and priority triage.
- **3 Dynamic URI Resource Templates**: Direct read access via `openproject://projects/{id}`, `openproject://work_packages/{id}`, and `openproject://time_entries/{id}`.
- **Security & Access Control**:
  - **Read-Only Mode (`OPENPROJECT_READ_ONLY_MODE=true`)**: Safely blocks all mutating operations (`POST`, `PATCH`, `DELETE`).
  - **Project Allowlist (`OPENPROJECT_PROJECT_ALLOWLIST`)**: Restricts LLM access to authorized projects only.
- **Dual MCP Transports**: Supports both standard `stdio` transport and `httpStream` (SSE/HTTP Stream with custom port binding).

---

## 🏛️ Architecture Overview

```
src/
├── cli.ts                              # CLI (doctor, tools, setup)
├── config.ts                           # Environment configuration (.env, normalizer)
├── index.ts                            # Composition Root & FastMCP startup
├── core/
│   ├── cache/cache-service.ts          # LRU Memory Cache (60s TTL)
│   ├── errors/openproject-error.ts     # Domain Error Hierarchy
│   ├── http/http-transport.ts          # Axios + Basic/Bearer Auth + Retry
│   ├── security/access-guard.ts        # Read-only guard & Whitelist check
│   ├── openproject-client.ts           # Central API client & Auto lockVersion
│   └── logger.ts                       # Stderr-only structured logger
├── services/
│   ├── contracts/index.ts              # Service Interfaces
│   ├── index.ts                        # Central Dependency Injection Container
│   ├── developer.service.ts            # Developer Shortcuts, Standup, Git & QA Generator
│   ├── work-packages.service.ts        # Work Packages CRUD, Children, Ancestors, Comments
│   ├── time-entries.service.ts         # Time Tracking CRUD, ISO formatting, Auditing
│   ├── projects.service.ts             # Projects CRUD, Statuses, Types, Sprint summary
│   ├── relations.service.ts            # Relations (blocks, relates, parent/child)
│   ├── metadata.service.ts             # Statuses, Types, Priorities, Categories
│   ├── users.service.ts                # Users, Groups, Roles, Memberships
│   ├── versions.service.ts             # Sprints, Roadmaps, Versions
│   ├── attachments.service.ts          # Attachments download, upload, delete
│   └── queries.service.ts              # Saved Queries & Notifications
├── tools/                              # 10 Declarative MCP Tool Adapter Suites (90 tools)
├── prompts/                            # 4 AI Prompt Templates
└── resources/                          # 3 Dynamic URI Resource Templates
```

---

## 📦 Prerequisites

- **Node.js**: `v20.0.0` or higher (`v22` / `v24` recommended).
- **OpenProject Instance**: Self-hosted or OpenProject Cloud.
- **Authentication**: API Key (`My Account` $\rightarrow$ `Access Token` $\rightarrow$ `API`) or OAuth 2.0 Bearer Token.

---

## 🛠️ Installation & Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url> openproject-mcp
cd openproject-mcp
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Run Diagnostic Doctor

```bash
export OPENPROJECT_HOST="https://community.openproject.org"
export OPENPROJECT_API_KEY="your_api_key"
export OPENPROJECT_DEFAULT_PROJECT_ID="14"

node dist/index.js doctor
```

---

## ⚙️ Configuration Reference

| Variable                         | CLI Flag            | Default                             | Description                                                           |
| -------------------------------- | ------------------- | ----------------------------------- | --------------------------------------------------------------------- |
| `OPENPROJECT_HOST`               | `--host`            | `https://community.openproject.org` | Base URL of your OpenProject instance.                                |
| `OPENPROJECT_API_KEY`            | `--api-key`         | _None_                              | OpenProject API Key (Basic Auth).                                     |
| `OPENPROJECT_OAUTH_TOKEN`        | `--oauth-token`     | _None_                              | OAuth 2.0 Bearer Token (Alternative to API Key).                      |
| `OPENPROJECT_DEFAULT_PROJECT_ID` | `--default-project` | _None_                              | Default project ID or identifier (fallback when omitted).             |
| `OPENPROJECT_READ_ONLY_MODE`     | `--read-only`       | `false`                             | When `true`, blocks all mutating actions (`POST`, `PATCH`, `DELETE`). |
| `OPENPROJECT_PROJECT_ALLOWLIST`  | —                   | _None_                              | Comma-separated list of allowed project IDs/identifiers.              |
| `DEBUG`                          | —                   | `false`                             | Enable verbose debug logging on `process.stderr`.                     |

---

## 🔌 Client Integration Guides

### 1. Claude Desktop

Edit your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openproject": {
      "command": "node",
      "args": ["/absolute/path/to/openproject-mcp/dist/index.js"],
      "env": {
        "OPENPROJECT_HOST": "https://community.openproject.org",
        "OPENPROJECT_API_KEY": "your_api_key",
        "OPENPROJECT_DEFAULT_PROJECT_ID": "14"
      }
    }
  }
}
```

### 2. Cursor IDE

In `.cursor/mcp.json` or Global MCP Settings:

```json
{
  "mcpServers": {
    "openproject": {
      "command": "node",
      "args": ["/absolute/path/to/openproject-mcp/dist/index.js"],
      "env": {
        "OPENPROJECT_HOST": "https://community.openproject.org",
        "OPENPROJECT_API_KEY": "your_api_key",
        "OPENPROJECT_DEFAULT_PROJECT_ID": "14"
      }
    }
  }
}
```

### 3. Google Antigravity & Agentic Tools

```json
{
  "mcpServers": {
    "openproject": {
      "command": "node",
      "args": ["/absolute/path/to/openproject-mcp/dist/index.js"],
      "env": {
        "OPENPROJECT_HOST": "https://community.openproject.org",
        "OPENPROJECT_API_KEY": "your_api_key"
      }
    }
  }
}
```

---

## 💻 CLI Diagnostics & Subcommands

```bash
# 1. Start Server with stdio (Default)
node dist/index.js

# 2. Start Server with httpStream (SSE / Port binding)
node dist/index.js --transport httpStream --port 8081

# 3. Run Doctor Diagnostics
node dist/index.js doctor

# 4. List all 90 Registered Tools
node dist/index.js tools

# 5. Generate Client Configuration
node dist/index.js setup --client claude
node dist/index.js setup --client cursor
node dist/index.js setup --client antigravity
```

---

## 🤖 AI Prompts & Resource Templates

### Prompts

| Prompt Name                   | Arguments                   | Description                                                                                           |
| ----------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `task_breakdown_and_estimate` | `work_package_id`           | Analyzes task description and activities, produces structured sub-tasks, WBS, and ISO 8601 durations. |
| `sprint_planning`             | `project_id`, `version_id?` | Computes sprint metrics (estimated vs spent hours, velocity) and optimizes work allocation.           |
| `generate_sprint_report`      | `project_id`, `version_id?` | Generates an executive delivery report in Markdown summarizing completed deliverables and spillovers. |
| `triage_work_package`         | `work_package_id`           | Triages newly reported bugs/tasks with root cause analysis and severity classification.               |

### Resources

| URI Template                                    | MIME Type          | Description                                                        |
| ----------------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| `openproject://projects/{project_id}`           | `application/json` | Real-time project metadata, status, description, and assignees.    |
| `openproject://work_packages/{work_package_id}` | `application/json` | Real-time work package details, lockVersion, estimated/spent time. |
| `openproject://time_entries/{time_entry_id}`    | `application/json` | Detailed logged spent time entry with hours, date, and comments.   |

---

## 📚 Registered Tools Catalog

### 10. Developer Productivity Suite (7 Tools)

- `quick_start_task`: 1-step start task (moves status to In Progress, assigns to you, sets %, generates git branch).
- `quick_complete_task`: 1-step complete task (moves status to Resolved, sets 100%, logs spent hours, posts comment).
- `get_developer_daily_standup`: Auto-generates complete Agile Daily Standup report (Yesterday / Today / Blockers).
- `get_git_branch_name`: Generates clean standardized git branch name (e.g. `feat/OP-1234-support-oauth`).
- `get_git_commit_template`: Generates Conventional Commit template referencing OpenProject task ID.
- `get_task_dependency_graph`: Renders interactive **Mermaid flowchart diagram** of task dependencies & blockers.
- `generate_qa_checklist`: Auto-generates exhaustive QA & PR acceptance checklist in Markdown.

### 2. Time Tracking & Auditing Suite (10 Tools)

- `get_daily_time_summary`: Checks time logged today, compares with target (8h), identifies unlogged assigned tasks, and provides suggestions.
- `audit_unlogged_work`: Audits a date range for missing or under-logged days, and suggests open tasks to log time against.
- `create_time_entry`: Log spent time on a task/project (accepts decimal numbers or ISO format).
- `list_time_entries`: List time entries with date range, user, and activity filters.
- `get_time_entry`: Get details of a logged spent time entry.
- `update_time_entry`: Update logged hours, date, activity, or comments.
- `delete_time_entry`: Delete a time entry.
- `list_time_entry_activities`: List available activity categories (Development, Testing, etc.).
- `get_time_entry_activity`: Get activity category details by ID.
- `get_time_entries_schema`: Inspect schema definitions for time tracking.

### 1. Work Packages Suite (16 Tools)

- `get_work_package`: Retrieve work package details by ID.
- `list_work_packages`: List work packages with filters, sorting, and pagination.
- `create_work_package`: Create a new task/bug/feature in a project.
- `update_work_package`: Update task fields (auto-resolves `lockVersion`).
- `delete_work_package`: Delete a work package.
- `get_work_package_schema`: Retrieve field schema definitions.
- `list_work_package_children`: List direct child sub-tasks.
- `list_work_package_ancestors`: List ancestor parent work packages.
- `list_comments`: List activity stream and comments for a task.
- `add_comment`: Add a new comment to a work package.
- `list_work_packages_assigned_to`: List tasks assigned to a user or 'me'.
- `list_work_packages_created_by`: List tasks created by a user or 'me'.
- `list_overdue_work_packages`: List overdue tasks where dueDate < today.
- `list_work_packages_by_date`: List tasks due on a specific date.
- `list_work_packages_for_version`: List tasks assigned to a sprint/milestone.
- `export_work_packages`: Export tasks as JSON, CSV, or PDF.

### 3. Projects Suite (12 Tools)

- `get_project`, `list_projects`, `create_project`, `update_project`, `delete_project`, `list_project_statuses`, `list_available_assignees`, `list_available_statuses`, `list_categories`, `list_versions`, `list_types`, `get_sprint_summary`.

### 4. Relations Suite (4 Tools)

- `list_relations`, `get_relation`, `create_relation`, `delete_relation`.

### 5. Metadata Suite (8 Tools)

- `list_statuses`, `get_status`, `list_all_types`, `get_type`, `list_priorities`, `get_priority`, `list_all_categories`, `get_category`.

### 6. Users & Memberships (16 Tools)

- `list_users`, `get_user`, `create_user`, `update_user`, `delete_user`, `list_memberships`, `add_membership`, `update_membership`, `delete_membership`, `list_roles`, `list_groups`, `get_group`, `create_group`, `update_group`, `delete_group`, `list_principals`.

### 7. Versions Suite (5 Tools)

- `list_all_versions`, `get_version`, `create_version`, `update_version`, `delete_version`.

### 8. Attachments Suite (3 Tools)

- `get_attachment`, `delete_attachment`, `view_attachment_content`.

### 9. Queries & Notifications (9 Tools)

- `list_queries`, `get_query`, `list_notifications`, `mark_notifications_read`, `list_watchers`, `add_watcher`, `remove_watcher`, `list_budgets`, `get_budget`.

---

## 🧪 Testing & Quality Assurance

```bash
# Run all unit tests
npm test

# Run tests with V8 coverage report
npm run test:coverage

# Run strict TypeScript type check
npm run typecheck

# Run linter & formatter
npm run lint:fix && npm run format
```

### Coverage Benchmark

- **Line Coverage**: **91.1%**
- **Statement Coverage**: **90.2%**
- **Function Coverage**: **95.6%**
- **Active Tests**: **31/31 passed across 13 test suites**

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
