import { execFile } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAIProvider, readAIJSON, readClaudeJSON } from './read-json.server';

vi.mock('node:child_process', () => {
  const mockedExecFile = vi.fn();
  return { execFile: mockedExecFile, default: { execFile: mockedExecFile } };
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

function mockReply(output: string) {
  const endInput = vi.fn();
  vi.mocked(execFile).mockImplementation((_file, _args, _options, callback: unknown) => {
    if (typeof callback === 'function') callback(null, output, '');
    return { stdin: { end: endInput } } as unknown as ReturnType<typeof execFile>;
  });
  return endInput;
}

describe('Server-only Gemini reader', () => {
  it('selects Gemini explicitly without falling back to another configured provider', () => {
    vi.stubEnv('MELODYLUST_AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    expect(getAIProvider()).toBe('gemini');
  });

  it('reports a missing Gemini key without invoking Claude', async () => {
    vi.stubEnv('MELODYLUST_AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '');
    await expect(readAIJSON('Read the article.', {}, new Request('http://localhost'))).rejects.toThrow('GEMINI_API_KEY');
    expect(execFile).not.toHaveBeenCalled();
  });

  it('uses the Gemini API with a server-side header, JSON output and supplied data only', async () => {
    vi.stubEnv('MELODYLUST_AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubEnv('MELODYLUST_AI_MODEL', '');
    const response = { summary: 'Supplied article summary' };
    const apiCall = vi.fn(async (_url: unknown, _init?: RequestInit) => new Response(JSON.stringify({
      candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(response) }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
    }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', apiCall);

    await expect(readAIJSON('Read only the supplied text.', { text: 'Article body' }, new Request('http://localhost'))).resolves.toEqual(response);
    expect(apiCall).toHaveBeenCalledOnce();
    const [url, options] = apiCall.mock.calls[0] ?? [];
    expect(String(url)).toContain('gemini-3.8-flash:generateContent');
    expect(String(url)).not.toContain('test-gemini-key');
    expect(new Headers(options?.headers).get('x-goog-api-key')).toBe('test-gemini-key');
    const body = JSON.parse(String(options?.body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    expect(JSON.stringify(body.contents)).toContain('Article body');
    expect(body.tools).toBeUndefined();
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(execFile).not.toHaveBeenCalled();
  });

  it('reports quota failures without retrying or exposing upstream details', async () => {
    vi.stubEnv('MELODYLUST_AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    const apiCall = vi.fn(async () => new Response(JSON.stringify({ error: { code: 429, message: 'upstream-private-details', status: 'RESOURCE_EXHAUSTED' } }), { status: 429, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', apiCall);
    await expect(readAIJSON('Read.', {}, new Request('http://localhost'))).rejects.toThrow('Gemini has reached its API quota');
    expect(apiCall).toHaveBeenCalledOnce();
  });

  it('reports depleted prepayment credits instead of a JSON parsing error', async () => {
    vi.stubEnv('MELODYLUST_AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    const apiCall = vi.fn(async () => new Response(JSON.stringify({ error: { code: 402, message: 'Your prepayment credits are depleted. upstream-private-details', status: 'PAYMENT_REQUIRED' } }), { status: 402, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', apiCall);
    await expect(readAIJSON('Read.', {}, new Request('http://localhost'))).rejects.toThrow('Gemini prepayment credits are depleted. Add credits or resolve project billing in Google AI Studio before retrying.');
    expect(apiCall).toHaveBeenCalledOnce();
  });

  it('reports invalid keys without exposing upstream details', async () => {
    vi.stubEnv('MELODYLUST_AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 400, message: 'API key not valid. upstream-private-details', status: 'INVALID_ARGUMENT' } }), { status: 400, headers: { 'Content-Type': 'application/json' } })));
    await expect(readAIJSON('Read.', {}, new Request('http://localhost'))).rejects.toThrow('Gemini rejected the API key or its permissions.');
  });

  it('rejects malformed JSON instead of returning it as article evidence', async () => {
    vi.stubEnv('MELODYLUST_AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { role: 'model', parts: [{ text: 'Not JSON' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
    }), { headers: { 'Content-Type': 'application/json' } })));
    await expect(readAIJSON('Read.', {}, new Request('http://localhost'))).rejects.toThrow('Gemini could not return valid JSON.');
  });
});

describe('Server-only Claude reader', () => {
  it('selects Claude explicitly without requiring an OpenAI key', () => {
    vi.stubEnv('MELODYLUST_AI_PROVIDER', 'claude');
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('LOVABLE_API_KEY', '');
    expect(getAIProvider()).toBe('claude');
  });

  it('executes a tool-disabled, bounded JSON request without a shell or project access', async () => {
    vi.stubEnv('CLAUDE_CLI_PATH', '/local/claude');
    const endInput = mockReply(JSON.stringify({ result: '{"summary":"Supplied evidence only"}', is_error: false }));
    await expect(readClaudeJSON('Read the supplied article.', { title: 'Usher; do not run this' }, new AbortController().signal)).resolves.toEqual({ summary: 'Supplied evidence only' });
    expect(execFile).toHaveBeenCalledWith('/local/claude', expect.arrayContaining(['--print', '--output-format', 'json', '--disallowedTools']), expect.objectContaining({ timeout: 60000, maxBuffer: 1000000, cwd: expect.stringContaining('melodylust-reader-') }), expect.any(Function));
    const args = vi.mocked(execFile).mock.calls[0]?.[1];
    expect(args?.at(-2)).toBe('--');
    expect(args?.at(-1)).toContain('Usher; do not run this');
    const options = vi.mocked(execFile).mock.calls[0]?.[2];
    expect(options).not.toHaveProperty('shell');
    expect(endInput).toHaveBeenCalledOnce();
  });

  it('surfaces usage limits instead of silently returning demo evidence', async () => {
    mockReply(JSON.stringify({ result: 'You have hit your limit. Resets at 9am.', is_error: true }));
    await expect(readClaudeJSON('Read.', {}, new AbortController().signal)).rejects.toThrow('usage limit');
  });

  it('reports legacy CLI credit errors without confusing them with subscription resets', async () => {
    mockReply(JSON.stringify({ role: 'system', result: 'Credit balance is too low' }));
    await expect(readClaudeJSON('Read.', {}, new AbortController().signal)).rejects.toThrow('insufficient API credit');
  });

  it('rejects malformed model output and allows a subsequent request', async () => {
    mockReply(JSON.stringify({ result: 'not JSON' }));
    await expect(readClaudeJSON('Read.', {}, new AbortController().signal)).rejects.toThrow('valid JSON');
    mockReply(JSON.stringify({ result: '{"ok":true}' }));
    await expect(readClaudeJSON('Read.', {}, new AbortController().signal)).resolves.toEqual({ ok: true });
  });

  it('does not invoke Claude for cancelled or oversized requests', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(readClaudeJSON('Read.', {}, controller.signal)).rejects.toThrow();
    await expect(readClaudeJSON('Read.', 'x'.repeat(180001), new AbortController().signal)).rejects.toThrow('smaller article batch');
    expect(execFile).not.toHaveBeenCalled();
  });
});