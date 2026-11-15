import { createFileRoute } from '@tanstack/react-router';
import { apiIndex, jsonResponse, preflight, readOnly } from '@/lib/product-api';

// GET /api: what the product API offers and how to call it.
export const Route = createFileRoute('/api/')({
  server: {
    handlers: {
      ...readOnly,
      OPTIONS: () => preflight(),
      GET: ({ request }) => jsonResponse(apiIndex(new URL(request.url).origin), 200, 60 * 60),
    },
  },
});
