export interface EnfyraConfig {
  apiUrl: string;
  apiPrefix?: string;
  defaultHeaders?: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
  response?: any;
}

export interface BatchProgress {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Number of completed operations */
  completed: number;
  /** Total number of operations */
  total: number;
  /** Number of failed operations */
  failed: number;
  /** Number of operations currently in progress */
  inProgress: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemaining?: number;
  /** Average time per operation in milliseconds */
  averageTime?: number;
  /** Current batch being processed */
  currentBatch: number;
  /** Total number of batches */
  totalBatches: number;
  /** Processing speed (operations per second) */
  operationsPerSecond?: number;
  /** Detailed results array for completed operations */
  results: Array<{
    index: number;
    status: 'completed' | 'failed';
    result?: any;
    error?: ApiError;
    duration?: number;
  }>;
}

interface BaseApiOptions<T> {
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  query?: Record<string, any>;
  headers?: Record<string, string>;
  errorContext?: string;
  onError?: (error: ApiError, context?: string) => void;
  disableBatch?: boolean;
  ssr?: boolean;
}

interface BatchApiOptions {
  /** Batch size for chunking large operations (default: no limit) - Only available for batch operations */
  batchSize?: number;
  /** Maximum concurrent requests (default: no limit) - Only available for batch operations */
  concurrent?: number;
  /** Real-time progress callback for batch operations - Only available for batch operations */
  onProgress?: (progress: BatchProgress) => void;
}

type ConditionalBatchOptions<T> = T extends { method?: 'patch' | 'delete' | 'PATCH' | 'DELETE' }
  ? BatchApiOptions
  : T extends { method?: 'post' | 'POST' }
  ? BatchApiOptions  // POST supports file batch uploads
  : T extends { method?: undefined }
  ? Partial<BatchApiOptions>
  : {};

export type ApiOptions<T> = BaseApiOptions<T> & ConditionalBatchOptions<BaseApiOptions<T>>;

export interface BackendError {
  success: false;
  message: string;
}

export interface BackendErrorExtended extends BackendError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    method: string;
    correlationId?: string;
  };
}

export interface ExecuteOptions {
  body?: any;
  id?: string | number;
  query?: Record<string, any>;
  ids?: (string | number)[];
  /** Array of FormData objects for batch upload */
  files?: FormData[];
  /** Override batch size for this specific execution */
  batchSize?: number;
  /** Override concurrent limit for this specific execution */
  concurrent?: number;
  /** Override progress callback for this specific execution */
  onProgress?: (progress: BatchProgress) => void;
}

export * from './auth';

