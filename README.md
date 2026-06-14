# RAPID4GRAD Website

RAPID4GRAD is a Next.js frontend plus Google Apps Script backend for the graduate navigation MVP.

## Structure

- `src/app` - pages and routes
- `src/components` - UI components
- `src/lib` - shared logic and types
- `backend/google-apps-script` - Apps Script backend

## Local Development

```bash
npm install
npm run dev
```

## Main Routes

- `/`
- `/diagnosis`
- `/result`
- `/dashboard`
- `/policies`
- `/testimonials`
- `/thesis-writing`

## Notes

- The old static HTML site has been removed.
- Frontend pages are now written as React components in `.tsx` files under `src/app`.
- `backend/google-apps-script` is the only backend source of truth for Sheets and email.
