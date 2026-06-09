export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api',
  useMockApi: (import.meta.env.VITE_USE_MOCK_API || 'false').toLowerCase() === 'true',
};
