import { OpenProjectConfig } from '../config.js';
import { OpenProjectWorkPackage } from '../types/openproject.types.js';
import { ICacheService, MemoryCacheService } from './cache/cache-service.js';
import { AxiosHttpTransport, IHttpTransport } from './http/http-transport.js';
import { logger } from './logger.js';
import { AccessGuard, IAccessGuard } from './security/access-guard.js';

export interface IOpenProjectClient {
  readonly config: OpenProjectConfig;
  readonly transport: IHttpTransport;
  readonly guard: IAccessGuard;
  readonly cache: ICacheService;

  resolveProjectId(projectId?: string | number): string;
  clearCache(): void;

  get<T>(
    path: string,
    params?: unknown,
    options?: { useCache?: boolean; ttlMs?: number }
  ): Promise<T>;
  post<T>(path: string, data?: unknown): Promise<T>;
  patch<T>(path: string, data?: unknown): Promise<T>;
  put<T>(path: string, data?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
  getRaw(path: string): Promise<{ data: Buffer; contentType: string; filename?: string }>;
  uploadAttachment(
    workPackageId: number,
    fileBuffer: Buffer,
    filename: string,
    description?: string,
    contentType?: string
  ): Promise<unknown>;
  patchWorkPackageWithLock(
    workPackageId: number,
    payload: Record<string, unknown>
  ): Promise<OpenProjectWorkPackage>;
}

export class OpenProjectClient implements IOpenProjectClient {
  public readonly config: OpenProjectConfig;
  public readonly transport: AxiosHttpTransport;
  public readonly guard: IAccessGuard;
  public readonly cache: ICacheService;

  constructor(
    config: OpenProjectConfig,
    transport?: AxiosHttpTransport,
    guard?: IAccessGuard,
    cache?: ICacheService
  ) {
    this.config = config;
    this.cache = cache || new MemoryCacheService(200, 60 * 1000);
    this.guard =
      guard ||
      new AccessGuard(config.defaultProjectId, config.projectAllowlist, config.readOnlyMode);

    this.transport =
      transport ||
      new AxiosHttpTransport({
        baseURL: config.host,
        apiKey: config.apiKey,
        oauthToken: config.oauthToken,
      });
  }

  public resolveProjectId(projectId?: string | number): string {
    return this.guard.resolveProjectId(projectId);
  }

  public clearCache(): void {
    this.cache.clear();
    logger.debug('[Cache Cleared]');
  }

  public async get<T>(
    path: string,
    params?: unknown,
    options?: { useCache?: boolean; ttlMs?: number }
  ): Promise<T> {
    const cleanPath = path.startsWith('/api/v3') ? path.slice('/api/v3'.length) : path;
    const cacheKey = options?.useCache
      ? `GET:${cleanPath}:${JSON.stringify(params || {})}`
      : undefined;

    if (cacheKey) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const response = await this.transport.get<T>(cleanPath, { params });

    if (cacheKey) {
      this.cache.set(cacheKey, response.data, options?.ttlMs);
    }

    return response.data;
  }

  public async post<T>(path: string, data?: unknown): Promise<T> {
    this.guard.checkReadOnly('POST');
    this.clearCache();
    const cleanPath = path.startsWith('/api/v3') ? path.slice('/api/v3'.length) : path;
    const response = await this.transport.post<T>(cleanPath, data);
    return response.data;
  }

  public async patch<T>(path: string, data?: unknown): Promise<T> {
    this.guard.checkReadOnly('PATCH');
    this.clearCache();
    const cleanPath = path.startsWith('/api/v3') ? path.slice('/api/v3'.length) : path;
    const response = await this.transport.patch<T>(cleanPath, data);
    return response.data;
  }

  public async put<T>(path: string, data?: unknown): Promise<T> {
    this.guard.checkReadOnly('PUT');
    this.clearCache();
    const cleanPath = path.startsWith('/api/v3') ? path.slice('/api/v3'.length) : path;
    const response = await this.transport.put<T>(cleanPath, data);
    return response.data;
  }

  public async delete<T>(path: string): Promise<T> {
    this.guard.checkReadOnly('DELETE');
    this.clearCache();
    const cleanPath = path.startsWith('/api/v3') ? path.slice('/api/v3'.length) : path;
    const response = await this.transport.delete<T>(cleanPath);
    return response.data;
  }

  public async getRaw(
    path: string
  ): Promise<{ data: Buffer; contentType: string; filename?: string }> {
    const cleanPath = path.startsWith('/api/v3') ? path.slice('/api/v3'.length) : path;
    const response = await this.transport.get<ArrayBuffer>(cleanPath, {
      responseType: 'arraybuffer',
    });

    const contentType = (response.headers['content-type'] as string) || 'application/octet-stream';
    let filename: string | undefined;

    const disposition = response.headers['content-disposition'] as string | undefined;
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    return {
      data: Buffer.from(response.data),
      contentType,
      filename,
    };
  }

  public async uploadAttachment(
    workPackageId: number,
    fileBuffer: Buffer,
    filename: string,
    description?: string,
    contentType?: string
  ): Promise<unknown> {
    this.guard.checkReadOnly('POST');
    this.clearCache();

    const formData = new FormData();
    const metadata = JSON.stringify({
      fileName: filename,
      description: {
        format: 'plain',
        raw: description || '',
      },
    });

    const fileBlob = new Blob([new Uint8Array(fileBuffer)], {
      type: contentType || 'application/octet-stream',
    });

    formData.append('metadata', metadata);
    formData.append('file', fileBlob, filename);

    const response = await this.transport.post(
      `/work_packages/${workPackageId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Automatically resolves latest lockVersion of a work package before patching
   */
  public async patchWorkPackageWithLock(
    workPackageId: number,
    payload: Record<string, unknown>
  ): Promise<OpenProjectWorkPackage> {
    this.guard.checkReadOnly('PATCH');
    this.clearCache();

    let lockVersion = payload.lockVersion;
    if (lockVersion === undefined) {
      const current = await this.get<OpenProjectWorkPackage>(`/work_packages/${workPackageId}`);
      lockVersion = current.lockVersion;
    }

    const mergedPayload = {
      ...payload,
      lockVersion,
    };

    return this.patch<OpenProjectWorkPackage>(`/work_packages/${workPackageId}`, mergedPayload);
  }
}
