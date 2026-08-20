import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import axiosRetry, { isNetworkOrIdempotentRequestError } from 'axios-retry';
import {
  OpenProjectApiError,
  OpenProjectAuthError,
  OpenProjectBaseError,
  OpenProjectConflictError,
  OpenProjectNetworkError,
  OpenProjectNotFoundError,
  OpenProjectRateLimitError,
  OpenProjectValidationError,
} from '../errors/openproject-error.js';
import { logger } from '../logger.js';

export interface HttpTransportOptions {
  baseURL: string;
  apiKey?: string;
  oauthToken?: string;
  timeout?: number;
  userAgent?: string;
}

export interface IHttpTransport {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

export class AxiosHttpTransport implements IHttpTransport {
  public readonly client: AxiosInstance;

  constructor(options: HttpTransportOptions) {
    const headers: Record<string, string> = {
      'User-Agent': options.userAgent || 'openproject-mcp-server/1.0.0',
      Accept: 'application/hal+json, application/json',
      'Content-Type': 'application/json',
    };

    if (options.oauthToken) {
      headers['Authorization'] = `Bearer ${options.oauthToken}`;
    } else if (options.apiKey) {
      const encoded = Buffer.from(`apikey:${options.apiKey}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }

    this.client = axios.create({
      baseURL: `${options.baseURL.replace(/\/+$/, '')}/api/v3`,
      timeout: options.timeout || 60000,
      headers,
      paramsSerializer: {
        indexes: null,
      },
    });

    this.setupRetry();
    this.setupInterceptors();
  }

  private setupRetry(): void {
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: (retryCount, error) => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
              return seconds * 1000;
            }
          }
        }
        return axiosRetry.exponentialDelay(retryCount);
      },
      retryCondition: (error: AxiosError) => {
        if (!error.response) return true;
        if (error.response.status === 429) return true;
        if (error.response.status >= 500 && error.response.status <= 599) return true;
        return isNetworkOrIdempotentRequestError(error);
      },
    });
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      logger.debug(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const statusText = error.response.statusText;
          const data: any = error.response.data;
          const endpoint = error.config?.url || 'unknown';
          const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

          let message = 'OpenProject API Error';
          if (typeof data === 'string') {
            message = data;
          } else if (data && typeof data === 'object') {
            message =
              data.message ||
              data.error_description ||
              data.error ||
              data._embedded?.errors?.[0]?.message ||
              JSON.stringify(data);
          }

          switch (status) {
            case 401:
            case 403:
              throw new OpenProjectAuthError(status, statusText, message, endpoint, method);
            case 404:
              throw new OpenProjectNotFoundError(status, statusText, message, endpoint, method);
            case 409:
              throw new OpenProjectConflictError(status, statusText, message, endpoint, method);
            case 422:
              throw new OpenProjectValidationError(status, statusText, message, endpoint, method);
            case 429:
              throw new OpenProjectRateLimitError(status, statusText, message, endpoint, method);
            default:
              throw new OpenProjectApiError(status, statusText, message, endpoint, method);
          }
        }

        if (error.request) {
          throw new OpenProjectNetworkError(
            `Network request failed: no response received from OpenProject (${error.message})`,
            error
          );
        }

        if (error instanceof OpenProjectBaseError) {
          throw error;
        }

        throw new OpenProjectBaseError(`Failed to send request: ${error.message}`);
      }
    );
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  public async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  public async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  public async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }
}
