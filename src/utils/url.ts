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

