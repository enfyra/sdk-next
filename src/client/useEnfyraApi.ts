'use client';

import { useState, useCallback } from 'react';
import type { ApiOptions, ApiError, ExecuteOptions, BatchProgress } from '../types';
import { ENFYRA_API_PREFIX } from '../constants/config';
import { joinUrl } from '../utils/url';

interface UseEnfyraApiReturn<T> {
  data: T | null;
  error: ApiError | null;
  pending: boolean;
  execute: (executeOpts?: ExecuteOptions) => Promise<T | T[] | null>;
}

function handleError(
  error: any,
  context?: string,
  customHandler?: (error: ApiError, context?: string) => void
): ApiError {
  const apiError: ApiError = {
    message: error?.message || error?.data?.message || 'Request failed',
    status: error?.status || error?.response?.status,
    data: error?.data || error?.response?.data,
    response: error?.response || error,
  };

  if (customHandler) {
    customHandler(apiError, context);
  } else {
    console.error(`[Enfyra API Error]`, { error: apiError, context });
  }

  return apiError;
}

async function fetchEnfyraUrl<T>(
  url: string,
  method: string,
  body?: any,
  query?: Record<string, any>
): Promise<T> {
  const fullUrl = new URL(url, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fullUrl.searchParams.append(key, String(value));
      }
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Enfyra SDK] Fetching URL:', fullUrl.toString());
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers,
    credentials: 'include',
  };

  if (body && method.toUpperCase() !== 'GET') {
    if (body instanceof FormData) {
      delete (headers as any)['Content-Type'];
      fetchOptions.body = body;
    } else {
      fetchOptions.body = JSON.stringify(body);
    }
  }

  const response = await fetch(fullUrl.toString(), fetchOptions);

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }
    throw {
      message: errorData.message || 'Request failed',
      status: response.status,
      data: errorData,
      response,
    };
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return await response.json();
  }

  return (await response.text()) as T;
}

