import { createServerFn } from '@tanstack/react-start';
import { readStyleNotes, STYLE_LOOK_PROMPT, styleLookInputSchema, type StyleNotes } from './style-look';

// Same look, same profile → same notes for this server run, so restyling back costs nothing.
const cache = new Map<string, StyleNotes>();

/** Hybrid search, AI half: OpenAI writes style notes for one evidence-backed look. */
export const styleLook = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => styleLookInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ notes: StyleNotes | null; error: string }> => {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      // The reader sees a plain message; the missing setting is named in the server log only.
      console.warn('[Style notes] OPENAI_API_KEY is not set');
      return { notes: null, error: 'Style notes aren’t available right now.' };
    }
    const id = JSON.stringify(data);
    const cached = cache.get(id);
    if (cached) return { notes: cached, error: '' };
    try {
      const { createResponsesCall } = await import('./ai/responses.server');
      const { getRequest } = await import('@tanstack/react-start/server');
      const { result } = createResponsesCall(getRequest(), {
        baseURL: 'https://api.openai.com/v1',
        apiKey,
        model: process.env['MELODYLUST_STYLE_MODEL'] || 'gpt-5-mini',
      }, [{ role: 'user', content: JSON.stringify(data) }], STYLE_LOOK_PROMPT);
      const notes = readStyleNotes(JSON.parse(await result.text));
      if (!notes) return { notes: null, error: "The style notes came back incomplete. Please try again." };
      cache.set(id, notes);
      return { notes, error: '' };
    } catch (failure) {
      const status = typeof failure === 'object' && failure && 'statusCode' in failure ? failure.statusCode : undefined;
      // Server log only: status, never the key or the request body.
      console.error('[StyleLook] OpenAI request failed', status ?? (failure instanceof Error ? failure.message : failure));
      return {
        notes: null,
        error: status === 401 || status === 403 ? 'OpenAI rejected the API key. Check it privately and restart the app.'
          : status === 429 ? 'OpenAI is busy or out of credit. Give it a moment, or check billing on your OpenAI account.'
          : 'We couldn\'t finish your style notes. Please try again.',
      };
    }
  });
