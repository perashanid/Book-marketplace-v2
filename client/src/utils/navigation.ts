// Navigation utilities to help with page reloading and routing

export const refreshPage = () => {
  window.location.reload();
};

export const navigateAndRefresh = (path: string) => {
  window.location.href = path;
};

// Force React Router to re-render by updating the key
export const getRouterKey = () => {
  return Date.now().toString();
};

// Check if we're on a specific route
export const isCurrentRoute = (path: string, currentPath: string) => {
  return currentPath === path || currentPath.startsWith(path + '/');
};

// Get query parameters from URL
export const getQueryParams = (search: string) => {
  return new URLSearchParams(search);
};

// Build URL with query parameters
export const buildUrlWithParams = (path: string, params: Record<string, string>) => {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.pathname + url.search;
};