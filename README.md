# OpenProject MCP Server

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square)](https://www.typescriptlang.org/)
[![FastMCP](https://img.shields.io/badge/FastMCP-4.x-green?style=flat-square)](https://github.com/punkpeye/fastmcp)
[![OpenProject API](https://img.shields.io/badge/OpenProject%20API-v3-blue?style=flat-square)](https://www.openproject.org/docs/api/)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen?style=flat-square)](https://vitest.dev/)
[![Coverage](https://img.shields.io/badge/Coverage-91%25-brightgreen?style=flat-square)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

An enterprise Model Context Protocol (MCP) server for OpenProject REST API v3, built with Node.js, TypeScript, and FastMCP.

---

## Overview

OpenProject MCP Server implements the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) to bridge OpenProject instances with AI development assistants and agentic environments (such as Claude Desktop, Cursor IDE, and Google Antigravity).

The server exposes 90+ type-safe tools across 10 functional domains, handling complex HAL+JSON schemas, optimistic concurrency conflicts (`lockVersion`), token-optimized payload formatting, and automated developer lifecycle actions.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Client Integration](#client-integration)
  - [Claude Desktop](#claude-desktop)
  - [Cursor IDE](#cursor-ide)
  - [Google Antigravity](#google-antigravity)
- [CLI Reference](#cli-reference)
- [Tools Catalog](#tools-catalog)
- [AI Prompts and Resources](#ai-prompts-and-resources)
- [Development and Testing](#development-and-testing)
- [License](#license)

---

## Features

- **Full REST API v3 Coverage**: Over 90 type-safe MCP tools covering work packages, time tracking, projects, relations, metadata, users, versions, attachments, and saved queries.
- **Optimistic Locking Auto-Resolution**: Automatically reconciles `lockVersion` during work package updates to eliminate HTTP 409 conflict errors.
- **Token-Efficient Formatting**: Built-in HTML-to-Markdown normalization and `compact: true` mode to minimize LLM context window utilization.
- **Developer Productivity Suite**: Single-step commands for task initialization, QA completion, daily standup aggregation, Git branch generation, and QA checklists.
- **Time Tracking and ISO 8601 Durations**: Native support for ISO durations (`PT1H30M`), decimal hour inputs, unlogged work audits, and daily target tracking.
- **Access Controls and Safety**: Configurable read-only mode and project allowlists to prevent unauthorized mutations.
- **Dual Transport Support**: Operates over standard I/O (`stdio`) or HTTP stream (`httpStream` / SSE) transports.
- **Caching and Fault Tolerance**: LRU in-memory caching with a 60-second TTL and automatic HTTP retry mechanisms.

---

## Architecture

```
src/
├── cli.ts                              # CLI entrypoint (doctor, tools, setup)
├── config.ts                           # Environment configuration and schema validation
├── index.ts                            # Composition root and FastMCP server lifecycle
├── core/
│   ├── cache/cache-service.ts          # In-memory LRU cache (60s TTL)
│   ├── errors/openproject-error.ts     # Domain error hierarchy
│   ├── http/http-transport.ts          # Axios client with authentication and retries
│   ├── security/access-guard.ts        # Read-only guard and project allowlist enforcement
│   ├── openproject-client.ts           # Central API client and lockVersion resolver
│   └── logger.ts                       # Stderr-only structured logger
├── services/
│   ├── contracts/index.ts              # Service interface definitions
│   ├── index.ts                        # Service dependency injection container
│   ├── developer.service.ts            # Developer workflows, standup reports, QA generator
│   ├── work-packages.service.ts        # Work package CRUD, hierarchy, comments
│   ├── time-entries.service.ts         # Time entry CRUD, ISO duration parsing, auditing
│   ├── projects.service.ts             # Project management, schemas, sprint summaries
│   ├── relations.service.ts            # Work package relations (blocks, precedes, parent/child)
│   ├── metadata.service.ts             # Statuses, types, priorities, categories
│   ├── users.service.ts                # Users, groups, roles, memberships
│   ├── versions.service.ts             # Sprints, roadmaps, versions
│   ├── attachments.service.ts          # File attachments upload, inspection, download
│   └── queries.service.ts              # Saved queries and notifications
├── tools/                              # Declarative MCP tool adapters (10 domain suites)
├── prompts/                            # AI prompt templates
└── resources/                          # Dynamic URI resource templates
```

---

## Prerequisites

- **Node.js**: `v20.0.0` or higher (`v22` LTS recommended).
- **OpenProject Instance**: OpenProject Cloud or self-hosted OpenProject (v13+).
- **Authentication**: User API key (`My Account` -> `Access Token` -> `API`) or OAuth 2.0 Bearer token.

---

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/Nam088/openproject-mcp.git
cd openproject-mcp
npm install
```

### 2. Build the Package

```bash
npm run build
```

### 3. Run Diagnostic Verification

```bash
export OPENPROJECT_HOST="https://community.openproject.org"
export OPENPROJECT_API_KEY="your_api_key"
export OPENPROJECT_DEFAULT_PROJECT_ID="14"

node dist/index.js doctor
```

---

## Configuration

| Variable                         | CLI Flag            | Default                             | Description                                                            |
| :------------------------------- | :------------------ | :---------------------------------- | :--------------------------------------------------------------------- |
| `OPENPROJECT_HOST`               | `--host`            | `https://community.openproject.org` | Base URL of the OpenProject instance.                                  |
| `OPENPROJECT_API_KEY`            | `--api-key`         | None                                | OpenProject API Key (Basic Auth).                                      |
| `OPENPROJECT_OAUTH_TOKEN`        | `--oauth-token`     | None                                | OAuth 2.0 Bearer Token (Alternative to API Key).                       |
| `OPENPROJECT_DEFAULT_PROJECT_ID` | `--default-project` | None                                | Default fallback project ID or identifier.                             |
| `OPENPROJECT_READ_ONLY_MODE`     | `--read-only`       | `false`                             | When enabled, blocks all mutating actions (`POST`, `PATCH`, `DELETE`). |
| `OPENPROJECT_PROJECT_ALLOWLIST`  | None                | None                                | Comma-separated list of permitted project IDs.                         |
| `DEBUG`                          | None                | `false`                             | Enables verbose diagnostic logging on `process.stderr`.                |

---

## Client Integration

### Claude Desktop

Add the following to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openproject": {
      "command": "node",
      "args": ["/path/to/openproject-mcp/dist/index.js"],
      "env": {
        "OPENPROJECT_HOST": "https://community.openproject.org",
        "OPENPROJECT_API_KEY": "your_api_key",
        "OPENPROJECT_DEFAULT_PROJECT_ID": "14"
      }
    }
  }
}
```

### Cursor IDE

Add the configuration under `.cursor/mcp.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "openproject": {
      "command": "node",
      "args": ["/path/to/openproject-mcp/dist/index.js"],
      "env": {
        "OPENPROJECT_HOST": "https://community.openproject.org",
        "OPENPROJECT_API_KEY": "your_api_key",
        "OPENPROJECT_DEFAULT_PROJECT_ID": "14"
      }
    }
  }
}
```

### Google Antigravity

Register within `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "openproject": {
      "command": "node",
      "args": ["/path/to/openproject-mcp/dist/index.js"],
      "env": {
        "OPENPROJECT_HOST": "https://community.openproject.org",
        "OPENPROJECT_API_KEY": "your_api_key"
      }
    }
  }
}
```

---

## CLI Reference

The binary includes diagnostic and utility subcommands:

```bash
# Start server with stdio transport (Default)
node dist/index.js

# Start server with HTTP stream transport (SSE)
node dist/index.js --transport httpStream --port 8081

# Run connection and permissions diagnostic
node dist/index.js doctor

# List all registered MCP tools and parameter definitions
node dist/index.js tools

# Generate client configuration snippets
node dist/index.js setup --client claude
node dist/index.js setup --client cursor
node dist/index.js setup --client antigravity
```

---

## Tools Catalog

### 1. Developer Productivity Suite

| Tool                          | Description                                                                                       |
| :---------------------------- | :------------------------------------------------------------------------------------------------ |
| `quick_start_task`            | Moves task to "In Progress", assigns to current user, sets progress %, and generates branch name. |
| `quick_complete_task`         | Moves task to "Resolved", sets 100% completion, logs spent time, and posts resolution comment.    |
| `get_developer_daily_standup` | Compiles an Agile daily standup report (yesterday completed tasks, today tasks, blockers).        |
| `get_git_branch_name`         | Generates standardized Git branch name (e.g., `feat/OP-1234-description`).                        |
| `get_git_commit_template`     | Formats Conventional Commit message referencing OpenProject work package ID.                      |
| `get_task_dependency_graph`   | Generates Mermaid flowchart of parent-child hierarchy and blocking relations.                     |
| `generate_qa_checklist`       | Produces comprehensive QA acceptance and PR checklist in Markdown.                                |

### 2. Time Tracking and Auditing Suite

| Tool                         | Description                                                                           |
| :--------------------------- | :------------------------------------------------------------------------------------ |
| `create_time_entry`          | Logs spent time on a task or project (supports decimal hours and ISO 8601 durations). |
| `list_time_entries`          | Lists logged time entries with date range, user, project, and activity filters.       |
| `get_time_entry`             | Retrieves a specific time entry by ID.                                                |
| `update_time_entry`          | Updates hours, date, activity, or comments on an existing entry.                      |
| `delete_time_entry`          | Permanently removes a time entry.                                                     |
| `list_time_entry_activities` | Lists available time tracking activity categories (Development, QA, etc.).            |
| `get_time_entry_activity`    | Retrieves details for an activity category.                                           |
| `get_time_entries_schema`    | Retrieves field schema definitions for time tracking.                                 |
| `get_daily_time_summary`     | Evaluates total hours logged for a specific date against target thresholds.           |
| `audit_unlogged_work`        | Analyzes a date range for unlogged work days and identifies assigned tasks.           |

### 3. Work Packages Suite

| Tool                             | Description                                                                      |
| :------------------------------- | :------------------------------------------------------------------------------- |
| `get_work_package`               | Retrieves work package details (supports `compact: true` and field projections). |
| `list_work_packages`             | Lists work packages with filters, sorting, and pagination.                       |
| `create_work_package`            | Creates a new task, bug, or feature within a project.                            |
| `update_work_package`            | Modifies work package attributes (auto-resolves `lockVersion`).                  |
| `delete_work_package`            | Deletes a work package by ID.                                                    |
| `get_work_package_schema`        | Inspects schema constraints and allowable values.                                |
| `list_work_package_children`     | Lists direct sub-tasks for a given parent task.                                  |
| `list_work_package_ancestors`    | Lists ancestor chain leading to the root work package.                           |
| `list_comments`                  | Retrieves activity comments for a work package.                                  |
| `add_comment`                    | Posts a new activity comment to a work package.                                  |
| `list_work_packages_assigned_to` | Lists tasks assigned to a specific user or `me`.                                 |
| `list_work_packages_created_by`  | Lists tasks created by a specific user or `me`.                                  |
| `list_overdue_work_packages`     | Filters tasks past their due date that are not closed.                           |
| `list_work_packages_by_date`     | Filters tasks scheduled for or due on a specific date.                           |
| `list_work_packages_for_version` | Filters tasks mapped to a specific release version or milestone.                 |
| `export_work_packages`           | Exports filtered work packages to JSON, CSV, or formatted text.                  |

### 4. Projects Suite

- `get_project`, `list_projects`, `create_project`, `update_project`, `delete_project`, `list_project_statuses`, `list_available_assignees`, `list_available_statuses`, `list_categories`, `list_versions`, `list_types`, `get_sprint_summary`.

### 5. Relations Suite

- `list_relations`, `get_relation`, `create_relation`, `delete_relation`.

### 6. Metadata Suite

- `list_statuses`, `get_status`, `list_all_types`, `get_type`, `list_priorities`, `get_priority`, `list_all_categories`, `get_category`.

### 7. Users and Memberships Suite

- `list_users`, `get_user`, `create_user`, `update_user`, `delete_user`, `list_memberships`, `add_membership`, `update_membership`, `delete_membership`, `list_roles`, `list_groups`, `get_group`, `create_group`, `update_group`, `delete_group`, `list_principals`.

### 8. Versions Suite

- `list_all_versions`, `get_version`, `create_version`, `update_version`, `delete_version`.

### 9. Attachments Suite

- `get_attachment`, `delete_attachment`, `view_attachment_content`.

### 10. Saved Queries and Notifications

- `list_queries`, `get_query`, `list_notifications`, `mark_notifications_read`, `list_watchers`, `add_watcher`, `remove_watcher`, `list_budgets`, `get_budget`.

---

## AI Prompts and Resources

### Prompts

| Prompt Name                   | Parameters                  | Description                                                              |
| :---------------------------- | :-------------------------- | :----------------------------------------------------------------------- |
| `task_breakdown_and_estimate` | `work_package_id`           | Decomposes a task into structured WBS sub-tasks with ISO durations.      |
| `sprint_planning`             | `project_id`, `version_id?` | Computes backlog capacity, estimated vs actual hours, and allocation.    |
| `generate_sprint_report`      | `project_id`, `version_id?` | Generates a markdown delivery summary of completed tasks and spillovers. |
| `triage_work_package`         | `work_package_id`           | Classifies incoming issues, analyzes scope, and suggests priorities.     |

### Resources

| URI Template                                    | MIME Type          | Description                                                            |
| :---------------------------------------------- | :----------------- | :--------------------------------------------------------------------- |
| `openproject://projects/{project_id}`           | `application/json` | Real-time project metadata, status, description, and assignees.        |
| `openproject://work_packages/{work_package_id}` | `application/json` | Real-time work package state, lockVersion, estimates, and description. |
| `openproject://time_entries/{time_entry_id}`    | `application/json` | Detailed spent time entry data, date, activity, and notes.             |

---

## Development and Testing

```bash
# Run test suite
npm test

# Run test suite with V8 code coverage
npm run test:coverage

# Run TypeScript static typecheck
npm run typecheck

# Execute linter and formatter
npm run lint:fix && npm run format
```

### Test Coverage Baseline

- **Line Coverage**: 91.1%
- **Statement Coverage**: 90.2%
- **Function Coverage**: 95.6%
- **Automated Tests**: 32 passing across 13 test suites

---

## License

This project is licensed under the [MIT License](LICENSE).
