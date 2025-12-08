export function joinUrl(...parts: (string | undefined | null)[]): string {
  const validParts = parts.filter((part): part is string => 
    typeof part === 'string' && part.length > 0
  );

  if (validParts.length === 0) {
    return '';
  }

  const normalizedParts: string[] = [];
  
  for (let i = 0; i < validParts.length; i++) {
    let part = validParts[i];
    
    if (i === 0 && /^https?:\/\//i.test(part)) {
      part = part.replace(/\/+$/, '');
      normalizedParts.push(part);
    } else {
      part = part.replace(/^\/+|\/+$/g, '');
      if (part.length > 0) {
        normalizedParts.push(part);
      }
    }
  }

  return normalizedParts.join('/');
}

export function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || '';
    if (appUrl) {
      return appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
    }
  } catch (e) {
  }

  return '';
}

