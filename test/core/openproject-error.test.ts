import { describe, expect, it } from 'vitest';
import {
  OpenProjectApiError,
  OpenProjectAuthError,
  OpenProjectConflictError,
  OpenProjectNetworkError,
  OpenProjectNotFoundError,
  OpenProjectRateLimitError,
  OpenProjectValidationError,
} from '../../src/core/errors/openproject-error.js';

describe('OpenProject Errors Hierarchy', () => {
  it('creates specialized error subclasses properly', () => {
    const authErr = new OpenProjectAuthError(
      401,
      'Unauthorized',
      'Invalid API key',
      '/work_packages',
      'GET'
    );
    expect(authErr.name).toBe('OpenProjectAuthError');
    expect(authErr.statusCode).toBe(401);
    expect(authErr.message).toContain('Authentication/Permission failed');

    const notFound = new OpenProjectNotFoundError(404, 'Not Found', 'Work package not found');
    expect(notFound.name).toBe('OpenProjectNotFoundError');
    expect(notFound.statusCode).toBe(404);

    const conflict = new OpenProjectConflictError(409, 'Conflict', 'LockVersion mismatch');
    expect(conflict.name).toBe('OpenProjectConflictError');

    const validation = new OpenProjectValidationError(
      422,
      'Unprocessable Entity',
      'Subject is required'
    );
    expect(validation.name).toBe('OpenProjectValidationError');

    const rateLimit = new OpenProjectRateLimitError(429, 'Too Many Requests', 'Rate limit hit');
    expect(rateLimit.name).toBe('OpenProjectRateLimitError');

    const genericApi = new OpenProjectApiError(500, 'Internal Server Error', 'Server broke');
    expect(genericApi.name).toBe('OpenProjectApiError');

    const netErr = new OpenProjectNetworkError('Socket closed');
    expect(netErr.name).toBe('OpenProjectNetworkError');
  });
});