async function processBatch<T>(
  items: any[],
  processor: (item: any, index: number) => Promise<T>,
  batchSize?: number,
  concurrent?: number,
  onProgress?: (progress: BatchProgress) => void
): Promise<T[]> {
  const results: T[] = [];
  const progressResults: BatchProgress['results'] = [];
  const startTime = Date.now();
  let completed = 0;
  let failed = 0;

  const chunks = batchSize
    ? Array.from({ length: Math.ceil(items.length / batchSize) }, (_, i) =>
        items.slice(i * batchSize, i * batchSize + batchSize)
      )
    : [items];

  const totalBatches = chunks.length;
  let currentBatch = 0;

  const updateProgress = (inProgress: number = 0) => {
    if (onProgress) {
      const elapsed = Date.now() - startTime;
      const progress = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
      const averageTime = completed > 0 ? elapsed / completed : undefined;
      const operationsPerSecond = completed > 0 ? (completed / elapsed) * 1000 : undefined;
      const estimatedTimeRemaining =
        averageTime && items.length > completed
          ? Math.round(averageTime * (items.length - completed))
          : undefined;

      const progressData: BatchProgress = {
        progress,
        completed,
        total: items.length,
        failed,
        inProgress,
        estimatedTimeRemaining,
        averageTime,
        currentBatch: currentBatch + 1,
        totalBatches,
        operationsPerSecond,
        results: [...progressResults],
      };

      onProgress(progressData);
    }
  };

  updateProgress(0);

  if (!batchSize && !concurrent) {
    updateProgress(items.length);

    const promises = items.map(async (item, index) => {
      const itemStartTime = Date.now();
      try {
        const result = await processor(item, index);
        const duration = Date.now() - itemStartTime;

        completed++;
        progressResults.push({
          index,
          status: 'completed',
          result,
          duration,
        });
        updateProgress(items.length - completed);

        return result;
      } catch (error) {
        const duration = Date.now() - itemStartTime;
        failed++;
        completed++;

        progressResults.push({
          index,
          status: 'failed',
          error: error as ApiError,
          duration,
        });
        updateProgress(items.length - completed);

        throw error;
      }
    });

    const batchResults = await Promise.all(promises);
    updateProgress(0);
    return batchResults;
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    currentBatch = chunkIndex;
    const chunk = chunks[chunkIndex];

    if (concurrent && chunk.length > concurrent) {
      for (let i = 0; i < chunk.length; i += concurrent) {
        const batch = chunk.slice(i, i + concurrent);
        const baseIndex = chunkIndex * (batchSize || items.length) + i;

        updateProgress(batch.length);

        const batchPromises = batch.map(async (item, batchItemIndex) => {
          const globalIndex = baseIndex + batchItemIndex;
          const itemStartTime = Date.now();

          try {
            const result = await processor(item, globalIndex);
            const duration = Date.now() - itemStartTime;

            completed++;
            progressResults.push({
              index: globalIndex,
              status: 'completed',
              result,
              duration,
            });
            updateProgress(Math.max(0, batch.length - (batchItemIndex + 1)));

            return result;
          } catch (error) {
            const duration = Date.now() - itemStartTime;
            failed++;
            completed++;

            progressResults.push({
              index: globalIndex,
              status: 'failed',
              error: error as ApiError,
              duration,
            });
            updateProgress(Math.max(0, batch.length - (batchItemIndex + 1)));

            throw error;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    } else {
      const baseIndex = chunkIndex * (batchSize || items.length);

      updateProgress(chunk.length);

      const chunkPromises = chunk.map(async (item, chunkItemIndex) => {
        const globalIndex = baseIndex + chunkItemIndex;
        const itemStartTime = Date.now();

        try {
          const result = await processor(item, globalIndex);
          const duration = Date.now() - itemStartTime;

          completed++;
          progressResults.push({
            index: globalIndex,
            status: 'completed',
            result,
            duration,
          });
          updateProgress(Math.max(0, chunk.length - (chunkItemIndex + 1)));

          return result;
        } catch (error) {
          const duration = Date.now() - itemStartTime;
          failed++;
          completed++;

          progressResults.push({
            index: globalIndex,
            status: 'failed',
            error: error as ApiError,
            duration,
          });
          updateProgress(Math.max(0, chunk.length - (chunkItemIndex + 1)));

          throw error;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
  }

  updateProgress(0);
  return results;
}

export function useEnfyraApi<T = any>(
  path: string | (() => string),
  opts: ApiOptions<T> = {}
): UseEnfyraApiReturn<T> {
  const { method = 'get', body, query, errorContext, onError } = opts;
  const { batchSize, concurrent, onProgress } = opts as any;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(false);

  const execute = useCallback(
    async (executeOpts?: ExecuteOptions): Promise<T | T[] | null> => {
      setPending(true);
      setError(null);

      try {
        const apiPrefix = 
          (typeof window !== 'undefined' && (window as any).__ENFYRA_API_PREFIX__) ||
          process.env.NEXT_PUBLIC_ENFYRA_API_PREFIX || 
          ENFYRA_API_PREFIX;
        let rawPath = typeof path === 'function' ? path() : path;

        let baseQuery: Record<string, any> | undefined;
        const queryIndex = rawPath.indexOf('?');
        if (queryIndex !== -1) {
          const pathPart = rawPath.slice(0, queryIndex);
          const queryString = rawPath.slice(queryIndex + 1);
          rawPath = pathPart || '/';

          if (queryString) {
            baseQuery = {};
            queryString.split('&').forEach((part) => {
              if (!part) return;
              const [key, value] = part.split('=');
              if (!key) return;
              baseQuery![decodeURIComponent(key)] =
                value !== undefined ? decodeURIComponent(value) : '';
            });
          }
        }

        const cleanPath = rawPath.replace(/^\/+/, '');

        const finalBody = executeOpts?.body || body;
        let finalQuery: Record<string, any> | undefined = {
          ...(baseQuery || {}),
          ...(query || {}),
          ...(executeOpts?.query || {}),
        };
        if (finalQuery && Object.keys(finalQuery).length === 0) {
          finalQuery = undefined;
        }

        const isBatchOperation =
          !opts.disableBatch &&
          ((executeOpts?.ids &&
            executeOpts.ids.length > 0 &&
            (method.toLowerCase() === 'patch' || method.toLowerCase() === 'delete')) ||
            (method.toLowerCase() === 'post' &&
              executeOpts?.files &&
              Array.isArray(executeOpts.files) &&
              executeOpts.files.length > 0));

        const effectiveBatchSize = isBatchOperation
          ? executeOpts?.batchSize ?? batchSize
          : undefined;
        const effectiveConcurrent = isBatchOperation
          ? executeOpts?.concurrent ?? concurrent
          : undefined;
        const effectiveOnProgress = isBatchOperation
          ? executeOpts?.onProgress ?? onProgress
          : undefined;

        if (isBatchOperation && executeOpts?.ids && executeOpts.ids.length > 0) {
          const responses = await processBatch(
            executeOpts.ids,
            async (id) => {
              const url = joinUrl(apiPrefix, cleanPath, String(id));
              return fetchEnfyraUrl<T>(url, method, finalBody, finalQuery);
            },
            effectiveBatchSize,
            effectiveConcurrent,
            effectiveOnProgress
          );

          setData(responses as T);
          return responses;
        }

        if (isBatchOperation && executeOpts?.files && Array.isArray(executeOpts.files) && executeOpts.files.length > 0) {
          const responses = await processBatch(
            executeOpts.files,
            async (fileObj: FormData) => {
              const url = joinUrl(apiPrefix, cleanPath);
              return fetchEnfyraUrl<T>(url, method, fileObj, finalQuery);
            },
            effectiveBatchSize,
            effectiveConcurrent,
            effectiveOnProgress
          );

          setData(responses as T);
          return responses;
        }

        const finalPath = executeOpts?.id
          ? joinUrl(apiPrefix, cleanPath, String(executeOpts.id))
          : joinUrl(apiPrefix, cleanPath);

        const response = await fetchEnfyraUrl<T>(finalPath, method, finalBody, finalQuery);
        setData(response);
        return response;
      } catch (err) {
        const apiError = handleError(err, errorContext, onError);
        setError(apiError);
        return null;
      } finally {
        setPending(false);
      }
    },
    [path, method, body, query, errorContext, onError, opts.disableBatch, batchSize, concurrent, onProgress]
  );

  return {
    data,
    error,
    pending,
    execute,
  };
}

