import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export class AIConnectionError extends Error {}

export function getAIProvider() {
  const selected = process.env['MELODYLUST_AI_PROVIDER'];
  if (selected === 'claude') return 'claude';
  if (selected === 'gemini') return 'gemini';
  if (selected && selected !== 'openai' && selected !== 'lovable') throw new AIConnectionError('Unsupported AI provider configuration.');
  if (selected !== 'lovable' && process.env['OPENAI_API_KEY']) return 'openai';
  if (selected !== 'openai' && process.env['LOVABLE_API_KEY']) return 'lovable';
  return null;
}

let claudeBusy = false;

function claudeFailure(output: string) {
  if (/usage limit|rate.?limit|hit your limit|limit reached|quota/i.test(output)) return new AIConnectionError('Claude has reached its usage limit. Try again after your account resets.');
  if (/credit balance|insufficient credits|not enough credits/i.test(output)) return new AIConnectionError('Claude reported insufficient API credit. This is separate from a subscription usage reset. Check your Claude account connection on your Mac.');
  if (/not logged|log.?in|authenticat|invalid.*key/i.test(output)) return new AIConnectionError('Claude needs authentication or account access. Sign in directly in your Mac terminal.');
  return new AIConnectionError('Claude could not complete this request. Check the Claude CLI on your Mac.');
}

export async function readClaudeJSON(instructions: string, input: unknown, signal: AbortSignal) {
  if (claudeBusy) throw new AIConnectionError('Claude is already reading an article. Try again when it finishes.');
  const payload = JSON.stringify(input);
  if (Buffer.byteLength(payload) > 180000) throw new AIConnectionError('Too much text for one Claude request. Use a smaller article batch.');
  signal.throwIfAborted();
  claudeBusy = true;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(join(tmpdir(), 'melodylust-reader-'));
    const prompt = `${instructions}\nUse only the supplied data below. Do not use tools, read files, browse, or execute commands. Return only valid JSON.\n${payload}`;
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = execFile(process.env['CLAUDE_CLI_PATH'] || 'claude', [
        '--print', '--output-format', 'json',
        '--disallowedTools', 'Bash,Read,Edit,Write,MultiEdit,Glob,Grep,LS,NotebookRead,NotebookEdit,WebFetch,WebSearch,Task,Agent,TodoWrite,mcp__*',
        '--', prompt,
      ], { cwd: directory, encoding: 'utf8', timeout: 60000, maxBuffer: 1000000, signal }, (failure, output, stderr) => {
        if (failure) {
          if ('code' in failure && failure.code === 'ENOENT') reject(new AIConnectionError('Claude CLI was not found. Configure CLAUDE_CLI_PATH on your Mac.'));
          else if (signal.aborted || failure.killed) reject(new AIConnectionError('Claude took too long or the request was cancelled. Please try again.'));
          else reject(claudeFailure(`${output}\n${stderr}`));
        } else resolve(output);
      });
      child.stdin?.end();
    });
    let envelope: unknown;
    try { envelope = JSON.parse(stdout); }
    catch { throw new AIConnectionError('Claude returned an unreadable response. No article data was loaded.'); }
    if (!envelope || typeof envelope !== 'object' || !('result' in envelope) || typeof envelope.result !== 'string') throw new AIConnectionError('Claude returned an unreadable response. No article data was loaded.');
    if (('is_error' in envelope && envelope.is_error) || ('role' in envelope && envelope.role === 'system')) throw claudeFailure(envelope.result);
    try { return JSON.parse(envelope.result) as unknown; }
    catch { throw new AIConnectionError('Claude did not return valid JSON. No article data was loaded.'); }
  } finally {
    try { if (directory) await rm(directory, { recursive: true, force: true }); }
    finally { claudeBusy = false; }
  }
}

export async function readAIJSON(instructions: string, input: unknown, request: Request) {
  const provider = getAIProvider();
  if (!provider) return null;
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(60000)]);
  if (provider === 'claude') return readClaudeJSON(instructions, input, signal);
  if (provider === 'gemini') {
    const apiKey = process.env['GEMINI_API_KEY'] || process.env['GOOGLE_GENERATIVE_AI_API_KEY'];
    if (!apiKey?.trim()) throw new AIConnectionError('Gemini needs GEMINI_API_KEY in the server .env file. Add it privately on your Mac and restart the app.');
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
    const { APICallError, generateText, Output } = await import('ai');
    const google = createGoogleGenerativeAI({ apiKey });
    const modelId = process.env['MELODYLUST_AI_MODEL'] || 'gemini-3.8-flash';
    try {
      const { output } = await generateText({
        model: google(modelId),
        system: instructions,
        prompt: JSON.stringify(input),
        output: Output.json(),
        providerOptions: modelId === 'gemini-3.8-flash' ? { google: { thinkingConfig: { thinkingLevel: 'low' } } } : {},
        maxOutputTokens: 16384,
        maxRetries: 0,
        abortSignal: signal,
      });
      return output;
    } catch (failure) {
      if (signal.aborted) throw new AIConnectionError('Gemini took too long or the request was cancelled. Please try again.');
      if (APICallError.isInstance(failure)) {
        if (failure.statusCode === 401 || failure.statusCode === 403 || (failure.statusCode === 400 && /API.?key.*(?:invalid|not valid)|API_KEY_INVALID/i.test(failure.message))) throw new AIConnectionError('Gemini rejected the API key or its permissions. Check the key privately in Google AI Studio.');
        if (failure.statusCode === 402) throw new AIConnectionError('Gemini prepayment credits are depleted. Add credits or resolve project billing in Google AI Studio before retrying.');
        if (failure.statusCode === 429) throw new AIConnectionError('Gemini has reached its API quota or rate limit. Check your Google AI Studio quota and billing before retrying.');
        if (failure.statusCode === 404) throw new AIConnectionError('The configured Gemini model is unavailable. Check MELODYLUST_AI_MODEL in the server environment.');
      }
      throw new AIConnectionError('Gemini could not return valid JSON. No article data was loaded. Please try again.');
    }
  }
  const { createResponsesCall } = await import('./responses.server');
  const apiKey = process.env[provider === 'openai' ? 'OPENAI_API_KEY' : 'LOVABLE_API_KEY'];
  if (!apiKey) return null;
  const { result } = createResponsesCall(new Request(request.url, { signal }), {
    baseURL: provider === 'openai' ? 'https://api.openai.com/v1' : 'https://ai.gateway.lovable.dev/v1',
    apiKey,
    model: process.env['MELODYLUST_AI_MODEL'] || (provider === 'openai' ? 'gpt-5-mini' : 'openai/gpt-5-mini'),
  }, [{ role: 'user', content: JSON.stringify(input) }], instructions);
  return JSON.parse(await result.text) as unknown;
}