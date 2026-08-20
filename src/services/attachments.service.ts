import fs from 'node:fs';
import { IOpenProjectClient } from '../core/openproject-client.js';
import { IAttachmentsService } from './contracts/index.js';

export class AttachmentsService implements IAttachmentsService {
  constructor(private readonly client: IOpenProjectClient) {}

  public async listAttachments(workPackageId: number): Promise<unknown[]> {
    const res = await this.client.get<any>(`/work_packages/${workPackageId}/attachments`);
    return res._embedded?.elements || [];
  }

  public async getAttachment(id: number): Promise<unknown> {
    return this.client.get(`/attachments/${id}`, undefined, { useCache: true });
  }

  public async deleteAttachment(id: number): Promise<unknown> {
    return this.client.delete(`/attachments/${id}`);
  }

  public async viewAttachmentContent(
    id: number
  ): Promise<{ data: Buffer; contentType: string; filename?: string }> {
    return this.client.getRaw(`/attachments/${id}/content`);
  }

  public async uploadAttachment(data: {
    workPackageId: number;
    filePath?: string;
    contentBase64?: string;
    filename: string;
    description?: string;
    contentType?: string;
  }): Promise<unknown> {
    let fileBuffer: Buffer;
    if (data.filePath) {
      fileBuffer = fs.readFileSync(data.filePath);
    } else if (data.contentBase64) {
      fileBuffer = Buffer.from(data.contentBase64, 'base64');
    } else {
      throw new Error('Either filePath or contentBase64 must be provided to upload an attachment.');
    }

    return this.client.uploadAttachment(
      data.workPackageId,
      fileBuffer,
      data.filename,
      data.description,
      data.contentType
    );
  }
}
