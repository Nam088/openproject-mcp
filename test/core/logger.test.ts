import { describe, expect, it } from 'vitest';
import { logger } from '../../src/core/logger.js';

describe('Logger', () => {
  it('calls debug, info, warn, error, success, raw without throwing', () => {
    process.env.DEBUG = 'true';
    expect(() => logger.debug('debug msg')).not.toThrow();
    expect(() => logger.info('info msg')).not.toThrow();
    expect(() => logger.success('success msg')).not.toThrow();
    expect(() => logger.warn('warn msg')).not.toThrow();
    expect(() => logger.error('error msg')).not.toThrow();
    expect(() => logger.raw('raw msg')).not.toThrow();
  });
});
