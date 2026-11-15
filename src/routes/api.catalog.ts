import { createFileRoute } from '@tanstack/react-router';
import { API_RATE, callerKey, catalogAnswer, jsonResponse, preflight, readOnly } from '@/lib/product-api';
import { lookupShopCatalog } from '@/lib/products.functions';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter(API_RATE);

// GET /api/catalog: the home Shop's current edit across categories, as JSON.
export const Route = createFileRoute('/api/catalog')({
  server: {
    handlers: {
      ...readOnly,
      OPTIONS: () => preflight(),
      GET: async ({ request }) => {
        if (!limiter.allow(callerKey(request.headers))) return jsonResponse({ error: 'Too many requests. Try again in an hour.' }, 429);
        const answer = catalogAnswer(await lookupShopCatalog({ data: undefined }));
        return jsonResponse(answer.body, answer.status, 30 * 60);
      },
    },
  },
});
