/**
 * Join URL parts together, avoiding double slashes
 * @param parts - URL parts to join (base URL, prefix, path, etc.)
 * @returns Joined URL string
 * @example
 * joinUrl('https://api.example.com', '/api', '/users') // 'https://api.example.com/api/users'
 * joinUrl('https://api.example.com/', '/api/', 'users') // 'https://api.example.com/api/users'
 * joinUrl('https://api.example.com', 'api', 'users') // 'https://api.example.com/api/users'
 */
export function joinUrl(...parts: (string | undefined | null)[]): string {
  const validParts = parts.filter((part): part is string => 
    typeof part === 'string' && part.length > 0
  );

  if (validParts.length === 0) {
    return '';
  }

  // Process each part
  const normalizedParts: string[] = [];
  
  for (let i = 0; i < validParts.length; i++) {
    let part = validParts[i];
    
    // For the first part (usually base URL), preserve protocol but trim trailing slashes
    if (i === 0 && /^https?:\/\//i.test(part)) {
      part = part.replace(/\/+$/, '');
      normalizedParts.push(part);
    } else {
      // For all other parts, trim both leading and trailing slashes
      part = part.replace(/^\/+|\/+$/g, '');
      if (part.length > 0) {
        normalizedParts.push(part);
      }
    }
  }

  // Join parts with single slashes
  return normalizedParts.join('/');
}

export function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side: try to get from headers or env
  try {
    // This will be available in Server Components via headers()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '';
    if (appUrl) {
      return appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
    }
  } catch (e) {
    // Not available in this context
  }

  return '';
}

