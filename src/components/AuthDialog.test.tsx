import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const auth = { updateUser: vi.fn(), resetPasswordForEmail: vi.fn() };
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth } }));
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

describe('password recovery', () => {
  it('opens a reset link straight on choosing a new password', async () => {
    availableGoogleFlow.mockResolvedValue(null);
    auth.updateUser.mockResolvedValue({ error: null });
    const onPasswordUpdated = vi.fn();
    render(<AuthDialog open onOpenChange={() => {}} onSignedIn={async () => {}} initialMode="reset" onPasswordUpdated={onPasswordUpdated} />);
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-new-pass-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Your password is updated.')).toBeInTheDocument();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'a-new-pass-123' });
    expect(onPasswordUpdated).toHaveBeenCalled();
  });

  it('asks Supabase to send the reset link back to the site, with no #fragment for its token to collide with', async () => {
    availableGoogleFlow.mockResolvedValue(null);
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'reader@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery link' }));
    expect(await screen.findByText('Check your email for the recovery link.')).toBeInTheDocument();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('reader@example.com', { redirectTo: `${window.location.origin}/` });
  });
});
