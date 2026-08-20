import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { ServiceContainer } from '../services/index.js';
import { executeTool } from './common/tool-helper.js';

export function registerAttachmentsTools(server: FastMCP, services: ServiceContainer): void {
  server.addTool({
    name: 'list_attachments',
    description: 'List all attachment metadata associated with a work package.',
    parameters: z.object({
      work_package_id: z.number().describe('Work Package ID.'),
    }),
    execute: executeTool('list_attachments', async (args) => {
      return services.attachments.listAttachments(args.work_package_id);
    }),
  });

  server.addTool({
    name: 'get_attachment',
    description: 'Retrieve metadata of an attachment by ID.',
    parameters: z.object({
      id: z.number().describe('Attachment ID.'),
    }),
    execute: executeTool('get_attachment', async (args) => {
      return services.attachments.getAttachment(args.id);
    }),
  });

  server.addTool({
    name: 'delete_attachment',
    description: 'Delete an attachment file.',
    parameters: z.object({
      id: z.number().describe('Attachment ID to delete.'),
    }),
    execute: executeTool('delete_attachment', async (args) => {
      return services.attachments.deleteAttachment(args.id);
    }),
  });

  server.addTool({
    name: 'view_attachment_content',
    description: 'Download and view raw content / text / base64 of an attachment.',
    parameters: z.object({
      id: z.number().describe('Attachment ID.'),
    }),
    execute: executeTool('view_attachment_content', async (args) => {
      const raw = await services.attachments.viewAttachmentContent(args.id);
      return {
        filename: raw.filename,
        contentType: raw.contentType,
        base64: raw.data.toString('base64'),
        sizeBytes: raw.data.length,
      };
    }),
  });

  server.addTool({
    name: 'upload_attachment',
    description:
      'Upload a local file or base64 data as an attachment to an OpenProject work package.',
    parameters: z.object({
      work_package_id: z.number().describe('Work Package ID to attach the file to.'),
      filename: z.string().describe('Name of the file (e.g. "report.pdf", "screenshot.png").'),
      file_path: z
        .string()
        .optional()
        .describe('Absolute or relative path to a local file on disk.'),
      content_base64: z
        .string()
        .optional()
        .describe('Base64-encoded string of the file content (if not using file_path).'),
      description: z.string().optional().describe('Optional description of the attachment.'),
      content_type: z
        .string()
        .optional()
        .describe('MIME type of the file (e.g. "application/pdf", "image/png").'),
    }),
    execute: executeTool('upload_attachment', async (args) => {
      return services.attachments.uploadAttachment({
        workPackageId: args.work_package_id,
        filePath: args.file_path,
        contentBase64: args.content_base64,
        filename: args.filename,
        description: args.description,
        contentType: args.content_type,
      });
    }),
  });
}
