import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {} } }));
vi.mock('@/lib/styling-notes.functions', () => ({
  getStylingNotesWorkspace: vi.fn(), listApprovedStylingNotes: vi.fn(), saveStylingNote: vi.fn(), deleteStylingNote: vi.fn(), reviewStylingNote: vi.fn(),
}));
const availableGoogleFlow = vi.fn();
const signInWithGoogle = vi.fn();
vi.mock('@/lib/google-sign-in', () => ({ availableGoogleFlow: () => availableGoogleFlow(), signInWithGoogle: (flow: string) => signInWithGoogle(flow) }));
const { AuthDialog } = await import('./StylingNotes');

const open = () => render(<AuthDialog open onOpenChange={() => {}} onSignedIn={async () => {}} />);
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Continue with Google', () => {
  it('stays hidden where Google sign-in cannot work, so nobody lands on a 404', async () => {
    availableGoogleFlow.mockResolvedValue(null);
    open();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    await Promise.resolve();
    expect(screen.queryByRole('button', { name: 'Continue with Google' })).toBeNull();
  });

  it('starts the available flow, and shows any error it reports', async () => {
    availableGoogleFlow.mockResolvedValue('supabase');
    signInWithGoogle.mockResolvedValue('Unsupported provider: provider is not enabled');
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
    expect(signInWithGoogle).toHaveBeenCalledWith('supabase');
    expect(await screen.findByText('Unsupported provider: provider is not enabled')).toBeInTheDocument();
  });
});
