import { afterEach, describe, expect, it, vi } from 'vitest';

// Each test imports a fresh copy so the module-level client starts empty.
const loadDb = async () => { vi.resetModules(); return import('./db.server'); };

describe('server Supabase connection', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off (null) when Supabase is not configured, so the site uses local files', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await loadDb()).getDb()).toBeNull();
  });

  it('names an invalid URL clearly, without echoing it, and recovers once it is fixed', async () => {
    vi.stubEnv('SUPABASE_URL', 'abcd1234.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test');
    const { getDb, SupabaseConfigError } = await loadDb();
    expect(() => getDb()).toThrow(SupabaseConfigError);
    expect(() => getDb()).toThrow(/restart/);
    expect(() => getDb()).not.toThrow(/abcd1234/);
    vi.stubEnv('SUPABASE_URL', 'https://abcd1234.supabase.co');
    expect(getDb()).not.toBeNull();
  });

  it('accepts the legacy service-role key name', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://abcd1234.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'sb_secret_test');
    expect((await loadDb()).getDb()).not.toBeNull();
  });
});
