# API Contract (Frontend <-> Backend)

Date: 2026-06-01

## Base

- Base URL: `VITE_API_BASE_URL`
- JSON by default.
- Error shape (recommended):

```ts
interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
```

Success shape used by frontend:

```ts
interface ApiResponse<T> {
  data: T;
  message?: string;
}
```

## Services

- `GET /api/services`
- `GET /api/services/{id}`
- `POST /api/services`
- `PATCH /api/services/{id}`
- `DELETE /api/services/{id}`

## Availability

- `GET /api/availability/dates?serviceId={id}&participants={n}`
- `GET /api/availability/slots?serviceId={id}&date={yyyy-mm-dd}`
- `POST /api/availability/check`

`/slots` response must include explicit unavailability reasons per slot.

## Bookings

- `GET /api/bookings`
- `GET /api/bookings/{id}`
- `POST /api/bookings`
- `PATCH /api/bookings/{id}/status`
- `PATCH /api/bookings/{id}/assign-trainer`
- `PATCH /api/bookings/{id}/assign-horses`
- `PATCH /api/bookings/{id}/trainer-status`

## Resources

- `GET /api/horses`
- `POST /api/horses`
- `PATCH /api/horses/{id}`
- `DELETE /api/horses/{id}`

- `GET /api/trainers`
- `POST /api/trainers`
- `PATCH /api/trainers/{id}`
- `DELETE /api/trainers/{id}`

## Rules and exceptions

- `GET /api/booking-rules`
- `POST /api/booking-rules`
- `PATCH /api/booking-rules/{id}`
- `DELETE /api/booking-rules/{id}`

- `GET /api/schedule/exceptions`
- `POST /api/schedule/exceptions`
- `PATCH /api/schedule/exceptions/{id}`
- `DELETE /api/schedule/exceptions/{id}`

## Notifications

- `GET /api/notifications?recipientRole=...&recipientId=...`
- `GET /api/notifications/unread-count?recipientId=...`
- `PATCH /api/notifications/{id}/read`

## Content

- `GET /api/site-content`
- `PATCH /api/site-content`
- `GET /api/gallery`
- `GET /api/reviews`
- `GET /api/contacts`
- `GET /api/rules-info`

## Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Required backend guarantees

1. Availability check on server is source of truth.
2. Booking creation must be transactional against availability.
3. Race conditions must be handled server-side.
4. Role-based authorization must be enforced server-side.

