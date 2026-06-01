# Environment Setup

## Local frontend with mock backend

Use:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_USE_MOCK_API=true
```

## Local frontend with real backend

Use:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_USE_MOCK_API=false
```

## Notes

1. `VITE_USE_MOCK_API=false` requires backend adapter implementation in `src/services/api.ts`.
2. Keep CORS and cookies/session policy aligned with backend auth model.
3. Frontend still expects `ApiResponse<T>` envelopes unless adapter maps responses.

