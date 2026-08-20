import { z } from 'zod';

export const projectIdSchema = z
  .union([z.string(), z.number()])
  .optional()
  .describe(
    'OpenProject Project ID or identifier (e.g. 14 or "demo-project"). If omitted, uses default configured project.'
  );

export const workPackageIdSchema = z
  .number()
  .describe('The unique ID of the OpenProject work package (task/bug/feature).');

export const paginationSchema = {
  pageSize: z
    .number()
    .min(1)
    .max(500)
    .optional()
    .describe('Number of items per page (default: 20, max: 500).'),
  offset: z.number().min(1).optional().describe('Page offset number (default: 1).'),
};
