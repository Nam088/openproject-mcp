import { OpenProjectBaseError } from '../errors/openproject-error.js';

export interface IAccessGuard {
  checkReadOnly(operationName: string): void;
  checkProjectAllowed(projectId: string | number): void;
  resolveProjectId(projectId?: string | number): string;
}

export class AccessGuard implements IAccessGuard {
  constructor(
    private readonly defaultProjectId?: string,
    private readonly allowedProjectIds?: string[],
    private readonly readOnlyMode = false
  ) {}

  public checkReadOnly(operationName: string): void {
    if (this.readOnlyMode) {
      throw new OpenProjectBaseError(
        `Operation '${operationName}' blocked: server is running in read-only mode (OPENPROJECT_READ_ONLY_MODE=true).`
      );
    }
  }

  public checkProjectAllowed(projectId: string | number): void {
    if (!this.allowedProjectIds || this.allowedProjectIds.length === 0) {
      return;
    }

    const target = String(projectId).trim();
    const isAllowed = this.allowedProjectIds.some(
      (allowed) => allowed === target || allowed === decodeURIComponent(target)
    );

    if (!isAllowed) {
      throw new OpenProjectBaseError(
        `Project '${target}' is not in the allowed project list (OPENPROJECT_PROJECT_ALLOWLIST).`
      );
    }
  }

  public resolveProjectId(projectId?: string | number): string {
    const resolved =
      projectId !== undefined && projectId !== null && String(projectId).trim() !== ''
        ? String(projectId).trim()
        : this.defaultProjectId;

    if (!resolved) {
      throw new OpenProjectBaseError(
        'Project ID/identifier is required. Please provide it in the tool parameters (e.g. project_id) or configure OPENPROJECT_DEFAULT_PROJECT_ID environment variable.'
      );
    }

    this.checkProjectAllowed(resolved);
    return resolved;
  }
}
