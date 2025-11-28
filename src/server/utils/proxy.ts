import { ENFYRA_API_PREFIX } from '../../constants/config';

export function getProxyUrl(path: string, apiUrl: string, apiPrefix: string = ENFYRA_API_PREFIX): string {
  // Remove apiPrefix from path if present
  const cleanPath = path.replace(new RegExp(`^${apiPrefix}`), '');
  // Ensure path starts with /
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `${apiUrl}${normalizedPath}`;
}

export async function proxyRequest(
  url: string,
  request: Request,
  headers: Record<string, string> = {}
): Promise<Response> {
  const method = request.method;
  
  // Get body for non-GET/HEAD requests
  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await request.text();
    } catch {
      body = undefined;
    }
  }

  // Build headers, excluding certain headers
  const requestHeaders = new Headers(request.headers);
  const excludedHeaders = ['host', 'connection', 'keep-alive', 'content-length', 'transfer-encoding'];
  excludedHeaders.forEach(header => requestHeaders.delete(header));

  // Merge custom headers
  Object.entries(headers).forEach(([key, value]) => {
    if (value) {
      requestHeaders.set(key, value);
    }
  });

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body,
  });

  // Clone response
  const responseBody = await response.text();
  const responseHeaders = new Headers(response.headers);

  return new Response(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

