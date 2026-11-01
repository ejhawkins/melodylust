import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithOAuth = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signInWithOAuth: (input: unknown) => signInWithOAuth(input) } } }));
const lovableSignIn = vi.fn();
vi.mock('@/integrations/lovable', () => ({ lovable: { auth: { signInWithOAuth: (...args: unknown[]) => lovableSignIn(...args) } } }));

const load = async () => { vi.resetModules(); return import('./google-sign-in'); };

beforeEach(() => {
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('choosing a Google sign-in', () => {
  it('uses Lovable’s broker only on Lovable’s own hosting', async () => {
    const { isLovableHost, googleFlow } = await load();
    expect(isLovableHost('preview--melody-style-muse.lovable.app')).toBe(true);
    expect(isLovableHost('abc.lovableproject.com')).toBe(true);
    expect(isLovableHost('www.melodylust.fashion')).toBe(false);
    expect(isLovableHost('notlovable.app')).toBe(false);
    expect(googleFlow('melody-style-muse.lovable.app', false)).toBe('lovable');
  });

  it('uses Supabase’s provider elsewhere, and offers nothing until it is switched on', async () => {
    const { googleFlow } = await load();
    expect(googleFlow('www.melodylust.fashion', true)).toBe('supabase');
    expect(googleFlow('www.melodylust.fashion', false)).toBeNull();
  });
});

describe('supabaseGoogleEnabled', () => {
  it('reads the public auth settings once', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: { google: true, email: true } }) });
    vi.stubGlobal('fetch', fetchMock);
    const { supabaseGoogleEnabled } = await load();
    expect(await supabaseGoogleEnabled()).toBe(true);
    expect(await supabaseGoogleEnabled()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://example.supabase.co/auth/v1/settings', { headers: { apikey: 'sb_publishable_test' } });
  });

  it('treats a switched-off provider, an error or no network as off', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: { google: false } }) }));
    expect(await (await load()).supabaseGoogleEnabled()).toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    expect(await (await load()).supabaseGoogleEnabled()).toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await (await load()).supabaseGoogleEnabled()).toBe(false);
  });
});

describe('signInWithGoogle', () => {
  it('sends Supabase sign-in back to the page it started on', async () => {
    history.replaceState(null, '', '/profile');
    signInWithOAuth.mockResolvedValue({ error: null });
    const { signInWithGoogle } = await load();
    expect(await signInWithGoogle('supabase')).toBeNull();
    expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/profile`, queryParams: { prompt: 'select_account' } } });
    expect(lovableSignIn).not.toHaveBeenCalled();
  });

  it('reports a Supabase error instead of leaving the page', async () => {
    signInWithOAuth.mockResolvedValue({ error: new Error('Unsupported provider: provider is not enabled') });
    expect(await (await load()).signInWithGoogle('supabase')).toBe('Unsupported provider: provider is not enabled');
  });

  it('keeps Lovable’s broker for its hosting', async () => {
    lovableSignIn.mockResolvedValue({ redirected: true });
    expect(await (await load()).signInWithGoogle('lovable')).toBeNull();
    expect(lovableSignIn).toHaveBeenCalledWith('google', { redirect_uri: window.location.origin, extraParams: { prompt: 'select_account' } });
  });
});
