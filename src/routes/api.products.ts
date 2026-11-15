import { createFileRoute } from '@tanstack/react-router';
import { API_RATE, callerKey, jsonResponse, preflight, productAnswer, readOnly, readProductQuery } from '@/lib/product-api';
import { lookupProducts } from '@/lib/products.functions';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter(API_RATE);

// GET /api/products?designer=Prada&item=loafers&limit=5: the app's own product lookup (and its one-day cache), as JSON.
export const Route = createFileRoute('/api/products')({
  server: {
    handlers: {
      ...readOnly,
      OPTIONS: () => preflight(),
      GET: async ({ request }) => {
        const read = readProductQuery(new URL(request.url).searchParams);
        if (!read.ok) return jsonResponse({ error: read.error }, 400);
        if (!limiter.allow(callerKey(request.headers))) return jsonResponse({ error: 'Too many requests. Try again in an hour.' }, 429);
        const answer = productAnswer(read.query, await lookupProducts({ data: read.query }));
        return jsonResponse(answer.body, answer.status, 60 * 60);
      },
    },
  },
});
