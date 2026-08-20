import { UserError } from 'fastmcp';
import { OpenProjectBaseError } from '../../core/errors/openproject-error.js';
import { logger } from '../../core/logger.js';

export function executeTool<TParams, TResult>(
  toolName: string,
  handler: (params: TParams) => Promise<TResult>
): (params: TParams) => Promise<string> {
  return async (params: TParams): Promise<string> => {
    try {
      logger.debug(`[Executing Tool: ${toolName}] params=${JSON.stringify(params)}`);
      const result = await handler(params);
      if (result === undefined || result === null) {
        return JSON.stringify({ success: true }, null, 2);
      }
      if (typeof result === 'string') {
        return result;
      }
      return JSON.stringify(result, null, 2);
    } catch (error: any) {
      if (error instanceof UserError || error instanceof OpenProjectBaseError) {
        throw error;
      }
      logger.error(`[Tool Error: ${toolName}] ${error.message}`);
      throw new UserError(`OpenProject Tool '${toolName}' failed: ${error.message}`);
    }
  };
}
