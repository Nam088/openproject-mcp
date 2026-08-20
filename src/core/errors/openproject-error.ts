import { UserError } from 'fastmcp';

export class OpenProjectBaseError extends UserError {
  constructor(message: string) {
    super(message);
    this.name = 'OpenProjectBaseError';
  }
}

export class OpenProjectApiError extends OpenProjectBaseError {
  public readonly statusCode: number;
  public readonly statusText: string;
  public readonly endpoint?: string;
  public readonly method?: string;

  constructor(
    statusCode: number,
    statusText: string,
    message: string,
    endpoint?: string,
    method?: string
  ) {
    super(
      `OpenProject API Error [${statusCode} ${statusText}] ${method ? `${method} ` : ''}${endpoint || ''}: ${message}`
    );
    this.name = 'OpenProjectApiError';
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.endpoint = endpoint;
    this.method = method;
  }
}

export class OpenProjectAuthError extends OpenProjectApiError {
  constructor(
    statusCode: number,
    statusText: string,
    message: string,
    endpoint?: string,
    method?: string
  ) {
    super(statusCode, statusText, `Authentication/Permission failed: ${message}`, endpoint, method);
    this.name = 'OpenProjectAuthError';
  }
}

export class OpenProjectNotFoundError extends OpenProjectApiError {
  constructor(
    statusCode: number,
    statusText: string,
    message: string,
    endpoint?: string,
    method?: string
  ) {
    super(statusCode, statusText, `Resource not found: ${message}`, endpoint, method);
    this.name = 'OpenProjectNotFoundError';
  }
}

export class OpenProjectConflictError extends OpenProjectApiError {
  constructor(
    statusCode: number,
    statusText: string,
    message: string,
    endpoint?: string,
    method?: string
  ) {
    super(statusCode, statusText, `Conflict/LockVersion error: ${message}`, endpoint, method);
    this.name = 'OpenProjectConflictError';
  }
}

export class OpenProjectValidationError extends OpenProjectApiError {
  constructor(
    statusCode: number,
    statusText: string,
    message: string,
    endpoint?: string,
    method?: string
  ) {
    super(statusCode, statusText, `Validation error: ${message}`, endpoint, method);
    this.name = 'OpenProjectValidationError';
  }
}

export class OpenProjectRateLimitError extends OpenProjectApiError {
  constructor(
    statusCode: number,
    statusText: string,
    message: string,
    endpoint?: string,
    method?: string
  ) {
    super(statusCode, statusText, `Rate limit exceeded: ${message}`, endpoint, method);
    this.name = 'OpenProjectRateLimitError';
  }
}

export class OpenProjectNetworkError extends OpenProjectBaseError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'OpenProjectNetworkError';
    this.originalError = originalError;
  }
}
