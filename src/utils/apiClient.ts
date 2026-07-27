// Client-side API Interceptor
// Automatically attaches JWT Bearer token to all /api/* requests so all pages
// communicate seamlessly with real MongoDB Next.js API routes across all devices.

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Intercept local /api/ requests to append Authorization header
    if (url.startsWith('/api/') || url.includes('/api/')) {
      const token = localStorage.getItem('ds_jwt_token');
      
      const initObj: RequestInit = init ? { ...init } : {};
      const existingHeaders = initObj.headers || {};
      
      const headers: Record<string, string> = {};
      if (existingHeaders instanceof Headers) {
        existingHeaders.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(existingHeaders)) {
        existingHeaders.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, existingHeaders);
      }

      if (token && !headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      initObj.headers = headers;
      return originalFetch(input, initObj);
    }
    
    return originalFetch(input, init);
  };
}

export {};
