import { describe, expect, it } from 'vitest';
import { AccessGuard } from '../../src/core/security/access-guard.js';

describe('AccessGuard', () => {
  it('resolves project ID with fallback to default', () => {
    const guard = new AccessGuard('14');
    expect(guard.resolveProjectId()).toBe('14');
    expect(guard.resolveProjectId('15')).toBe('15');
  });

  it('throws error when no project ID is provided or default configured', () => {
    const guard = new AccessGuard();
    expect(() => guard.resolveProjectId()).toThrow('Project ID/identifier is required');
  });

  it('enforces project allowlist', () => {
    const guard = new AccessGuard('14', ['14', 'allowed-repo']);
    expect(() => guard.resolveProjectId('14')).not.toThrow();
    expect(() => guard.resolveProjectId('allowed-repo')).not.toThrow();
    expect(() => guard.resolveProjectId('blocked-repo')).toThrow('not in the allowed project list');
  });

  it('enforces read-only mode for mutating operations', () => {
    const guard = new AccessGuard('14', undefined, true);
    expect(() => guard.checkReadOnly('POST')).toThrow('server is running in read-only mode');
  });
});
